import type { Order, Shift } from '../types'
import { dayKey, formatDateTime, formatIDR } from './format'
import { CHANNEL_LABELS, PAYMENT_LABELS } from '../data/products'

/** Escapes one CSV field: quotes doubled, field quoted when it needs it. */
function csvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

function csvRow(values: Array<string | number>): string {
  return values.map((value) => csvField(String(value))).join(',')
}

export interface DailyReport {
  day: string
  orders: Order[]
  paid: Order[]
  voided: Order[]
  revenue: number
  costTotal: number
  profit: number
  discountTotal: number
  itemCount: number
  byPayment: Array<{ method: keyof typeof PAYMENT_LABELS; count: number; total: number }>
  byChannel: Array<{ channel: keyof typeof CHANNEL_LABELS; count: number; total: number }>
  shifts: Shift[]
  cashExpected: number
  cashCounted: number
  cashVariance: number
}

/** Aggregates everything a daily close needs for one calendar day. */
export function buildDailyReport(day: string, orders: Order[], shifts: Shift[]): DailyReport {
  const dayOrders = orders.filter((order) => dayKey(order.createdAt) === day)
  const paid = dayOrders.filter((order) => order.status === 'paid')
  const voided = dayOrders.filter((order) => order.status === 'void')

  const byPaymentMap = new Map<keyof typeof PAYMENT_LABELS, { count: number; total: number }>()
  const byChannelMap = new Map<keyof typeof CHANNEL_LABELS, { count: number; total: number }>()
  for (const order of paid) {
    const payment = byPaymentMap.get(order.paymentMethod) ?? { count: 0, total: 0 }
    byPaymentMap.set(order.paymentMethod, { count: payment.count + 1, total: payment.total + order.total })
    const channel = byChannelMap.get(order.channel) ?? { count: 0, total: 0 }
    byChannelMap.set(order.channel, { count: channel.count + 1, total: channel.total + order.total })
  }

  const dayShifts = shifts.filter((shift) => dayKey(shift.openedAt) === day)
  const closedShifts = dayShifts.filter((shift) => shift.closedAt !== undefined)

  return {
    day,
    orders: dayOrders,
    paid,
    voided,
    revenue: paid.reduce((sum, order) => sum + order.total, 0),
    costTotal: paid.reduce((sum, order) => sum + order.costTotal, 0),
    profit: paid.reduce((sum, order) => sum + order.profit, 0),
    discountTotal: paid.reduce((sum, order) => sum + order.discount, 0),
    itemCount: paid.reduce((sum, order) => sum + order.items.reduce((s, item) => s + item.qty, 0), 0),
    byPayment: [...byPaymentMap.entries()].map(([method, value]) => ({ method, ...value })),
    byChannel: [...byChannelMap.entries()].map(([channel, value]) => ({ channel, ...value })),
    shifts: dayShifts,
    cashExpected: closedShifts.reduce((sum, shift) => sum + (shift.expectedCash ?? 0), 0),
    cashCounted: closedShifts.reduce((sum, shift) => sum + (shift.closingCash ?? 0), 0),
    cashVariance: closedShifts.reduce((sum, shift) => sum + (shift.variance ?? 0), 0),
  }
}

/** Line-item CSV for spreadsheet analysis of one day. */
export function dailyOrdersCsv(report: DailyReport): string {
  const lines = [
    csvRow(['Nomor', 'Waktu', 'Status', 'Metode', 'Jenis', 'Kasir', 'Produk', 'Qty', 'Harga', 'HPP', 'Subtotal', 'Diskon', 'Total', 'Laba']),
  ]
  for (const order of report.orders) {
    for (const item of order.items) {
      lines.push(
        csvRow([
          order.orderNumber,
          formatDateTime(order.createdAt),
          order.status,
          PAYMENT_LABELS[order.paymentMethod],
          CHANNEL_LABELS[order.channel],
          order.cashier ?? '',
          item.name,
          item.qty,
          item.price,
          item.cost,
          item.price * item.qty,
          order.discount,
          order.total,
          order.profit,
        ]),
      )
    }
  }
  return lines.join('\n')
}

/** Human-readable Z-report: the printed end-of-day summary. */
export function zReportText(report: DailyReport, dayLabel: string): string {
  const lines = [
    'WARUNG POS — LAPORAN TUTUP HARIAN',
    `Tanggal   : ${dayLabel}`,
    `Dicetak   : ${formatDateTime(new Date().toISOString())}`,
    '',
    `Transaksi : ${report.paid.length} (void: ${report.voided.length})`,
    `Item      : ${report.itemCount} pcs`,
    '',
    `Omzet     : ${formatIDR(report.revenue)}`,
    `HPP       : ${formatIDR(report.costTotal)}`,
    `Laba      : ${formatIDR(report.profit)}`,
    `Diskon    : ${formatIDR(report.discountTotal)}`,
    '',
    'PEMBAYARAN',
  ]
  for (const row of report.byPayment) {
    lines.push(`  ${PAYMENT_LABELS[row.method].padEnd(14)} ${String(row.count).padStart(3)}x  ${formatIDR(row.total)}`)
  }
  lines.push('', 'JENIS PESANAN')
  for (const row of report.byChannel) {
    lines.push(`  ${CHANNEL_LABELS[row.channel].padEnd(14)} ${String(row.count).padStart(3)}x  ${formatIDR(row.total)}`)
  }
  if (report.shifts.length > 0) {
    lines.push('', 'KAS')
    lines.push(`  Kas seharusnya : ${formatIDR(report.cashExpected)}`)
    lines.push(`  Kas dihitung   : ${formatIDR(report.cashCounted)}`)
    lines.push(`  Selisih        : ${report.cashVariance > 0 ? '+' : ''}${formatIDR(report.cashVariance)}`)
  }
  lines.push('', `Total bersih: ${formatIDR(report.revenue)}`)
  return lines.join('\n')
}

/** Triggers a client-side file download. */
export function downloadTextFile(filename: string, content: string, mime = 'text/plain'): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
