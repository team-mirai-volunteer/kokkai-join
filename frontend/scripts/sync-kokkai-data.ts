#!/usr/bin/env node
import { PrismaClient } from '@prisma/client'
import { kokkaiSyncClient } from '../src/lib/api/kokkai-sync-client'
import type { MeetingRecord, SpeechRecord } from '../src/lib/types/api'
import {
  normalizeSpeakerName,
  generateDisplayName,
  generateSpeakerKey,
  isSystemSpeaker,
} from '../src/lib/utils/speaker-normalizer'

const prisma = new PrismaClient()

interface SyncOptions {
  startDate: string
  endDate: string
  nameOfHouse?: string
  nameOfMeeting?: string
  batchSize?: number
}

async function saveMeetingToDatabase(
  meeting: MeetingRecord & { speechRecord?: SpeechRecord[] }
): Promise<void> {
  try {
    const existing = await prisma.meeting.findUnique({
      where: { issueID: meeting.issueID },
      include: { speeches: true },
    })

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
    }

    if (existing) {
      await prisma.meeting.update({
        where: { id: existing.id },
        data: meetingData,
      })

      if (meeting.speechRecord && meeting.speechRecord.length > 0) {
        await prisma.speech.deleteMany({
          where: { meetingId: existing.id },
        })

        await createSpeeches(existing.id, meeting.speechRecord, new Date(meeting.date))
      }
      console.log(`✓ 更新: ${meeting.nameOfMeeting} (${meeting.date})`)
    } else {
      const created = await prisma.meeting.create({
        data: meetingData,
      })

      if (meeting.speechRecord && meeting.speechRecord.length > 0) {
        await createSpeeches(created.id, meeting.speechRecord, new Date(meeting.date))
      }
      console.log(`✓ 新規: ${meeting.nameOfMeeting} (${meeting.date})`)
    }
  } catch (error) {
    console.error(`✗ エラー: ${meeting.issueID}:`, error)
    throw error
  }
}

async function createSpeeches(
  meetingId: string,
  speeches: SpeechRecord[],
  meetingDate: Date
): Promise<void> {
  for (const speech of speeches) {
    // システム発言者はスキップ
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
          speakerId: null, // システム発言者は紐付けない
        },
      })
      continue
    }

    // 発言者の正規化
    const normalizedName = normalizeSpeakerName(speech.speaker)
    const displayName = generateDisplayName(speech.speaker, normalizedName)

    // 既存のSpeakerを検索または作成
    let speaker = await prisma.speaker.findFirst({
      where: {
        normalizedName: normalizedName,
        nameYomi: speech.speakerYomi || null,
      },
    })

    if (!speaker) {
      // 新規Speaker作成
      speaker = await prisma.speaker.create({
        data: {
          normalizedName: normalizedName,
          displayName: displayName,
          nameYomi: speech.speakerYomi || null,
          speechCount: 1,
          firstSpeechDate: meetingDate,
          lastSpeechDate: meetingDate,
        },
      })

      // 別名として元の表記を登録
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
            // 既に存在する場合は無視
          })
      }
    } else {
      // 既存Speakerの統計更新
      await prisma.speaker.update({
        where: { id: speaker.id },
        data: {
          speechCount: { increment: 1 },
          lastSpeechDate: meetingDate,
          firstSpeechDate:
            speaker.firstSpeechDate && speaker.firstSpeechDate > meetingDate
              ? meetingDate
              : speaker.firstSpeechDate,
        },
      })

      // 新しい別名があれば登録
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
            // 既に存在する場合は無視
          })
      }
    }

    // Speech作成
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
    })
  }
}

async function syncDateRange(options: SyncOptions) {
  const from = new Date(options.startDate)
  const until = new Date(options.endDate)

  console.log(`\n📅 同期期間: ${options.startDate} 〜 ${options.endDate}`)
  if (options.nameOfHouse) console.log(`🏛️ 院: ${options.nameOfHouse}`)
  if (options.nameOfMeeting) console.log(`📋 会議: ${options.nameOfMeeting}`)
  console.log('━'.repeat(60))

  const syncHistory = await prisma.syncHistory.create({
    data: {
      syncType: 'script',
      startDate: from,
      endDate: until,
      status: 'processing',
    },
  })

  try {
    console.log('\n🔍 会議録を検索中...')
    const meetings = await kokkaiSyncClient.fetchMeetingsByDateRange(from, until, {
      nameOfHouse: options.nameOfHouse,
      nameOfMeeting: options.nameOfMeeting,
      onProgress: (current, total) => {
        process.stdout.write(`\r  取得中: ${current}/${total} 件`)
      },
    })
    console.log(`\n  ✓ ${meetings.length} 件の会議録を発見`)

    console.log('\n📥 詳細データを取得中...')
    const detailedMeetings = await kokkaiSyncClient.fetchAllMeetingDetails(meetings, {
      batchSize: options.batchSize || 5,
      onProgress: (current, total) => {
        const percentage = Math.round((current / total) * 100)
        const bar = '█'.repeat(Math.floor(percentage / 2))
        const empty = '░'.repeat(50 - Math.floor(percentage / 2))
        process.stdout.write(`\r  [${bar}${empty}] ${percentage}% (${current}/${total})`)
      },
    })
    console.log(`\n  ✓ ${detailedMeetings.length} 件の詳細を取得`)

    console.log('\n💾 データベースに保存中...')
    let savedMeetings = 0
    let savedSpeeches = 0

    for (const meeting of detailedMeetings) {
      await saveMeetingToDatabase(meeting)
      savedMeetings++
      savedSpeeches += meeting.speechRecord?.length || 0
    }

    await prisma.syncHistory.update({
      where: { id: syncHistory.id },
      data: {
        status: 'completed',
        totalRecords: meetings.length,
        processedRecords: savedMeetings,
        completedAt: new Date(),
      },
    })

    console.log('\n' + '═'.repeat(60))
    console.log('✅ 同期完了!')
    console.log(`  📊 保存された会議録: ${savedMeetings} 件`)
    console.log(`  💬 保存された発言: ${savedSpeeches} 件`)
    console.log('═'.repeat(60))
  } catch (error) {
    await prisma.syncHistory.update({
      where: { id: syncHistory.id },
      data: {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : '不明なエラー',
        completedAt: new Date(),
      },
    })

    throw error
  }
}

