import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { PAGINATION } from '@/lib/constants';

// Prismaの型推論を使用して、includeオプションから型を自動生成
export type MeetingWithSpeeches = Prisma.MeetingGetPayload<{
  include: {
    speeches: {
      include: {
        speaker: true;
      };
    };
  };
}>;

// 最近の会議録の型定義
export type RecentMeeting = Prisma.MeetingGetPayload<{
  include: {
    _count: {
      select: { speeches: true };
    };
  };
}>;

export async function getRecentMeetingsFromDB(limit: number = PAGINATION.DEFAULT_PAGE_SIZE / 2) {
  try {
    const meetings = await prisma.meeting.findMany({
      orderBy: { date: 'desc' },
      take: limit,
      include: {
        _count: {
          select: { speeches: true },
        },
      },
    });

    return meetings.map((meeting) => ({
      id: meeting.issueID,
      title: meeting.nameOfMeeting,
      house: meeting.nameOfHouse,
      date: meeting.date.toISOString().split('T')[0],
      session: `第${meeting.session}回`,
      issue: meeting.issue || '',
      url: meeting.meetingURL || '',
      pdfUrl: meeting.pdfURL || undefined,
      speechCount: meeting._count.speeches,
    }));
  } catch (error) {
    console.error('Failed to fetch recent meetings from DB:', error);
    return [];
  }
}

export async function getMeetingByIssueID(issueID: string) {
  try {
    const meeting = await prisma.meeting.findUnique({
      where: { issueID },
      include: {
        speeches: {
          include: {
            speaker: true,
          },
          orderBy: { speechOrder: 'asc' },
        },
      },
    });

    return meeting;
  } catch (error) {
    console.error('Failed to fetch meeting from DB:', error);
    return null;
  }
}

export async function searchMeetingsInDB(params: {
  keyword?: string;
  nameOfHouse?: string;
  nameOfMeeting?: string;
  session?: number;
  speaker?: string;
  from?: string;
  until?: string;
  skip?: number;
  take?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  try {
    const where: Prisma.MeetingWhereInput = {};

    // 院の絞り込み
    if (params.nameOfHouse) {
      where.nameOfHouse = params.nameOfHouse;
    }

    // 会議名の絞り込み
    if (params.nameOfMeeting) {
      where.nameOfMeeting = {
        contains: params.nameOfMeeting,
      };
    }

    // 国会回次の絞り込み
    if (params.session) {
      where.session = params.session;
    }

    // 日付範囲の絞り込み
    if (params.from || params.until) {
      where.date = {};
      if (params.from) {
        where.date.gte = new Date(params.from);
      }
      if (params.until) {
        where.date.lte = new Date(params.until);
      }
    }

    // キーワード検索（会議名で検索）
    if (params.keyword) {
      where.nameOfMeeting = {
        contains: params.keyword,
      };
    }

    // 発言者での絞り込み（speechesテーブルを結合）
    if (params.speaker) {
      where.speeches = {
        some: {
          OR: [
            {
              rawSpeaker: {
                contains: params.speaker,
              },
            },
            {
              speaker: {
                displayName: {
                  contains: params.speaker,
                },
              },
            },
            {
              speaker: {
                normalizedName: {
                  contains: params.speaker,
                },
              },
            },
          ],
        },
      };
    }

    // ソート条件の設定
    let orderBy: Prisma.MeetingOrderByWithRelationInput = { date: 'desc' };
    if (params.sortField && params.sortOrder) {
      switch (params.sortField) {
        case 'date':
          orderBy = { date: params.sortOrder };
          break;
        case 'nameOfHouse':
          orderBy = { nameOfHouse: params.sortOrder };
          break;
        case 'session':
          orderBy = { session: params.sortOrder };
          break;
        case 'nameOfMeeting':
          orderBy = { nameOfMeeting: params.sortOrder };
          break;
        case 'issue':
          orderBy = { issue: params.sortOrder };
          break;
        case 'speechCount':
          orderBy = { speeches: { _count: params.sortOrder } };
          break;
        default:
          orderBy = { date: 'desc' };
      }
    }

    const [meetings, total] = await Promise.all([
      prisma.meeting.findMany({
        where,
        orderBy,
        skip: params.skip || 0,
        take: params.take || PAGINATION.MAX_PAGE_SIZE,
        include: {
          _count: {
            select: { speeches: true },
          },
        },
      }),
      prisma.meeting.count({ where }),
    ]);

    return {
      meetings: meetings.map((meeting) => ({
        id: meeting.issueID,
        title: meeting.nameOfMeeting,
        house: meeting.nameOfHouse,
        date: meeting.date.toISOString().split('T')[0],
        session: `第${meeting.session}回`,
        issue: meeting.issue || '',
        url: meeting.meetingURL || '',
        pdfUrl: meeting.pdfURL || undefined,
        speechCount: meeting._count.speeches,
      })),
      total,
      hasMore: (params.skip || 0) + meetings.length < total,
    };
  } catch {
    return {
      meetings: [],
      total: 0,
      hasMore: false,
    };
  }
}

export async function getDBStats() {
  try {
    const [totalMeetings, totalSpeeches, oldestMeeting, newestMeeting] = await Promise.all([
      prisma.meeting.count(),
      prisma.speech.count(),
      prisma.meeting.findFirst({
        orderBy: { date: 'asc' },
        select: { date: true, nameOfMeeting: true },
      }),
      prisma.meeting.findFirst({
        orderBy: { date: 'desc' },
        select: { date: true, nameOfMeeting: true },
      }),
    ]);

    return {
      totalMeetings,
      totalSpeeches,
      oldestMeeting,
      newestMeeting,
    };
  } catch (error) {
    console.error('Failed to get DB stats:', error);
    return null;
  }
}
