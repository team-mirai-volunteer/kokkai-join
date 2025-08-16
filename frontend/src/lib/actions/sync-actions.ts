'use server';

import { prisma } from '@/lib/prisma';
import { kokkaiSyncClient } from '@/lib/api/kokkai-sync-client';
import { revalidatePath } from 'next/cache';
import type { MeetingRecord, SpeechRecord } from '@/lib/types/api';
import {
  normalizeSpeakerName,
  generateDisplayName,
  isSystemSpeaker,
} from '@/lib/utils/speaker-normalizer';

export interface SyncProgress {
  status: 'idle' | 'fetching' | 'processing' | 'completed' | 'failed';
  currentPhase: string;
  processedCount: number;
  totalCount: number;
  message: string;
  error?: string;
}

export async function syncMeetingsByDateRange(
  startDate: string,
  endDate: string,
  options?: {
    nameOfHouse?: string;
    nameOfMeeting?: string;
  }
): Promise<{ success: boolean; message: string; syncHistoryId?: string }> {
  try {
    const from = new Date(startDate);
    const until = new Date(endDate);

    // 同期履歴を作成
    const syncHistory = await prisma.syncHistory.create({
      data: {
        syncType: 'manual',
        startDate: from,
        endDate: until,
        status: 'processing',
      },
    });

    try {
      // 会議録一覧を取得
      const meetings = await kokkaiSyncClient.fetchMeetingsByDateRange(from, until, {
        nameOfHouse: options?.nameOfHouse,
        nameOfMeeting: options?.nameOfMeeting,
      });

      // 詳細データを取得
      const detailedMeetings = await kokkaiSyncClient.fetchAllMeetingDetails(meetings, {
        batchSize: 5,
      });

      // データベースに保存
      let savedMeetings = 0;
      let savedSpeeches = 0;

      for (const meeting of detailedMeetings) {
        await saveMeetingToDatabase(meeting);
        savedMeetings++;
        savedSpeeches += meeting.speechRecord?.length || 0;
      }

      // 同期履歴を更新
      await prisma.syncHistory.update({
        where: { id: syncHistory.id },
        data: {
          status: 'completed',
          totalRecords: meetings.length,
          processedRecords: savedMeetings,
          completedAt: new Date(),
        },
      });

      revalidatePath('/admin/sync');

      return {
        success: true,
        message: `同期完了: ${savedMeetings}件の会議録と${savedSpeeches}件の発言を保存しました`,
        syncHistoryId: syncHistory.id,
      };
    } catch (error) {
      // エラー時は同期履歴を更新
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
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '同期中にエラーが発生しました',
    };
  }
}