async function syncLastYear() {
  console.log('\n🚀 過去1年分のデータ同期を開始します')
  console.log('━'.repeat(60))

  const endDate = new Date()
  const startDate = new Date()
  startDate.setFullYear(startDate.getFullYear() - 1)

  console.log(
    `\n📆 ${startDate.toISOString().split('T')[0]} 〜 ${
      endDate.toISOString().split('T')[0]
    } を処理中...`
  )

  try {
    await syncDateRange({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      batchSize: 5,
    })
  } catch (error) {
    console.error(`\n❌ 同期でエラーが発生しました:`, error)
    process.exit(1)
  }

  console.log('\n' + '═'.repeat(60))
  console.log('🎉 過去1年分のデータ同期が完了しました!')
  console.log('═'.repeat(60))
}

async function showStats() {
  const [totalMeetings, totalSpeeches, totalSpeakers, oldestMeeting, newestMeeting, topSpeakers] =
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
      prisma.speaker.findMany({
        orderBy: { speechCount: 'desc' },
        take: 5,
        select: { displayName: true, speechCount: true },
      }),
    ])

  console.log('\n📊 データベース統計')
  console.log('━'.repeat(60))
  console.log(`  会議録数: ${totalMeetings.toLocaleString()} 件`)
  console.log(`  発言数: ${totalSpeeches.toLocaleString()} 件`)
  console.log(`  発言者数: ${totalSpeakers.toLocaleString()} 人`)
  if (oldestMeeting && newestMeeting) {
    console.log(
      `  データ範囲: ${oldestMeeting.date.toLocaleDateString(
        'ja-JP'
      )} 〜 ${newestMeeting.date.toLocaleDateString('ja-JP')}`
    )
  }

  if (topSpeakers.length > 0) {
    console.log('\n  📢 発言数TOP5:')
    topSpeakers.forEach((speaker, index) => {
      console.log(`    ${index + 1}. ${speaker.displayName}: ${speaker.speechCount}回`)
    })
  }

  console.log('━'.repeat(60))
}

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  console.log('\n🏛️ 国会会議録同期ツール')
  console.log('━'.repeat(60))

  try {
    switch (command) {
      case 'sync':
        const startDate = args[1]
        const endDate = args[2]

        if (!startDate || !endDate) {
          console.error('使用方法: bun run sync:data sync <開始日> <終了日>')
          console.error('例: bun run sync:data sync 2024-01-01 2024-12-31')
          process.exit(1)
        }

        await syncDateRange({
          startDate,
          endDate,
          nameOfHouse: args[3],
          nameOfMeeting: args[4],
        })
        break

      case 'sync-year':
        console.log('⚠️ この処理には時間がかかる可能性があります')
        console.log('続行しますか? (y/n): ')

        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout,
        })

        readline.question('', async (answer: string) => {
          readline.close()
          if (answer.toLowerCase() === 'y') {
            await syncLastYear()
            await showStats()
          } else {
            console.log('キャンセルされました')
          }
          await prisma.$disconnect()
        })
        return

      case 'stats':
        await showStats()
        break

      default:
        console.log('使用可能なコマンド:')
        console.log('  sync <開始日> <終了日> [院] [会議名] - 指定期間のデータを同期')
        console.log('  sync-year - 過去1年分のデータを同期')
        console.log('  stats - データベース統計を表示')
        console.log('\n例:')
        console.log('  bun run sync:data sync 2024-01-01 2024-12-31')
        console.log('  bun run sync:data sync 2024-01-01 2024-12-31 衆議院 本会議')
        console.log('  bun run sync:data sync-year')
        console.log('  bun run sync:data stats')
    }
  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)
