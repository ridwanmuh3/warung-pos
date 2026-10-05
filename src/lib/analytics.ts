import type { HourBucket, Order, ProductSalesRow, SalesChannel } from '../types'

/**
 * Pure sales-analytics helpers over a list of orders.
 *
 * Void orders are ignored everywhere: their money was never kept.
 * Kept framework-free so it can run on the client today and behind a server
 * function later without changing the shapes.
 */

export function paidOrders(orders: Order[]): Order[] {
  return orders.filter((order) => order.status === 'paid')
}

/** Best sellers by quantity, then revenue. */
export function topProducts(orders: Order[], limit = 5): ProductSalesRow[] {
  const rows = new Map<string, ProductSalesRow>()
  for (const order of paidOrders(orders)) {
    for (const item of order.items) {
      const row = rows.get(item.productId) ?? {
        productId: item.productId,
        name: item.name,
        emoji: item.emoji,
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
    const date = new Date(order.createdAt)
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    const point = byDay.get(key) ?? { day: key, revenue: 0, orders: 0 }
    point.revenue += order.total
    point.orders += 1
    byDay.set(key, point)
  }

  const [endYear, endMonth, endDate] = endDay.split('-').map(Number)
  const points: DayPoint[] = []
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(endYear, endMonth, endDate - offset)
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    points.push(byDay.get(key) ?? { day: key, revenue: 0, orders: 0 })
  }
  return points
}
