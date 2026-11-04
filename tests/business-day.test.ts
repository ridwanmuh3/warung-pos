import { describe, expect, it } from 'vitest'
import {
  dayKeyOf,
  dayKeyOffset,
  dayRangeOf,
  isDayKey,
  resolveReportingDay,
  startOfDayIso,
  systemClock,
  type Clock,
} from '../src/domain/time/business-day'

/** A clock pinned to a local wall-clock instant. */
function fixedClock(date: Date): Clock {
  return { now: () => date }
}

describe('the business day comes from the injected clock', () => {
  it('flips the day at local midnight, not at UTC midnight', () => {
    const lastSecond = fixedClock(new Date(2026, 9, 6, 23, 59, 59))
    const firstSecond = fixedClock(new Date(2026, 9, 7, 0, 0, 0))

    expect(resolveReportingDay(lastSecond)).toBe('2026-9-6')
    expect(resolveReportingDay(firstSecond)).toBe('2026-9-7')
  })

  it('derives a day key from an instant in local time', () => {
    expect(dayKeyOf(new Date(2026, 9, 6, 10, 30))).toBe('2026-9-6')
    expect(dayKeyOf(new Date(2026, 9, 6, 10, 30).toISOString())).toBe('2026-9-6')
  })

  it('startOfDayIso is local midnight of the clock day', () => {
    const clock = fixedClock(new Date(2026, 9, 6, 15, 45))
    expect(startOfDayIso(clock)).toBe(new Date(2026, 9, 6).toISOString())
  })

  it('defaults to the system clock when none is injected', () => {
    expect(resolveReportingDay(systemClock)).toBe(dayKeyOf(new Date()))
  })

  it('dayRangeOf is half-open: this day up to, not including, the next', () => {
    const range = dayRangeOf('2026-9-6')
    expect(range.start).toEqual(new Date(2026, 9, 6))
    expect(range.end).toEqual(new Date(2026, 9, 7))
    expect(range.end.getTime()).toBeGreaterThan(range.start.getTime())
  })

  it('dayKeyOffset crosses month and year boundaries', () => {
    // The internal key uses a zero-based month: 2026-9-31 is 31 October.
    expect(dayKeyOffset('2026-9-31', 1)).toBe('2026-10-1')
    expect(dayKeyOffset('2026-11-31', 1)).toBe('2027-0-1')
    expect(dayKeyOffset('2026-0-1', -1)).toBe('2025-11-31')
  })
})

describe('isDayKey', () => {
  it('accepts the day keys dayKeyOf itself produces', () => {
    // Day keys are unpadded: `${year}-${month}-${day}` with a zero-based month.
    expect(isDayKey('2026-9-8')).toBe(true)
    expect(isDayKey('2026-0-1')).toBe(true)
    expect(isDayKey('2026-11-31')).toBe(true)
    expect(isDayKey(dayKeyOf(new Date(2026, 9, 8, 12)))).toBe(true)
    expect(isDayKey(resolveReportingDay())).toBe(true)
  })

  it('rejects anything a formatter could not read', () => {
    expect(isDayKey('')).toBe(false)
    expect(isDayKey('garbage')).toBe(false)
    expect(isDayKey('NaN-NaN-NaN')).toBe(false)
    expect(isDayKey('2026-10')).toBe(false)
    expect(isDayKey('2026-10-08-1')).toBe(false)
    expect(isDayKey('2026-10-8 ')).toBe(false)
  })

  it('rejects well-formed keys whose date does not exist', () => {
    expect(isDayKey('2026-13-8')).toBe(false)
    expect(isDayKey('2026-1-31')).toBe(false)
    // 2026 is not a leap year, 2028 is.
    expect(isDayKey('2026-1-29')).toBe(false)
    expect(isDayKey('2028-1-29')).toBe(true)
  })
})
