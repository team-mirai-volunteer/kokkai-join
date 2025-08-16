#!/usr/bin/env bun
import { prisma } from '../src/lib/prisma';
import type { MeetingRecord, SpeechRecord } from '../src/lib/types/api';
import {
  normalizeSpeakerName,
  generateDisplayName,
  isSystemSpeaker,
} from '../src/lib/utils/speaker-normalizer';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import * as readline from 'readline';

// キャッシュディレクトリ
const CACHE_DIR = path.join(process.cwd(), '.cache', 'kokkai');

// 環境判定
const isProduction = process.env.DATABASE_URL?.includes('35.187.217.10') || false;

// 同期設定
const CONFIG = {
  BATCH_SIZE: 10, // 並列で詳細取得する会議録数
  MAX_CONCURRENT_SAVE: 5, // 並列でDBに保存する会議録数
  API_DELAY_MS: isProduction ? 500 : 100, // API呼び出し間のディレイ（ミリ秒）
  RETRY_COUNT: 3, // リトライ回数
  RETRY_DELAY_MS: 2000, // リトライ前の待機時間
  CACHE_EXPIRES_DAYS: 7, // キャッシュ有効期限（日）
};

// キャッシュヘルパー
class CacheManager {
  private cacheDir: string;

  constructor(cacheDir: string) {
    this.cacheDir = cacheDir;
  }

  async init() {
    await fs.mkdir(this.cacheDir, { recursive: true });
  }

  private getCacheKey(type: string, params: unknown): string {
    const hash = crypto.createHash('md5').update(JSON.stringify(params)).digest('hex');
    return `${type}_${hash}.json`;
  }

