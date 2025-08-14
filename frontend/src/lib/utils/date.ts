/**
 * 日付フォーマット用のユーティリティ関数
 */

/**
 * 日付文字列を日本語形式でフォーマット
 */
export function formatMeetingDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } catch {
    return dateString
  }
}

/**
 * 日付文字列を短い形式でフォーマット
 */
export function formatDateShort(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    })
  } catch {
    return dateString
  }
}

/**
 * 相対的な時間表示（例：3日前、1週間前）
 */
export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) {
      return '今日'
    } else if (diffInDays === 1) {
      return '昨日'
    } else if (diffInDays < 7) {
      return `${diffInDays}日前`
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7)
      return `${weeks}週間前`
    } else if (diffInDays < 365) {
      const months = Math.floor(diffInDays / 30)
      return `${months}ヶ月前`
    } else {
      const years = Math.floor(diffInDays / 365)
      return `${years}年前`
    }
  } catch {
    return dateString
  }
}