import type {
  CategoryReportRow,
  HourBucket,
  Order,
  OrderItem,
  ProductCategory,
  ProductSalesRow,
  SalesChannel,
} from '../types'
import { dayKeyOf, dayKeyOffset } from '../domain/time/business-day'

/**
 * Pure reporting analytics, re-exported with the Phase 6 domain modules.
 *
 * Aggregates that answer "how was the day?" live here; the one day summary and
 * the CSV/Z-report builders live under `domain/reporting/`. Kept as a facade so
 * screens keep one reporting import until Phase 10.
 */

export { buildSalesSummary } from '../domain/reporting/summary'
export type {
  ChannelMixRow,
  PaymentMixRow,
  SalesSummary,
} from '../domain/reporting/summary'
export { csvField, dailyOrdersCsv, zReportText } from '../domain/reporting/export'
export type { ReportLabels } from '../domain/reporting/export'

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
    const key = dayKeyOf(order.createdAt)
    const point = byDay.get(key) ?? { day: key, revenue: 0, orders: 0 }
    point.revenue += order.total
    point.orders += 1
    byDay.set(key, point)
  }

  const points: DayPoint[] = []
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const key = dayKeyOffset(endDay, -offset)
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
