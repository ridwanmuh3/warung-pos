import { dayKeyToDate } from '../domain/time/business-day'

/**
 * Presentation formatters only.
 *
 * Day-key arithmetic lives in `domain/time/business-day.ts`; the re-exports
 * below keep existing UI imports working during the migration and contain no
 * logic of their own.
 */

export {
  dayKeyOf as dayKey,
  dayKeyToDate,
  isDayKey,
  resolveReportingDay,
} from '../domain/time/business-day'

const idrFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

export function formatIDR(value: number): string {
  return idrFormatter.format(value)
}

const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso))
}

const timeFormatter = new Intl.DateTimeFormat('id-ID', { timeStyle: 'short' })

export function formatTime(iso: string): string {
  return timeFormatter.format(new Date(iso))
}

const dayLabelFormatter = new Intl.DateTimeFormat('id-ID', { dateStyle: 'full' })

export function formatDayLabel(key: string): string {
  return dayLabelFormatter.format(dayKeyToDate(key))
}

/** `YYYY-MM-DD` for `<input type="date">`, from an internal day key. */
export function dayKeyToInputValue(key: string): string {
  const [year, month, day] = key.split('-').map(Number)
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
