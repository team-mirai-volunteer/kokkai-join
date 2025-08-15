import { formatMeetingDate, parseSearchDate } from '../date'

describe('date utilities', () => {
  describe('formatMeetingDate', () => {
    it('should format date string correctly', () => {
      expect(formatMeetingDate('2024-03-15')).toBe('2024年3月15日')
      expect(formatMeetingDate('2024-01-01')).toBe('2024年1月1日')
      expect(formatMeetingDate('2024-12-31')).toBe('2024年12月31日')
    })

    it('should format Date object correctly', () => {
      const date = new Date('2024-03-15T00:00:00Z')
      expect(formatMeetingDate(date.toISOString())).toBe('2024年3月15日')
    })

    it('should handle different date string formats', () => {
      expect(formatMeetingDate('2024-03-15T10:30:00')).toBe('2024年3月15日')
      expect(formatMeetingDate('2024-03-15T10:30:00.000Z')).toBe('2024年3月15日')
    })

    it('should handle leap year dates', () => {
      expect(formatMeetingDate('2024-02-29')).toBe('2024年2月29日')
    })
  })

  describe('parseSearchDate', () => {
    it('should parse date string to YYYY-MM-DD format', () => {
      expect(parseSearchDate('2024-03-15')).toBe('2024-03-15')
      expect(parseSearchDate('2024-01-01')).toBe('2024-01-01')
    })

    it('should handle Date objects', () => {
      const date = new Date('2024-03-15T00:00:00Z')
      const result = parseSearchDate(date.toISOString())
      expect(result).toMatch(/^2024-03-1[45]$/) // Account for timezone differences
    })

    it('should return empty string for empty input', () => {
      expect(parseSearchDate('')).toBe('')
      expect(parseSearchDate(undefined)).toBe('')
    })

    it('should handle invalid dates gracefully', () => {
      expect(parseSearchDate('invalid-date')).toBe('')
      expect(parseSearchDate('2024-13-32')).toBe('')
    })
  })
})