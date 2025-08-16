'use server';

import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import type { Prisma } from '@prisma/client';

/**
 * Speaker詳細情報を取得
 */
export async function getSpeakerDetail(id: string) {
  const speaker = await prisma.speaker.findUnique({
    where: { id },
    include: {
      aliases: {
        orderBy: { aliasName: 'asc' },
      },
      affiliations: {
        include: {
          partyGroup: true,
        },
        orderBy: { startDate: 'desc' },
      },
      speeches: {
        include: {
          meeting: true,
          position: true,
          role: true,
          affiliation: {
            include: {
              partyGroup: true,
            },
          },
        },
        orderBy: { 
          meeting: { 
            date: 'desc' 
          } 
        },
        take: 20, // 最初の20件
      },
      _count: {
        select: {
          speeches: true,
        },
      },
    },
  });

  if (!speaker) {
    notFound();
  }

  return speaker;
}

/**
 * Speaker発言履歴を取得（ページネーション対応）
 */
export async function getSpeakerSpeeches(
  speakerId: string,
  page: number = 1,
  pageSize: number = 20,
  filters?: {
    keyword?: string;
    startDate?: Date;
    endDate?: Date;
    meetingName?: string;
    house?: string;
  }
) {
  const skip = (page - 1) * pageSize;
  
  // Prismaの型に準拠したwhere条件
  const where: Prisma.SpeechWhereInput = {
    speakerId,
  };

  // フィルタ条件を追加
  if (filters) {
    if (filters.keyword) {
      where.speech = {
        contains: filters.keyword,
        mode: 'insensitive',
      };
    }

    const meetingWhere: Prisma.MeetingWhereInput = {};
    
    if (filters.startDate || filters.endDate) {
      meetingWhere.date = {};
      if (filters.startDate) {
        meetingWhere.date.gte = filters.startDate;
      }
      if (filters.endDate) {
        meetingWhere.date.lte = filters.endDate;
      }
    }

    if (filters.meetingName) {
      meetingWhere.nameOfMeeting = {
        contains: filters.meetingName,
        mode: 'insensitive',
      };
    }

    if (filters.house) {
      meetingWhere.nameOfHouse = filters.house;
    }

    if (Object.keys(meetingWhere).length > 0) {
      where.meeting = meetingWhere;
    }
  }

  const [speeches, totalCount] = await Promise.all([
    prisma.speech.findMany({
      where,
      include: {
        meeting: true,
        position: true,
        role: true,
        affiliation: {
          include: {
            partyGroup: true,
          },
        },
      },
      orderBy: {
        meeting: {
          date: 'desc',
        },
      },
      skip,
      take: pageSize,
    }),
    prisma.speech.count({ where }),
  ]);

  return {
    speeches,
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize),
    currentPage: page,
  };
}

/**
 * Speaker統計情報を取得
 */
