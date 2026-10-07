import type {
  CategoryReportRow,
  HourBucket,
  Order,
  OrderItem,
  ProductCategory,
  ProductSalesRow,
  SalesChannel,
  Shift,
} from '../types'
import { dayKey, formatDateTime, formatIDR } from './format'
import { CHANNEL_LABELS, PAYMENT_LABELS } from '../data/products'

/**
 * Pure reporting: every sales aggregate the app computes, in one module.
 *
 * Replaces the old analytics.ts / report.ts / reporting.server.ts split.
 * Framework-free: the same functions back the Ringkasan widgets and the
 * Laporan daily report, and can be unit-tested without a database.
 *
 * Void and refunded orders are excluded from money everywhere: their cash was
 * never kept. Gross-vs-net is deliberate (CONTEXT.md): category breakdowns
 * use Gross Sales (`price × qty`), everything money-facing uses Net Revenue
 * (`order.total`).
 */

export function paidOrders(orders: Order[]): Order[] {
  return orders.filter((order) => order.status === 'paid')
}

/* ------------------------------ analytics ------------------------------ */

/** Best sellers by quantity, then revenue. */
export function topProducts(orders: Order[], limit = 5): ProductSalesRow[] {
  const rows = new Map<string, ProductSalesRow>()
  for (const order of paidOrders(orders)) {
    for (const item of order.items) {
      const row = rows.get(item.productId) ?? {
        productId: item.productId,
        name: item.name,
        imageKey: item.imageKey,
        qty: 0,
        revenue: 0,
      }
      row.qty += item.qty
      row.revenue += item.price * item.qty
      rows.set(item.productId, row)
    }
  }
  return [...rows.values()]
    .sort((a, b) => b.qty - a.qty || b.revenue - a.revenue)
    .slice(0, limit)
}

/** Orders and revenue per hour of the local day, for hours that saw activity. */
export function hourHistogram(orders: Order[]): HourBucket[] {
  const buckets = new Map<number, HourBucket>()
  for (const order of paidOrders(orders)) {
    const hour = new Date(order.createdAt).getHours()
    const bucket = buckets.get(hour) ?? { hour, orders: 0, revenue: 0 }
    bucket.orders += 1
    bucket.revenue += order.total
    buckets.set(hour, bucket)
  }
  return [...buckets.values()].sort((a, b) => a.hour - b.hour)
}

/** The single busiest hour, or undefined when there is no activity. */
export function busiestHour(orders: Order[]): HourBucket | undefined {
  return hourHistogram(orders).reduce<HourBucket | undefined>(
    (best, bucket) => (!best || bucket.orders > best.orders ? bucket : best),
    undefined,
  )
}

export interface ChannelRow {
  channel: SalesChannel
  orders: number
  revenue: number
}

/** Revenue split per sales channel, largest first. */
export function channelBreakdown(orders: Order[]): ChannelRow[] {
  const rows = new Map<SalesChannel, ChannelRow>()
  for (const order of paidOrders(orders)) {
    const row = rows.get(order.channel) ?? { channel: order.channel, orders: 0, revenue: 0 }
    row.orders += 1
    row.revenue += order.total
    rows.set(order.channel, row)
  }
  return [...rows.values()].sort((a, b) => b.revenue - a.revenue)
}

export interface DayPoint {
  day: string
  revenue: number
  orders: number
}

/** Revenue per calendar day for the last `days` days, oldest first. */
export function revenueTrend(orders: Order[], days: number, endDay: string): DayPoint[] {
  const byDay = new Map<string, DayPoint>()
  for (const order of paidOrders(orders)) {
    const key = dayKey(order.createdAt)
    const point = byDay.get(key) ?? { day: key, revenue: 0, orders: 0 }
    point.revenue += order.total
    point.orders += 1
    byDay.set(key, point)
  }

  const [endYear, endMonth, endDate] = endDay.split('-').map(Number)
  const points: DayPoint[] = []
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(endYear, endMonth, endDate - offset)
    const key = dayKey(date.toISOString())
    points.push(byDay.get(key) ?? { day: key, revenue: 0, orders: 0 })
  }
  return points
}

/** Aggregates line items into per-category rows (Gross Sales), largest first. */
export function summarizeCategories(
  items: OrderItem[],
  categoryOf: Record<string, ProductCategory>,
): CategoryReportRow[] {
  const rows: Partial<Record<ProductCategory, CategoryReportRow>> = {}
  for (const item of items) {
    const category = categoryOf[item.productId]
    if (!category) continue
    const row = rows[category] ?? { category, revenue: 0, itemsSold: 0 }
    row.revenue += item.price * item.qty
    row.itemsSold += item.qty
    rows[category] = row
  }
  return Object.values(rows)
    .filter((row): row is CategoryReportRow => row !== undefined)
    .sort((a, b) => b.revenue - a.revenue)
}

/* ----------------------------- daily report ---------------------------- */

export interface DailyReport {
  day: string
  orders: Order[]
  paid: Order[]
  voided: Order[]
  refunded: Order[]
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
  const refunded = dayOrders.filter((order) => order.status === 'refunded')

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
    refunded,
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

/** Escapes one CSV field: quotes doubled, field quoted when it needs it. */
function csvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

function csvRow(values: Array<string | number>): string {
  return values.map((value) => csvField(String(value))).join(',')
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
    `Transaksi : ${report.paid.length} (void: ${report.voided.length}, refund: ${report.refunded.length})`,
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
