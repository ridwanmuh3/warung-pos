import { describe, expect, test } from 'vitest'
import { dayKeyToInputValue, formatDayLabel, formatIDR, formatTime } from '../src/lib/format'

describe('presentation formatters', () => {
  test('formatIDR prints rupiah without decimals', () => {
    expect(formatIDR(18000)).toContain('18.000')
    expect(formatIDR(18000)).not.toContain(',')
  })

  test('formatTime renders a local clock time', () => {
    const iso = new Date(2026, 9, 6, 14, 5).toISOString()
    expect(formatTime(iso)).toMatch(/14[.:]05/)
  })

  test('formatDayLabel reads the internal day key', () => {
    expect(formatDayLabel('2026-9-8')).toContain('2026')
  })

  test('dayKeyToInputValue converts the internal key for a date input', () => {
    expect(dayKeyToInputValue('2026-9-8')).toBe('2026-10-08')
    expect(dayKeyToInputValue('2026-0-1')).toBe('2026-01-01')
  })
})