export async function getSpeakerStatistics(speakerId: string) {
  const speaker = await prisma.speaker.findUnique({
    where: { id: speakerId },
    include: {
      speeches: {
        include: {
          meeting: true,
        },
      },
    },
  });

  if (!speaker) {
    return null;
  }

  // 月別発言数を集計
  const monthlySpeeches = new Map<string, number>();
  const meetingTypeCounts = new Map<string, number>();
  
  speaker.speeches.forEach(speech => {
    // 月別集計
    const monthKey = speech.meeting.date.toISOString().substring(0, 7);
    monthlySpeeches.set(monthKey, (monthlySpeeches.get(monthKey) || 0) + 1);
    
    // 会議種別集計
    const meetingType = speech.meeting.nameOfMeeting;
    meetingTypeCounts.set(meetingType, (meetingTypeCounts.get(meetingType) || 0) + 1);
  });

  // 月別データを配列に変換
  const monthlySpeechData = Array.from(monthlySpeeches.entries())
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // 会議種別データを配列に変換（上位10件）
  const topMeetingTypes = Array.from(meetingTypeCounts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // 総文字数を計算
  const totalCharacters = speaker.speeches.reduce(
    (sum, speech) => sum + (speech.speech?.length || 0),
    0
  );

  // 平均発言長
  const averageSpeechLength = speaker.speeches.length > 0
    ? Math.round(totalCharacters / speaker.speeches.length)
    : 0;

  return {
    totalSpeeches: speaker.speeches.length,
    totalCharacters,
    averageSpeechLength,
    firstSpeechDate: speaker.firstSpeechDate,
    lastSpeechDate: speaker.lastSpeechDate,
    monthlySpeechData,
    topMeetingTypes,
  };
}

/**
 * よく同じ会議に出席する他の発言者を取得
 */
export async function getCoSpeakers(speakerId: string, limit: number = 10) {
  // 対象の発言者が参加した会議を取得
  const speakerMeetings = await prisma.speech.findMany({
    where: { speakerId },
    select: { meetingId: true },
    distinct: ['meetingId'],
  });

  const meetingIds = speakerMeetings.map(s => s.meetingId);

  if (meetingIds.length === 0) {
    return [];
  }

  // 同じ会議に参加した他の発言者をカウント
  const coSpeakers = await prisma.speech.groupBy({
    by: ['speakerId'],
    where: {
      meetingId: { in: meetingIds },
      speakerId: { not: speakerId },
      NOT: { speakerId: null },
    },
    _count: {
      meetingId: true,
    },
    orderBy: {
      _count: {
        meetingId: 'desc',
      },
    },
    take: limit,
  });

  // 発言者情報を取得
  const speakerIds = coSpeakers.map(cs => cs.speakerId).filter((id): id is string => id !== null);
  const speakers = await prisma.speaker.findMany({
    where: { id: { in: speakerIds } },
  });

  const speakerMap = new Map(speakers.map(s => [s.id, s]));

  return coSpeakers
    .map(cs => ({
      speaker: cs.speakerId ? speakerMap.get(cs.speakerId) : null,
      sharedMeetingsCount: cs._count.meetingId,
    }))
    .filter((cs): cs is { speaker: { id: string; displayName: string; normalizedName: string; nameYomi: string | null; firstSpeechDate: Date | null; lastSpeechDate: Date | null; createdAt: Date; updatedAt: Date }; sharedMeetingsCount: number } => cs.speaker !== null);
}

/**
 * Speaker の役職・役割履歴を取得
 */
export async function getSpeakerRoleHistory(speakerId: string) {
  // 役職と役割を含む発言データを取得
  const speeches = await prisma.speech.findMany({
    where: {
      speakerId,
      OR: [
        { positionId: { not: null } },
        { roleId: { not: null } },
      ],
    },
    include: {
      meeting: true,
      position: true,
      role: true,
    },
    orderBy: {
      meeting: {
        date: 'desc',
      },
    },
  });

  // 役職・役割ごとにグループ化
  const positionMap = new Map<string, {
    position: { id: string; name: string; category: string | null };
    firstDate: Date;
    lastDate: Date;
    count: number;
    meetings: Array<{ id: string; issueID: string; nameOfMeeting: string; date: Date }>;
  }>();

  const roleMap = new Map<string, {
    role: { id: string; name: string };
    firstDate: Date;
    lastDate: Date;
    count: number;
    meetings: Array<{ id: string; issueID: string; nameOfMeeting: string; date: Date }>;
  }>();

  speeches.forEach(speech => {
    // 役職の集計
    if (speech.position) {
      const key = speech.position.id;
      const existing = positionMap.get(key);
      
      if (existing) {
        existing.count++;
        if (speech.meeting.date < existing.firstDate) {
          existing.firstDate = speech.meeting.date;
        }
        if (speech.meeting.date > existing.lastDate) {
          existing.lastDate = speech.meeting.date;
        }
        // 最新の5件まで保持
        if (existing.meetings.length < 5) {
          existing.meetings.push({
            id: speech.meeting.id,
            issueID: speech.meeting.issueID,
            nameOfMeeting: speech.meeting.nameOfMeeting,
            date: speech.meeting.date,
          });
        }
      } else {
        positionMap.set(key, {
          position: speech.position,
          firstDate: speech.meeting.date,
          lastDate: speech.meeting.date,
          count: 1,
          meetings: [{
            id: speech.meeting.id,
            issueID: speech.meeting.issueID,
            nameOfMeeting: speech.meeting.nameOfMeeting,
            date: speech.meeting.date,
          }],
        });
      }
    }

    // 役割の集計
    if (speech.role) {
      const key = speech.role.id;
      const existing = roleMap.get(key);
      
      if (existing) {
        existing.count++;
        if (speech.meeting.date < existing.firstDate) {
          existing.firstDate = speech.meeting.date;
        }
        if (speech.meeting.date > existing.lastDate) {
          existing.lastDate = speech.meeting.date;
        }
        // 最新の5件まで保持
        if (existing.meetings.length < 5) {
          existing.meetings.push({
            id: speech.meeting.id,
            issueID: speech.meeting.issueID,
            nameOfMeeting: speech.meeting.nameOfMeeting,
            date: speech.meeting.date,
          });
        }
      } else {
        roleMap.set(key, {
          role: speech.role,
          firstDate: speech.meeting.date,
          lastDate: speech.meeting.date,
          count: 1,
          meetings: [{
            id: speech.meeting.id,
            issueID: speech.meeting.issueID,
            nameOfMeeting: speech.meeting.nameOfMeeting,
            date: speech.meeting.date,
          }],
        });
      }
    }
  });

  // 配列に変換してソート
  const positions = Array.from(positionMap.values())
    .sort((a, b) => b.lastDate.getTime() - a.lastDate.getTime());
  
  const roles = Array.from(roleMap.values())
    .sort((a, b) => b.lastDate.getTime() - a.lastDate.getTime());

  return {
    positions,
    roles,
    totalPositions: positions.length,
    totalRoles: roles.length,
  };
}

/**
 * 全てのSpeakerの一覧を取得（検索機能付き）
 */
export async function getSpeakerList(
  page: number = 1,
  pageSize: number = 25,
  searchQuery?: string,
  sortField?: string,
  sortOrder?: 'asc' | 'desc'
) {
  const skip = (page - 1) * pageSize;
  
  const where = searchQuery
    ? {
        OR: [
          { normalizedName: { contains: searchQuery, mode: 'insensitive' as const } },
          { displayName: { contains: searchQuery, mode: 'insensitive' as const } },
          { nameYomi: { contains: searchQuery, mode: 'insensitive' as const } },
        ],
      }
    : {};

  // ソート条件を構築
  let orderBy: Prisma.SpeakerOrderByWithRelationInput = { speeches: { _count: 'desc' } };
  
  if (sortField && sortOrder) {
    switch (sortField) {
      case 'displayName':
        orderBy = { displayName: sortOrder };
        break;
      case 'nameYomi':
        orderBy = { nameYomi: sortOrder };
        break;
      case 'speechCount':
        orderBy = { speeches: { _count: sortOrder } };
        break;
      default:
        // デフォルトは発言数の降順
        orderBy = { speeches: { _count: 'desc' } };
    }
  }

  const [speakers, totalCount] = await Promise.all([
    prisma.speaker.findMany({
      where,
      include: {
        _count: {
          select: { speeches: true },
        },
        affiliations: {
          where: { endDate: null },
          include: {
            partyGroup: true,
          },
          take: 1,
        },
      },
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.speaker.count({ where }),
  ]);

  return {
    speakers,
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize),
    currentPage: page,
  };
}