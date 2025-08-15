import { kokkaiSyncClient } from '../src/lib/api/kokkai-sync-client'

async function checkApiMeeting() {
  const issueID = '121704889X01420250416'
  
  try {
    console.log(`APIから会議録 ${issueID} を検索中...`)
    
    // 特定の会議録をAPIから直接取得
    const response = await fetch(
      `https://kokkai.ndl.go.jp/api/meeting?issueID=${issueID}&recordPacking=json`
    )
    
    if (!response.ok) {
      console.log(`APIレスポンスエラー: ${response.status}`)
      return
    }
    
    const data = await response.json()
    
    if (data.meetingRecord && data.meetingRecord.length > 0) {
      const meeting = data.meetingRecord[0]
      console.log('APIで会議録が見つかりました:')
      console.log({
        issueID: meeting.issueID,
        date: meeting.date,
        nameOfMeeting: meeting.nameOfMeeting,
        nameOfHouse: meeting.nameOfHouse,
        session: meeting.session,
        speechCount: meeting.speechRecord?.length || 0
      })
      
      // 2025年4月16日の全会議録を取得
      console.log('\n2025年4月16日の全会議録をAPIから取得中...')
      const allMeetings = await kokkaiSyncClient.fetchMeetingsByDateRange(
        new Date('2025-04-16'),
        new Date('2025-04-16')
      )
      
      console.log(`\n2025年4月16日の会議録（APIから）: ${allMeetings.length}件`)
      allMeetings.forEach(m => {
        console.log(`${m.issueID}: ${m.nameOfHouse} - ${m.nameOfMeeting}`)
      })
      
      // DBにない会議録を確認
      const { prisma } = await import('../src/lib/prisma')
      const dbMeetings = await prisma.meeting.findMany({
        where: {
          date: {
            gte: new Date('2025-04-16T00:00:00Z'),
            lt: new Date('2025-04-17T00:00:00Z')
          }
        },
        select: { issueID: true }
      })
      
      const dbIssueIDs = new Set(dbMeetings.map(m => m.issueID))
      const missingMeetings = allMeetings.filter(m => !dbIssueIDs.has(m.issueID))
      
      if (missingMeetings.length > 0) {
        console.log(`\nデータベースに存在しない会議録: ${missingMeetings.length}件`)
        missingMeetings.forEach(m => {
          console.log(`- ${m.issueID}: ${m.nameOfHouse} - ${m.nameOfMeeting}`)
        })
      } else {
        console.log('\n全ての会議録がデータベースに存在します')
      }
      
      await prisma.$disconnect()
    } else {
      console.log('APIでも会議録が見つかりませんでした')
    }
  } catch (error) {
    console.error('エラー:', error)
  }
}

checkApiMeeting()