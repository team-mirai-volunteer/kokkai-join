'use server'

import { kokkaiiAPI } from '../api/kokkaii-client'
import type { RecentMeeting, MeetingRecord } from '../types/api'

/**
 * 最近の会議録を取得するServer Action
 */
export async function getRecentMeetings(limit: number = 10): Promise<RecentMeeting[]> {
  try {
    const meetings = await kokkaiiAPI.getRecentMeetings(limit)
    return meetings
  } catch (error) {
    console.error('Server Action: getRecentMeetings failed:', error)
    // エラーの場合は空配列を返す（フォールバック）
    return []
  }
}

/**
 * 特定の会議録詳細を取得するServer Action
 */
export async function getMeetingDetail(issueId: string): Promise<MeetingRecord | null> {
  try {
    if (!issueId || typeof issueId !== 'string') {
      throw new Error('Invalid issueId provided')
    }

    const meeting = await kokkaiiAPI.getMeetingDetail(issueId)
    return meeting
  } catch (error) {
    console.error('Server Action: getMeetingDetail failed:', error)
    return null
  }
}

/**
 * 会議録を検索するServer Action
 */
export async function searchMeetings(query: string, options?: {
  house?: string
  dateFrom?: string
  dateTo?: string
  limit?: number
}) {
  try {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new Error('検索キーワードを入力してください')
    }

    const { house, dateFrom, dateTo, limit = 30 } = options || {}

    const response = await kokkaiiAPI.searchMeetings({
      any: query.trim(),
      nameOfHouse: house || undefined,
      from: dateFrom || undefined,
      until: dateTo || undefined,
      maximumRecords: limit,
    })

    return {
      meetings: response.meetingRecord || [],
      totalCount: response.numberOfRecords,
      hasMore: response.nextRecordPosition !== undefined,
      nextStartRecord: response.nextRecordPosition,
    }
  } catch (error) {
    console.error('Server Action: searchMeetings failed:', error)
    throw new Error(error instanceof Error ? error.message : '検索に失敗しました')
  }
}

