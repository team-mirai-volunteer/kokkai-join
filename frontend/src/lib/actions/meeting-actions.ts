'use server';

import {
  getRecentMeetingsFromDB,
  searchMeetingsInDB,
  getMeetingByIssueID,
  getDBStats,
} from '@/lib/db/meeting-db';
import { PAGINATION } from '@/lib/constants';
import type { RecentMeeting } from '@/lib/types/api';

/**
 * 最近の会議録を取得するServer Action（DBから）
 */
export async function getRecentMeetings(limit: number = 10): Promise<RecentMeeting[]> {
  try {
    const meetings = await getRecentMeetingsFromDB(limit);
    return meetings;
  } catch (error) {
    console.error('Server Action: getRecentMeetings failed:', error);
    return [];
  }
}

/**
 * 特定の会議録詳細を取得するServer Action（DBから）
 */
export async function getMeetingDetail(issueId: string) {
  try {
    if (!issueId || typeof issueId !== 'string') {
      throw new Error('Invalid issueId provided');
    }

    const meeting = await getMeetingByIssueID(issueId);
    return meeting;
  } catch (error) {
    console.error('Server Action: getMeetingDetail failed:', error);
    return null;
  }
}

/**
 * 会議録を検索するServer Action（DBから）
 */
export async function searchMeetings(
  query: string,
  options?: {
    house?: string;
    session?: string;
    dateFrom?: string;
    dateTo?: string;
    speaker?: string;
    limit?: number;
    page?: number;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
  }
) {
  try {
    const {
      house,
      session,
      dateFrom,
      dateTo,
      speaker,
      limit = PAGINATION.SEARCH_PAGE_SIZE,
      page = PAGINATION.DEFAULT_PAGE,
      sortField,
      sortOrder,
    } = options || {};

    const result = await searchMeetingsInDB({
      keyword: query?.trim() || undefined,
      nameOfHouse: house || undefined,
      session: session ? parseInt(session, 10) : undefined,
      speaker: speaker || undefined,
      from: dateFrom || undefined,
      until: dateTo || undefined,
      skip: (page - 1) * limit,
      take: limit,
      sortField,
      sortOrder,
    });

    return {
      meetings: result.meetings.map((m) => ({
        issueID: m.id,
        nameOfMeeting: m.title,
        nameOfHouse: m.house,
        date: m.date,
        session: m.session,
        issue: m.issue,
        meetingURL: m.url,
        pdfURL: m.pdfUrl,
        speechCount: m.speechCount,
      })),
      totalCount: result.total,
      hasMore: result.hasMore,
      currentPage: page,
    };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : '検索に失敗しました');
  }
}

/**
 * データベース統計を取得
 */
export async function getDatabaseStats() {
  try {
    const stats = await getDBStats();
    return stats;
  } catch (error) {
    console.error('Server Action: getDatabaseStats failed:', error);
    return null;
  }
}