async function saveMeetingToDatabase(
  meeting: MeetingRecord & { speechRecord?: SpeechRecord[] }
): Promise<void> {
  try {
    // 既存のレコードを確認
    const existing = await prisma.meeting.findUnique({
      where: { issueID: meeting.issueID },
      include: { speeches: true },
    });

    const meetingData = {
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
    };

    if (existing) {
      // 更新
      await prisma.meeting.update({
        where: { id: existing.id },
        data: meetingData,
      });

      // 既存の発言を削除して再作成
      if (meeting.speechRecord && meeting.speechRecord.length > 0) {
        await prisma.speech.deleteMany({
          where: { meetingId: existing.id },
        });

        await createSpeeches(existing.id, meeting.speechRecord);
      }
    } else {
      // 新規作成
      const created = await prisma.meeting.create({
        data: meetingData,
      });

      // 発言を作成
      if (meeting.speechRecord && meeting.speechRecord.length > 0) {
        await createSpeeches(created.id, meeting.speechRecord);
      }
    }
  } catch (error) {
    throw new Error(
      `Failed to save meeting ${meeting.issueID}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function createSpeeches(meetingId: string, speeches: SpeechRecord[]): Promise<void> {
  // Get meeting date for speaker statistics
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    select: { date: true },
  });

  if (!meeting) {
    throw new Error(`Meeting not found: ${meetingId}`);
  }

  for (const speech of speeches) {
    // Check if this is a system speaker
    if (isSystemSpeaker(speech.speaker)) {
      await prisma.speech.create({
        data: {
          speechID: speech.speechID,
          meetingId: meetingId,
          speechOrder: parseInt(speech.speechOrder, 10),
          rawSpeaker: speech.speaker,
          rawSpeakerYomi: speech.speakerYomi || null,
          rawSpeakerGroup: speech.speakerGroup || null,
          rawSpeakerPosition: speech.speakerPosition || null,
          rawSpeakerRole: speech.speakerRole || null,
          speech: speech.speech || '',
          startPage: speech.startPage ? parseInt(speech.startPage, 10) : null,
          speechURL: speech.speechURL || null,
          speakerId: null, // System speakers are not linked to Speaker table
        },
      });
      continue;
    }

    // Normalize speaker name
    const normalizedName = normalizeSpeakerName(speech.speaker);
    const displayName = generateDisplayName(speech.speaker, normalizedName);

    // Find or create Speaker
    let speaker = await prisma.speaker.findFirst({
      where: {
        normalizedName: normalizedName,
        nameYomi: speech.speakerYomi || null,
      },
    });

    if (!speaker) {
      // Create new Speaker
      speaker = await prisma.speaker.create({
        data: {
          normalizedName: normalizedName,
          displayName: displayName,
          nameYomi: speech.speakerYomi || null,
          firstSpeechDate: meeting.date,
          lastSpeechDate: meeting.date,
        },
      });

      // Register original notation as alias if different
      if (speech.speaker !== normalizedName) {
        await prisma.speakerAlias
          .create({
            data: {
              speakerId: speaker.id,
              aliasName: speech.speaker,
              aliasYomi: speech.speakerYomi || null,
            },
          })
          .catch(() => {
            // Ignore if already exists
          });
      }
    } else {
      // Update existing Speaker statistics
      await prisma.speaker.update({
        where: { id: speaker.id },
        data: {
          lastSpeechDate: meeting.date,
          firstSpeechDate:
            speaker.firstSpeechDate && speaker.firstSpeechDate > meeting.date
              ? meeting.date
              : speaker.firstSpeechDate,
        },
      });

      // Register new alias if exists
      if (speech.speaker !== normalizedName) {
        await prisma.speakerAlias
          .create({
            data: {
              speakerId: speaker.id,
              aliasName: speech.speaker,
              aliasYomi: speech.speakerYomi || null,
            },
          })
          .catch(() => {
            // Ignore if already exists
          });
      }
    }

    // Create Speech
    await prisma.speech.create({
      data: {
        speechID: speech.speechID,
        meetingId: meetingId,
        speakerId: speaker.id,
        speechOrder: parseInt(speech.speechOrder, 10),
        rawSpeaker: speech.speaker,
        rawSpeakerYomi: speech.speakerYomi || null,
        rawSpeakerGroup: speech.speakerGroup || null,
        rawSpeakerPosition: speech.speakerPosition || null,
        rawSpeakerRole: speech.speakerRole || null,
        speech: speech.speech || '',
        startPage: speech.startPage ? parseInt(speech.startPage, 10) : null,
        speechURL: speech.speechURL || null,
      },
    });
  }
}

export async function syncLast10Years(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 10);

    // 1年ごとに分割して同期
    const results = [];

    for (let year = 0; year < 10; year++) {
      const yearStart = new Date(startDate);
      yearStart.setFullYear(startDate.getFullYear() + year);

      const yearEnd = new Date(yearStart);
      yearEnd.setFullYear(yearStart.getFullYear() + 1);

      if (yearEnd > endDate) {
        yearEnd.setTime(endDate.getTime());
      }

      const result = await syncMeetingsByDateRange(
        yearStart.toISOString().split('T')[0],
        yearEnd.toISOString().split('T')[0]
      );

      results.push(result);

      if (!result.success) {
        return {
          success: false,
          message: `${yearStart.getFullYear()}年の同期で失敗しました: ${result.message}`,
        };
      }
    }

    return {
      success: true,
      message: '過去10年分のデータ同期が完了しました',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '同期中にエラーが発生しました',
    };
  }
}

export async function getSyncHistory(limit: number = 10) {
  return prisma.syncHistory.findMany({
    orderBy: { startedAt: 'desc' },
    take: limit,
  });
}

export async function getMeetingStats() {
  const [totalMeetings, totalSpeeches, totalSpeakers, oldestMeeting, newestMeeting] =
    await Promise.all([
      prisma.meeting.count(),
      prisma.speech.count(),
      prisma.speaker.count(),
      prisma.meeting.findFirst({
        orderBy: { date: 'asc' },
        select: { date: true },
      }),
      prisma.meeting.findFirst({
        orderBy: { date: 'desc' },
        select: { date: true },
      }),
    ]);

  return {
    totalMeetings,
    totalSpeeches,
    totalSpeakers,
    dateRange: {
      oldest: oldestMeeting?.date,
      newest: newestMeeting?.date,
    },
  };
}
