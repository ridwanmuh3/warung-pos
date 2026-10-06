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

/** Key used to bucket orders by local calendar day. THE one implementation —
 * every "which day does this belong to" question in the app goes through here. */
export function dayKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

/** The reporting day for an ISO instant (or for now). Same bucketing as `dayKey`. */
export function resolveReportingDay(iso?: string): string {
  return dayKey(iso ?? new Date().toISOString())
}

/** Inverse of `dayKey`: rebuilds the local Date from a day key. */
export function dayKeyToDate(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month, day)
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
