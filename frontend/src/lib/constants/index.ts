/**
 * アプリケーション全体で使用する定数
 */

// API関連
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'https://kokkai.ndl.go.jp/api',
  TIMEOUT: 30000,
  RETRY_COUNT: 3,
} as const

// ページネーション
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  SEARCH_PAGE_SIZE: 30,
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE: 1,
} as const

// 日付フォーマット
export const DATE_FORMAT = {
  DISPLAY: 'yyyy年MM月dd日',
  API: 'yyyy-MM-dd',
} as const

// 院の種類
export const HOUSE_TYPES = [
  { value: '', label: 'すべて' },
  { value: '衆議院', label: '衆議院' },
  { value: '参議院', label: '参議院' },
  { value: '両院', label: '両院' },
  { value: '両院協議会', label: '両院協議会' },
] as const

// 同期設定
export const SYNC_CONFIG = {
  BATCH_SIZE: 5,
  MAX_RECORDS_PER_REQUEST: 100,
  DEFAULT_SYNC_DAYS: 365,
} as const

// キャッシュ設定
export const CACHE_CONFIG = {
  SEARCH_CACHE_TTL: 3600000, // 1時間
  MEETING_DETAIL_TTL: 86400000, // 24時間
} as const