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

/** Key used to bucket orders by local calendar day. */
export function dayKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}
