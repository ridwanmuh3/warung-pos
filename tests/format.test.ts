import { describe, expect, test } from 'vitest'
import { dayKey, dayKeyToInputValue, formatDayLabel, isDayKey, resolveReportingDay } from '../src/lib/format'

describe('isDayKey', () => {
  test('accepts the day keys dayKey itself produces', () => {
    // dayKey is unpadded: `${year}-${month}-${day}` with a zero-based month.
    expect(isDayKey('2026-9-8')).toBe(true)
    expect(isDayKey('2026-0-1')).toBe(true)
    expect(isDayKey('2026-11-31')).toBe(true)
    expect(isDayKey(dayKey(new Date(2026, 9, 8, 12).toISOString()))).toBe(true)
    expect(isDayKey(resolveReportingDay())).toBe(true)
  })

  test('rejects anything a formatter could not read', () => {
    expect(isDayKey('')).toBe(false)
    expect(isDayKey('garbage')).toBe(false)
    expect(isDayKey('NaN-NaN-NaN')).toBe(false)
    expect(isDayKey('2026-10')).toBe(false)
    expect(isDayKey('2026-10-08-1')).toBe(false)
    expect(isDayKey('2026-10-8 ')).toBe(false)
  })

  test('rejects well-formed keys whose date does not exist', () => {
    expect(isDayKey('2026-13-8')).toBe(false)
    expect(isDayKey('2026-1-31')).toBe(false)
    // 2026 is not a leap year, 2028 is.
    expect(isDayKey('2026-1-29')).toBe(false)
    expect(isDayKey('2028-1-29')).toBe(true)
  })

  test('the invalid keys it rejects are exactly the ones that throw downstream', () => {
    const bad = 'garbage'
    expect(isDayKey(bad)).toBe(false)
    expect(() => formatDayLabel(bad)).toThrow()

    const good = '2026-9-8'
    expect(isDayKey(good)).toBe(true)
    expect(() => formatDayLabel(good)).not.toThrow()
    expect(dayKeyToInputValue(good)).toBe('2026-10-08')
  })
})
