import { kokkaiSyncClient } from '../src/lib/api/kokkai-sync-client'
import { prisma } from '../src/lib/prisma'

async function debugSync() {
  const targetDate = new Date('2025-04-16')
  
  console.log('🔍 2025年4月16日の会議録を取得中...')
  
  try {
    // APIから会議録リストを取得
    const meetings = await kokkaiSyncClient.fetchMeetingsByDateRange(
      targetDate,
      targetDate,
      {
        onProgress: (current, total) => {
          console.log(`進捗: ${current}/${total}`)
        }
      }
    )
    
    console.log(`\n取得した会議録: ${meetings.length}件`)
    
    // 内閣委員会を探す
    const naikaku = meetings.find(m => m.nameOfMeeting === '内閣委員会')
    if (naikaku) {
      console.log(`\n✅ 内閣委員会が見つかりました:`)
      console.log(`  issueID: ${naikaku.issueID}`)
      console.log(`  date: ${naikaku.date}`)
      console.log(`  session: ${naikaku.session}`)
      
      // データベースに存在するか確認
      const dbMeeting = await prisma.meeting.findUnique({
        where: { issueID: naikaku.issueID }
      })
      
      if (dbMeeting) {
        console.log(`  ⚠️ データベースに既に存在します`)
      } else {
        console.log(`  ❌ データベースに存在しません`)
        
        // 詳細を取得してみる
        console.log(`\n詳細データを取得中...`)
        const detailed = await kokkaiSyncClient.fetchMeetingDetail(naikaku.issueID)
        
        if (detailed) {
          console.log(`  発言数: ${detailed.speechRecord?.length || 0}`)
          
          // 保存を試みる
          console.log(`\nデータベースに保存を試みます...`)
          try {
            const meeting = await prisma.meeting.create({
              data: {
                issueID: detailed.issueID,
                imageKind: detailed.imageKind || null,
                searchObject: detailed.searchObject ? parseInt(detailed.searchObject, 10) : null,
                session: parseInt(detailed.session, 10),
                nameOfHouse: detailed.nameOfHouse,
                nameOfMeeting: detailed.nameOfMeeting,
                issue: detailed.issue || null,
                date: new Date(detailed.date),
                closing: detailed.closing || null,
                meetingURL: detailed.meetingURL || null,
                pdfURL: detailed.pdfURL || null,
                lastSyncedAt: new Date(),
              }
            })
            console.log(`  ✅ 保存成功: ${meeting.id}`)
            
            // 発言も保存
            if (detailed.speechRecord && detailed.speechRecord.length > 0) {
              console.log(`  発言を保存中...`)
              for (const speech of detailed.speechRecord) {
                await prisma.speech.create({
                  data: {
                    speechID: speech.speechID,
                    meetingId: meeting.id,
                    speechOrder: parseInt(speech.speechOrder, 10),
                    rawSpeaker: speech.speaker,
                    rawSpeakerYomi: speech.speakerYomi || null,
                    rawSpeakerGroup: speech.speakerGroup || null,
                    rawSpeakerPosition: speech.speakerPosition || null,
                    rawSpeakerRole: speech.speakerRole || null,
                    speech: speech.speech || '',
                    startPage: speech.startPage ? parseInt(speech.startPage, 10) : null,
                    speechURL: speech.speechURL || null,
                  }
                })
              }
              console.log(`  ✅ ${detailed.speechRecord.length}件の発言を保存しました`)
            }
          } catch (error) {
            console.error(`  保存エラー:`, error)
          }
        }
      }
    } else {
      console.log(`\n❌ 内閣委員会が見つかりません`)
      console.log(`\n取得した会議名一覧:`)
      meetings.forEach(m => {
        console.log(`  ${m.issueID}: ${m.nameOfMeeting}`)
      })
    }
    
    // DBの状態を確認
    const dbMeetingsOn0416 = await prisma.meeting.findMany({
      where: {
        date: {
          gte: new Date('2025-04-16T00:00:00Z'),
          lt: new Date('2025-04-17T00:00:00Z')
        }
      },
      select: {
        issueID: true,
        nameOfMeeting: true
      }
    })
    
    console.log(`\n現在のDB内の2025年4月16日の会議録: ${dbMeetingsOn0416.length}件`)
    
  } catch (error) {
    console.error('エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugSync()