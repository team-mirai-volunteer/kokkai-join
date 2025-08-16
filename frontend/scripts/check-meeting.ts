import { prisma } from '../src/lib/prisma';

async function checkMeeting() {
  const issueID = '121704889X01420250416';

  try {
    // データベースで該当の会議録を検索
    const meeting = await prisma.meeting.findUnique({
      where: { issueID },
      include: {
        _count: {
          select: { speeches: true },
        },
      },
    });

    if (meeting) {
      console.log('会議録が見つかりました:');
      console.log({
        issueID: meeting.issueID,
        date: meeting.date,
        nameOfMeeting: meeting.nameOfMeeting,
        nameOfHouse: meeting.nameOfHouse,
        session: meeting.session,
        speechCount: meeting._count.speeches,
      });
    } else {
      console.log(`会議録 ${issueID} はデータベースに存在しません`);

      // 2025年4月の会議録を確認
      const aprilMeetings = await prisma.meeting.findMany({
        where: {
          date: {
            gte: new Date('2025-04-01'),
            lte: new Date('2025-04-30'),
          },
        },
        orderBy: { date: 'desc' },
        select: {
          issueID: true,
          date: true,
          nameOfMeeting: true,
          nameOfHouse: true,
        },
      });

      console.log('\n2025年4月の会議録:');
      if (aprilMeetings.length === 0) {
        console.log('2025年4月の会議録はありません');
      } else {
        aprilMeetings.forEach((m) => {
          console.log(
            `${m.issueID}: ${m.date.toISOString().split('T')[0]} - ${m.nameOfHouse} - ${m.nameOfMeeting}`
          );
        });
      }

      // 総件数を確認
      const totalCount = await prisma.meeting.count();
      console.log(`\nデータベース内の総会議録数: ${totalCount}`);
    }
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMeeting();
