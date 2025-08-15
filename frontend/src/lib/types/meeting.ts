/**
 * 会議録関連の型定義
 */

import type { getRecentMeetingsFromDB } from '@/lib/db/meeting-db'

// 関数の戻り値から型を推論
export type MeetingListItem = Awaited<ReturnType<typeof getRecentMeetingsFromDB>>[number]

/**
 * 検索結果ページのプロパティ
 */
export interface SearchResultsProps {
  meetings: MeetingListItem[]
  totalCount: number
  currentPage: number
  hasMore: boolean
  searchParams: {
    q?: string
    house?: string
    speaker?: string
    from?: string
    until?: string
  }
}