  async get<T>(type: string, params: unknown): Promise<T | null> {
    try {
      const key = this.getCacheKey(type, params);
      const filePath = path.join(this.cacheDir, key);

      const stats = await fs.stat(filePath);
      const expiresAt = new Date(
        stats.mtime.getTime() + CONFIG.CACHE_EXPIRES_DAYS * 24 * 60 * 60 * 1000
      );

      if (new Date() > expiresAt) {
        await fs.unlink(filePath);
        return null;
      }

      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async set<T>(type: string, params: unknown, data: T): Promise<void> {
    const key = this.getCacheKey(type, params);
    const filePath = path.join(this.cacheDir, key);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  async clear(): Promise<void> {
    try {
      const files = await fs.readdir(this.cacheDir);
      await Promise.all(files.map((file) => fs.unlink(path.join(this.cacheDir, file))));
    } catch {
      // ディレクトリが存在しない場合は無視
    }
  }
}

// API レスポンスの型定義
interface SyncApiResponse {
  numberOfRecords: number;
  numberOfReturn: number;
  startRecord: number;
  nextRecordPosition?: number;
  meetingRecord?: MeetingRecord[];
}

interface DetailedMeetingResponse {
  numberOfRecords: number;
  meetingRecord?: Array<MeetingRecord & { speechRecord?: SpeechRecord[] }>;
}

// 改善されたAPI クライアント
class ImprovedKokkaiClient {
  private readonly baseURL = 'https://kokkai.ndl.go.jp/api';
  private cache: CacheManager;

  constructor(cache: CacheManager) {
    this.cache = cache;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async fetchWithRetry<T>(url: string, retries = CONFIG.RETRY_COUNT): Promise<T> {
    for (let i = 0; i <= retries; i++) {
      try {
        const response = await fetch(url, { cache: 'no-store' });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        return await response.json();
      } catch (error) {
        if (i === retries) throw error;

        console.log(`  ⚠️ リトライ ${i + 1}/${retries}: ${url}`);
        await this.sleep(CONFIG.RETRY_DELAY_MS);
      }
    }
    throw new Error('Max retries exceeded');
  }

  async fetchMeetingsByDateRange(
    from: Date,
    until: Date,
    options?: {
      nameOfHouse?: string;
      nameOfMeeting?: string;
      useCache?: boolean;
    }
  ): Promise<MeetingRecord[]> {
    const cacheKey = { from: from.toISOString(), until: until.toISOString(), ...options };

    // キャッシュチェック
    if (options?.useCache !== false) {
      const cached = await this.cache.get<MeetingRecord[]>('meetings', cacheKey);
      if (cached) {
        console.log('  📦 キャッシュから取得');
        return cached;
      }
    }

    const meetings: MeetingRecord[] = [];
    let startRecord = 1;
    let hasMore = true;

    const params = new URLSearchParams({
      from: from.toISOString().split('T')[0],
      until: until.toISOString().split('T')[0],
      maximumRecords: '100',
      recordPacking: 'json',
    });

    if (options?.nameOfHouse) params.append('nameOfHouse', options.nameOfHouse);
    if (options?.nameOfMeeting) params.append('nameOfMeeting', options.nameOfMeeting);

    while (hasMore) {
      params.set('startRecord', startRecord.toString());
      const url = `${this.baseURL}/meeting_list?${params.toString()}`;

      const data = await this.fetchWithRetry<SyncApiResponse>(url);

      if (data.meetingRecord && data.meetingRecord.length > 0) {
        meetings.push(...data.meetingRecord);
      }

      process.stdout.write(`\r  取得中: ${meetings.length}/${data.numberOfRecords} 件`);

      if (data.nextRecordPosition) {
        startRecord = data.nextRecordPosition;
        await this.sleep(CONFIG.API_DELAY_MS);
      } else {
        hasMore = false;
      }
    }

    // キャッシュに保存
    await this.cache.set('meetings', cacheKey, meetings);

    return meetings;
  }

  async fetchMeetingDetailBatch(
    meetings: MeetingRecord[],
    onProgress?: (current: number, total: number) => void
  ): Promise<(MeetingRecord & { speechRecord?: SpeechRecord[] })[]> {
    const detailedMeetings: (MeetingRecord & { speechRecord?: SpeechRecord[] })[] = [];

    // バッチ処理
    for (let i = 0; i < meetings.length; i += CONFIG.BATCH_SIZE) {
      const batch = meetings.slice(i, Math.min(i + CONFIG.BATCH_SIZE, meetings.length));
      let apiCallCount = 0; // このバッチでAPIを呼んだ回数

      // 並列で詳細を取得
      const promises = batch.map(async (meeting) => {
        // キャッシュチェック
        const cached = await this.cache.get<MeetingRecord & { speechRecord?: SpeechRecord[] }>(
          'meeting_detail',
          { issueID: meeting.issueID }
        );

        if (cached) {
          return cached;
        }

        // APIから取得（キャッシュになかった場合）
        apiCallCount++;
        const url = `${this.baseURL}/meeting?issueID=${encodeURIComponent(meeting.issueID)}&recordPacking=json`;
        const data = await this.fetchWithRetry<DetailedMeetingResponse>(url);

        if (data.meetingRecord && data.meetingRecord[0]) {
          const detailed = data.meetingRecord[0];
          // キャッシュに保存
          await this.cache.set('meeting_detail', { issueID: meeting.issueID }, detailed);
          return detailed;
        }

        return meeting;
      });

      const batchResults = await Promise.all(promises);
      detailedMeetings.push(...batchResults);

      if (onProgress) {
        onProgress(detailedMeetings.length, meetings.length);
      }

      // APIレート制限を考慮（実際にAPIを呼んだ場合のみ）
      if (i + CONFIG.BATCH_SIZE < meetings.length && apiCallCount > 0) {
        await this.sleep(CONFIG.API_DELAY_MS * 2);
      }
    }

    return detailedMeetings;
  }
}

// Speaker管理の改善（同姓同名は同一人物として扱う）
class SpeakerManager {
  private speakerCache = new Map<string, { id: string }>();
  private pendingCreations = new Map<string, Promise<{ id: string }>>();

  // マスターデータのキャッシュ
  private partyGroupCache = new Map<string, string>(); // name -> id
  private positionCache = new Map<string, string>(); // name -> id
  private roleCache = new Map<string, string>(); // name -> id

  // 同姓同名は同一人物なので、nameのみをキーとする
  private getCacheKey(name: string): string {
    return name;
  }

  // 会派マスターの取得または作成
  private async findOrCreatePartyGroup(groupName: string | null): Promise<string | null> {
    if (!groupName) return null;

    if (this.partyGroupCache.has(groupName)) {
      return this.partyGroupCache.get(groupName)!;
    }

    let group = await prisma.partyGroup.findUnique({ where: { name: groupName } });
    if (!group) {
      try {
        group = await prisma.partyGroup.create({
          data: { name: groupName },
        });
      } catch (error) {
        // 競合した場合は再度検索
        group = await prisma.partyGroup.findUnique({ where: { name: groupName } });
        if (!group) throw error;
      }
    }

    this.partyGroupCache.set(groupName, group.id);
    return group.id;
  }

  // 役職マスターの取得または作成
  async findOrCreatePosition(positionName: string | null | undefined): Promise<string | null> {
    if (!positionName) return null;

    // キャッシュチェック
    if (this.positionCache.has(positionName)) {
      return this.positionCache.get(positionName)!;
    }

    // 既に作成中の場合は待機
    if (this.pendingPositions.has(positionName)) {
      return await this.pendingPositions.get(positionName)!;
    }

    // 作成処理を開始
    const creationPromise = this.doCreatePosition(positionName);
    this.pendingPositions.set(positionName, creationPromise);

    try {
      const result = await creationPromise;
      if (result) {
        this.positionCache.set(positionName, result);
      }
      return result;
    } finally {
      this.pendingPositions.delete(positionName);
    }
  }

  private async doCreatePosition(positionName: string): Promise<string | null> {
    let position = await prisma.position.findUnique({ where: { name: positionName } });
    if (!position) {
      // カテゴリを推定
      let category = null;
      if (positionName.includes('大臣')) category = '大臣';
      else if (positionName.includes('委員長')) category = '委員長';
      else if (positionName.includes('理事')) category = '理事';
      else if (positionName.includes('議長')) category = '議長';

      try {
        position = await prisma.position.create({
          data: { name: positionName, category },
        });
      } catch (error) {
        // 競合した場合は再度検索
        position = await prisma.position.findUnique({ where: { name: positionName } });
        if (!position) throw error;
      }
    }

    return position.id;
  }

  // 役割マスターの取得または作成
  async findOrCreateRole(roleName: string | null | undefined): Promise<string | null> {
    if (!roleName) return null;

    // キャッシュチェック
    if (this.roleCache.has(roleName)) {
      return this.roleCache.get(roleName)!;
    }

    // 既に作成中の場合は待機
    if (this.pendingRoles.has(roleName)) {
      return await this.pendingRoles.get(roleName)!;
    }

    // 作成処理を開始
    const creationPromise = this.doCreateRole(roleName);
    this.pendingRoles.set(roleName, creationPromise);

    try {
      const result = await creationPromise;
      if (result) {
        this.roleCache.set(roleName, result);
      }
      return result;
    } finally {
      this.pendingRoles.delete(roleName);
    }
  }

  private async doCreateRole(roleName: string): Promise<string | null> {
    let role = await prisma.speakerRole.findUnique({ where: { name: roleName } });
    if (!role) {
      try {
        role = await prisma.speakerRole.create({
          data: { name: roleName },
        });
      } catch (error) {
        // 競合した場合は再度検索
        role = await prisma.speakerRole.findUnique({ where: { name: roleName } });
        if (!role) throw error;
      }
    }

    return role.id;
  }

  async findOrCreateSpeaker(
    speech: SpeechRecord,
    meetingDate: Date
  ): Promise<{ speakerId: string | null; affiliationId: string | null }> {
    if (isSystemSpeaker(speech.speaker)) {
      return { speakerId: null, affiliationId: null };
    }

    const normalizedName = normalizeSpeakerName(speech.speaker);
    const displayName = generateDisplayName(speech.speaker, normalizedName);
    const cacheKey = this.getCacheKey(normalizedName); // 同姓同名は同一人物

    // メモリキャッシュチェック
    let speaker: { id: string } | undefined;
    if (this.speakerCache.has(cacheKey)) {
      speaker = this.speakerCache.get(cacheKey);
    } else if (this.pendingCreations.has(cacheKey)) {
      // 作成中の場合は待機
      speaker = await this.pendingCreations.get(cacheKey)!;
    } else {
      // 作成処理を開始
      const creationPromise = this.createOrFindSpeaker(
        normalizedName,
        displayName,
        speech,
        meetingDate
      );
      this.pendingCreations.set(cacheKey, creationPromise);

      try {
        speaker = await creationPromise;
        // キャッシュに保存
        this.speakerCache.set(cacheKey, speaker);
      } finally {
        // 作成完了後はpendingから削除
        this.pendingCreations.delete(cacheKey);
      }
    }

    if (!speaker) {
      return { speakerId: null, affiliationId: null };
    }

    // 所属情報の作成または取得
    const affiliationId = await this.findOrCreateAffiliation(speaker.id, speech, meetingDate);

    return { speakerId: speaker.id, affiliationId };
  }

  private async createOrFindSpeaker(
    normalizedName: string,
    displayName: string,
    speech: SpeechRecord,
    meetingDate: Date
  ): Promise<{ id: string }> {
    // 同姓同名は同一人物として扱うため、normalizedNameのみで検索
    let speaker = await prisma.speaker.findUnique({
      where: { normalizedName },
    });

    if (!speaker) {
      try {
        speaker = await prisma.speaker.create({
          data: {
            normalizedName,
            displayName,
            nameYomi: speech.speakerYomi || null,
            firstSpeechDate: meetingDate,
            lastSpeechDate: meetingDate,
          },
        });
      } catch (error) {
        // 競合した場合は再度検索
        speaker = await prisma.speaker.findUnique({
          where: { normalizedName },
        });
        if (!speaker) throw error;
      }
    } else {
      // 既存の場合は発言日を更新
      const updateData: {
        firstSpeechDate?: Date;
        lastSpeechDate?: Date;
      } = {};

      // より古い発言の場合は初回発言日を更新
      if (!speaker.firstSpeechDate || meetingDate < speaker.firstSpeechDate) {
        updateData.firstSpeechDate = meetingDate;
      }

      // より新しい発言の場合は最終発言日を更新
      if (!speaker.lastSpeechDate || meetingDate > speaker.lastSpeechDate) {
        updateData.lastSpeechDate = meetingDate;
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.speaker.update({
          where: { id: speaker.id },
          data: updateData,
        });
      }
    }

    // 別名登録
    if (speech.speaker !== normalizedName) {
      try {
        await prisma.speakerAlias.create({
          data: {
            speakerId: speaker.id,
            aliasName: speech.speaker,
            aliasYomi: speech.speakerYomi || null,
          },
        });
      } catch {
        // 既に存在する場合は無視
      }
    }

    return speaker;
  }

  // 所属情報のキャッシュ（speakerId-partyGroupId をキーとする）
  private affiliationCache = new Map<string, string>();
  private pendingAffiliations = new Map<string, Promise<string | null>>();
  private pendingPositions = new Map<string, Promise<string | null>>();
  private pendingRoles = new Map<string, Promise<string | null>>();

  // 所属情報の取得または作成
  private async findOrCreateAffiliation(
    speakerId: string,
    speech: SpeechRecord,
    meetingDate: Date
  ): Promise<string | null> {
    // 会派を取得または作成
    const partyGroupId = await this.findOrCreatePartyGroup(speech.speakerGroup || null);

    // nullの場合は所属情報なし
    if (!partyGroupId) {
      return null;
    }

    // キャッシュキー
    const cacheKey = `${speakerId}-${partyGroupId}`;

    // メモリキャッシュチェック
    if (this.affiliationCache.has(cacheKey)) {
      return this.affiliationCache.get(cacheKey)!;
    }

    // 既に作成中の場合は待機
    if (this.pendingAffiliations.has(cacheKey)) {
      return await this.pendingAffiliations.get(cacheKey)!;
    }

    // 作成処理を開始
    const creationPromise = this.doCreateAffiliation(speakerId, partyGroupId, meetingDate);
    this.pendingAffiliations.set(cacheKey, creationPromise);

    try {
      const result = await creationPromise;
      if (result) {
        this.affiliationCache.set(cacheKey, result);
      }
      return result;
    } finally {
      this.pendingAffiliations.delete(cacheKey);
    }
  }

  private async doCreateAffiliation(
    speakerId: string,
    partyGroupId: string,
    meetingDate: Date
  ): Promise<string | null> {
    // 既存の所属情報を検索（同じ会派で有効期間内のもの）
    const existingAffiliation = await prisma.speakerAffiliation.findFirst({
      where: {
        speakerId,
        partyGroupId,
        OR: [
          { endDate: null }, // 現在も継続中
          {
            AND: [{ startDate: { lte: meetingDate } }, { endDate: { gte: meetingDate } }],
          }, // 発言日が期間内
        ],
      },
      orderBy: { startDate: 'desc' },
    });

    if (existingAffiliation) {
      // より古い日時の場合は開始日を更新
      if (meetingDate < existingAffiliation.startDate) {
        await prisma.speakerAffiliation.update({
          where: { id: existingAffiliation.id },
          data: { startDate: meetingDate },
        });
      }
      return existingAffiliation.id;
    }

    // 最新の所属情報を確認（会派が変わった場合）
    const latestAffiliation = await prisma.speakerAffiliation.findFirst({
      where: {
        speakerId,
        endDate: null, // 現在有効なもの
      },
      orderBy: { startDate: 'desc' },
    });

    // 別の会派に所属している場合は、その所属を終了させる
    if (latestAffiliation && latestAffiliation.partyGroupId !== partyGroupId) {
      await prisma.speakerAffiliation.update({
        where: { id: latestAffiliation.id },
        data: { endDate: meetingDate },
      });
    }

    // 新規作成または再所属
    const affiliation = await prisma.speakerAffiliation.create({
      data: {
        speakerId,
        partyGroupId,
        startDate: meetingDate,
      },
    });

    return affiliation.id;
  }
}

// 並列保存処理
async function saveMeetingsBatch(
  meetings: (MeetingRecord & { speechRecord?: SpeechRecord[] })[],
  speakerManager: SpeakerManager
): Promise<{ savedMeetings: number; savedSpeeches: number }> {
  let savedMeetings = 0;
  let savedSpeeches = 0;

  // バッチ処理で保存
  for (let i = 0; i < meetings.length; i += CONFIG.MAX_CONCURRENT_SAVE) {
    const batch = meetings.slice(i, Math.min(i + CONFIG.MAX_CONCURRENT_SAVE, meetings.length));

    const results = await Promise.all(
      batch.map(async (meeting) => {
        try {
          // トランザクションで保存
          const result = await prisma.$transaction(async (tx) => {
            // 既存チェック
            const existing = await tx.meeting.findUnique({
              where: { issueID: meeting.issueID },
            });

            if (existing) {
              // 既存の場合は発言を削除して再作成
              await tx.speech.deleteMany({
                where: { meetingId: existing.id },
              });

              // 会議録更新
              await tx.meeting.update({
                where: { id: existing.id },
                data: {
                  lastSyncedAt: new Date(),
                },
              });

              // 発言を保存
              if (meeting.speechRecord && meeting.speechRecord.length > 0) {
                const speeches = await Promise.all(
                  meeting.speechRecord.map(async (speech) => {
                    const { speakerId, affiliationId } = await speakerManager.findOrCreateSpeaker(
                      speech,
                      new Date(meeting.date)
                    );

                    // 役職と役割のIDを取得
                    const positionId = await speakerManager.findOrCreatePosition(
                      speech.speakerPosition
                    );
                    const roleId = await speakerManager.findOrCreateRole(speech.speakerRole);

                    return {
                      speechID: speech.speechID,
                      meetingId: existing.id,
                      speakerId,
                      affiliationId,
                      positionId,
                      roleId,
                      speechOrder: parseInt(speech.speechOrder, 10),
                      rawSpeaker: speech.speaker,
                      rawSpeakerYomi: speech.speakerYomi || null,
                      rawSpeakerGroup: speech.speakerGroup || null,
                      rawSpeakerPosition: speech.speakerPosition || null,
                      rawSpeakerRole: speech.speakerRole || null,
                      speech: speech.speech || '',
                      startPage: speech.startPage ? parseInt(speech.startPage, 10) : null,
                      speechURL: speech.speechURL || null,
                    };
                  })
                );

                await tx.speech.createMany({
                  data: speeches,
                });

                return { meetings: 1, speeches: speeches.length };
              }

              return { meetings: 1, speeches: 0 };
            } else {
              // 新規作成
              const created = await tx.meeting.create({
                data: {
                  issueID: meeting.issueID,
                  imageKind: meeting.imageKind || null,
                  searchObject: meeting.searchObject ? parseInt(meeting.searchObject, 10) : null,
                  session: parseInt(meeting.session, 10),
                  nameOfHouse: meeting.nameOfHouse,
                  nameOfMeeting: meeting.nameOfMeeting,
                  issue: meeting.issue || null,
                  date: new Date(meeting.date),
                  closing: meeting.closing || null,
                  meetingURL: meeting.meetingURL || null,
                  pdfURL: meeting.pdfURL || null,
                  lastSyncedAt: new Date(),
                },
              });

              // 発言を保存
              if (meeting.speechRecord && meeting.speechRecord.length > 0) {
                const speeches = await Promise.all(
                  meeting.speechRecord.map(async (speech) => {
                    const { speakerId, affiliationId } = await speakerManager.findOrCreateSpeaker(
                      speech,
                      new Date(meeting.date)
                    );

                    // 役職と役割のIDを取得
                    const positionId = await speakerManager.findOrCreatePosition(
                      speech.speakerPosition
                    );
                    const roleId = await speakerManager.findOrCreateRole(speech.speakerRole);

                    return {
                      speechID: speech.speechID,
                      meetingId: created.id,
                      speakerId,
                      affiliationId,
                      positionId,
                      roleId,
                      speechOrder: parseInt(speech.speechOrder, 10),
                      rawSpeaker: speech.speaker,
                      rawSpeakerYomi: speech.speakerYomi || null,
                      rawSpeakerGroup: speech.speakerGroup || null,
                      rawSpeakerPosition: speech.speakerPosition || null,
                      rawSpeakerRole: speech.speakerRole || null,
                      speech: speech.speech || '',
                      startPage: speech.startPage ? parseInt(speech.startPage, 10) : null,
                      speechURL: speech.speechURL || null,
                    };
                  })
                );

                await tx.speech.createMany({
                  data: speeches,
                });

                return { meetings: 1, speeches: speeches.length };
              }

              return { meetings: 1, speeches: 0 };
            }
          });

          return result;
        } catch (error) {
          console.error(`\n  ❌ 保存エラー (${meeting.issueID}):`, error);
          return { meetings: 0, speeches: 0 };
        }
      })
    );

    results.forEach((result) => {
      savedMeetings += result.meetings;
      savedSpeeches += result.speeches;
    });

    process.stdout.write(
      `\r  💾 保存中: ${savedMeetings}/${meetings.length} 会議録, ${savedSpeeches} 発言`
    );
  }

  return { savedMeetings, savedSpeeches };
}

// メイン同期関数
async function syncDateRange(options: {
  startDate: string;
  endDate: string;
  nameOfHouse?: string;
  nameOfMeeting?: string;
  useCache?: boolean;
}) {
  const from = new Date(options.startDate);
  const until = new Date(options.endDate);
  const cache = new CacheManager(CACHE_DIR);
  await cache.init();

  const client = new ImprovedKokkaiClient(cache);
  const speakerManager = new SpeakerManager();

  // 同期履歴作成
  const syncHistory = await prisma.syncHistory.create({
    data: {
      syncType: 'script',
      startDate: from,
      endDate: until,
      status: 'processing',
    },
  });

  try {
    console.log('\n🔍 会議録を検索中...');
    const meetings = await client.fetchMeetingsByDateRange(from, until, {
      nameOfHouse: options.nameOfHouse,
      nameOfMeeting: options.nameOfMeeting,
      useCache: options.useCache,
    });
    console.log(`\n  ✓ ${meetings.length} 件の会議録を発見`);

    console.log('\n📥 詳細データを取得中...');
    const detailedMeetings = await client.fetchMeetingDetailBatch(meetings, (current, total) => {
      const percentage = Math.round((current / total) * 100);
      const bar = '█'.repeat(Math.floor(percentage / 2));
      const empty = '░'.repeat(50 - Math.floor(percentage / 2));
      process.stdout.write(`\r  [${bar}${empty}] ${percentage}% (${current}/${total})`);
    });
    console.log(`\n  ✓ ${detailedMeetings.length} 件の詳細を取得`);

    console.log('\n💾 データベースに保存中...');
    const { savedMeetings, savedSpeeches } = await saveMeetingsBatch(
      detailedMeetings,
      speakerManager
    );

    await prisma.syncHistory.update({
      where: { id: syncHistory.id },
      data: {
        status: 'completed',
        totalRecords: meetings.length,
        processedRecords: savedMeetings,
        completedAt: new Date(),
      },
    });

    console.log('\n\n' + '═'.repeat(60));
    console.log('✅ 同期完了!');
    console.log(`  📊 保存された会議録: ${savedMeetings} 件`);
    console.log(`  💬 保存された発言: ${savedSpeeches} 件`);
    console.log('═'.repeat(60));
  } catch (error) {
    await prisma.syncHistory.update({
      where: { id: syncHistory.id },
      data: {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : '不明なエラー',
        completedAt: new Date(),
      },
    });

    throw error;
  }
}

// DBリセット機能
async function resetDatabase() {
  console.log('\n⚠️ データベースをリセットします');
  console.log('  すべてのデータが削除されます。よろしいですか？ (y/n): ');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise<boolean>((resolve) => {
    rl.question('', async (answer: string) => {
      rl.close();
      if (answer.toLowerCase() === 'y') {
        console.log('\n🗑️ データベースをリセット中...');

        await prisma.$transaction([
          prisma.speech.deleteMany(),
          prisma.speakerAlias.deleteMany(),
          prisma.speaker.deleteMany(),
          prisma.meeting.deleteMany(),
          prisma.syncHistory.deleteMany(),
          prisma.searchCache.deleteMany(),
        ]);

        console.log('  ✓ データベースをリセットしました');
        resolve(true);
      } else {
        console.log('  キャンセルされました');
        resolve(false);
      }
    });
  });
}

// 統計表示
async function showStats() {
  const [totalMeetings, totalSpeeches, totalSpeakers, oldestMeeting, newestMeeting] =
    await Promise.all([
      prisma.meeting.count(),
      prisma.speech.count(),
      prisma.speaker.count(),
      prisma.meeting.findFirst({
        orderBy: { date: 'asc' },
        select: { date: true, nameOfMeeting: true },
      }),
      prisma.meeting.findFirst({
        orderBy: { date: 'desc' },
        select: { date: true, nameOfMeeting: true },
      }),
    ]);

  console.log('\n📊 データベース統計');
  console.log('━'.repeat(60));
  console.log(`  会議録: ${totalMeetings.toLocaleString()} 件`);
  console.log(`  発言: ${totalSpeeches.toLocaleString()} 件`);
  console.log(`  発言者: ${totalSpeakers.toLocaleString()} 人`);

  if (oldestMeeting && newestMeeting) {
    console.log(
      `  期間: ${oldestMeeting.date.toISOString().split('T')[0]} 〜 ${
        newestMeeting.date.toISOString().split('T')[0]
      }`
    );
  }
}

// メイン処理
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('\n🏛️ 国会会議録同期ツール（改善版）');
  console.log('━'.repeat(60));

  try {
    switch (command) {
      case 'reset-and-sync-year':
        const reset = await resetDatabase();
        if (!reset) {
          await prisma.$disconnect();
          return;
        }

        console.log('\n🚀 過去1年分のデータ同期を開始します');
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);

        await syncDateRange({
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          useCache: true,
        });

        await showStats();
        break;

      case 'reset-and-sync-10years':
        const reset10 = await resetDatabase();
        if (!reset10) {
          await prisma.$disconnect();
          return;
        }

        console.log('\n🚀 過去10年分のデータ同期を開始します');
        const endDate10 = new Date();
        const startDate10 = new Date();
        startDate10.setFullYear(startDate10.getFullYear() - 10);

        await syncDateRange({
          startDate: startDate10.toISOString().split('T')[0],
          endDate: endDate10.toISOString().split('T')[0],
          useCache: true,
        });

        await showStats();
        break;

      case 'sync':
        const start = args[1];
        const end = args[2];

        if (!start || !end) {
          console.error('使用方法: bun run script sync <開始日> <終了日>');
          console.error('例: bun run script sync 2024-01-01 2024-12-31');
          process.exit(1);
        }

        await syncDateRange({
          startDate: start,
          endDate: end,
          nameOfHouse: args[3],
          nameOfMeeting: args[4],
          useCache: args.includes('--use-cache'),
        });

        await showStats();
        break;

      case 'clear-cache':
        const cache = new CacheManager(CACHE_DIR);
        await cache.init();
        await cache.clear();
        console.log('✓ キャッシュをクリアしました');
        break;

      case 'stats':
        await showStats();
        break;

      default:
        console.log('使用方法:');
        console.log('  bun run script reset-and-sync-year    # DBリセット & 1年分同期');
        console.log('  bun run script reset-and-sync-10years # DBリセット & 10年分同期');
        console.log('  bun run script sync <開始日> <終了日> [院] [会議名] [--use-cache]');
        console.log('  bun run script clear-cache             # キャッシュクリア');
        console.log('  bun run script stats                   # 統計表示');
        break;
    }
  } catch (error) {
    console.error('\n❌ エラー:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
