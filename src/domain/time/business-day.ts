/**
 * The business day: one clock-injected definition of "today".
 *
 * A day key is the app's internal name for a local calendar day:
 * `${year}-${month}-${day}` with a zero-based month (`2026-9-8`). It is not
 * ISO 8601; it is what every day bucket, URL `?day=` value, and CSV filename
 * uses. `dayKeyToInputValue` converts it for `<input type="date">`.
 *
 * Time comes through `Clock`, never from `new Date()` inside a rule, so a test
 * (or a future tenant timezone) can pin the day boundary. The tenant timezone
 * question is still open (CONTEXT.md); this module only makes the clock a seam.
 */

export interface Clock {
  now(): Date
}

/** The real clock. Injected only at the outermost edge of a call. */
export const systemClock: Clock = {
  now: () => new Date(),
}

/** The day key an instant belongs to, in the host's local timezone. */
export function dayKeyOf(instant: Date | string): string {
  const date = typeof instant === 'string' ? new Date(instant) : instant
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

/** The reporting day for `clock` (defaults to the real clock). */
export function resolveReportingDay(clock: Clock = systemClock): string {
  return dayKeyOf(clock.now())
}

/** Local midnight at the start of the reporting day, as an ISO string. */
export function startOfDayIso(clock: Clock = systemClock): string {
  return dayKeyToDate(resolveReportingDay(clock)).toISOString()
}

/**
 * True for a well-formed day key that names a real calendar date.
 *
 * Guards the day-key boundary: a key that comes from a URL (`?day=…`) or a
 * cleared date picker must never reach `dayKeyToDate`/formatting, which build
 * an Invalid Date and throw. `2026-2-31` and `2026-13-8` are rejected because
 * the date does not exist, not because of their shape.
 */
export function isDayKey(value: string): boolean {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month, day)
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day
}

/** Rebuilds the local Date from a day key. */
export function dayKeyToDate(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month, day)
}

/** The day key `days` days before/after `key` (negative goes backwards). */
export function dayKeyOffset(key: string, days: number): string {
  const date = dayKeyToDate(key)
  date.setDate(date.getDate() + days)
  return dayKeyOf(date)
}

/** Half-open local range for a day: `[start, end)` covers exactly that day. */
export function dayRangeOf(key: string): { start: Date; end: Date } {
  const start = dayKeyToDate(key)
  const end = dayKeyToDate(dayKeyOffset(key, 1))
  return { start, end }
}
