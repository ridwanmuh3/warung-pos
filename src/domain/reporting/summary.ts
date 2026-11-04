import type { Order, PaymentMethod, SalesChannel, Shift } from '../../types'
import { dayKeyOf } from '../time/business-day'

/**
 * One sales summary for every reporting surface.
 *
 * `TodaySummary` (the owner's "how was today?") and the daily report both read
 * this builder, so revenue, profit, receivables, and the mixes cannot drift
 * apart. Void and refunded orders are listed but never counted in money: their
 * cash was not kept. Gross Sales (`price × qty`) and Net Revenue (`order.total`)
 * stay deliberately distinct (CONTEXT.md); anything money-facing uses revenue.
 */

export interface PaymentMixRow {
  method: PaymentMethod
  count: number
  total: number
}

export interface ChannelMixRow {
  channel: SalesChannel
  count: number
  total: number
}

export interface SalesSummary {
  day: string
  /** Every order of the day, including void and refunded, for listing/export. */
  orders: Order[]
  paid: Order[]
  voided: Order[]
  refunded: Order[]
  /** Credit sales of the day that are still outstanding. */
  receivables: Order[]
  orderCount: number
  itemCount: number
  /** Net revenue: sum of `order.total` for paid orders. */
  revenue: number
  /** Gross Sales: sum of `price × qty` for paid orders. */
  grossSales: number
  costTotal: number
  profit: number
  discountTotal: number
  average: number
  receivableTotal: number
  byPayment: PaymentMixRow[]
  byChannel: ChannelMixRow[]
  /** Shifts that opened on the day, including still-open ones. */
  shifts: Shift[]
  cashExpected: number
  cashCounted: number
  cashVariance: number
}

/** Aggregates one calendar day; pass `shifts` for the cash reconciliation. */
export function buildSalesSummary(
  day: string,
  orders: Order[],
  shifts: Shift[] = [],
): SalesSummary {
  const dayOrders = orders.filter((order) => dayKeyOf(order.createdAt) === day)
  const paid = dayOrders.filter((order) => order.status === 'paid')
  const voided = dayOrders.filter((order) => order.status === 'void')
  const refunded = dayOrders.filter((order) => order.status === 'refunded')
  const receivables = paid.filter(
    (order) => order.paymentMethod === 'credit' && order.settlementStatus === 'unsettled',
  )

  let revenue = 0
  let grossSales = 0
  let costTotal = 0
  let profit = 0
  let discountTotal = 0
  let itemCount = 0
  const byPayment = new Map<PaymentMethod, PaymentMixRow>()
  const byChannel = new Map<SalesChannel, ChannelMixRow>()

  for (const order of paid) {
    revenue += order.total
    costTotal += order.costTotal
    profit += order.profit
    discountTotal += order.discount
    for (const item of order.items) {
      itemCount += item.qty
      grossSales += item.price * item.qty
    }

    const payment = byPayment.get(order.paymentMethod) ?? {
      method: order.paymentMethod,
      count: 0,
      total: 0,
    }
    byPayment.set(order.paymentMethod, {
      method: order.paymentMethod,
      count: payment.count + 1,
      total: payment.total + order.total,
    })

    const channel = byChannel.get(order.channel) ?? {
      channel: order.channel,
      count: 0,
      total: 0,
    }
    byChannel.set(order.channel, {
      channel: order.channel,
      count: channel.count + 1,
      total: channel.total + order.total,
    })
  }

  const dayShifts = shifts.filter((shift) => dayKeyOf(shift.openedAt) === day)
  const closedShifts = dayShifts.filter((shift) => shift.closedAt !== undefined)

  return {
    day,
    orders: dayOrders,
    paid,
    voided,
    refunded,
    receivables,
    orderCount: paid.length,
    itemCount,
    revenue,
    grossSales,
    costTotal,
    profit,
    discountTotal,
    average: paid.length > 0 ? Math.round(revenue / paid.length) : 0,
    receivableTotal: receivables.reduce((sum, order) => sum + order.total, 0),
    byPayment: [...byPayment.values()],
    byChannel: [...byChannel.values()],
    shifts: dayShifts,
    cashExpected: closedShifts.reduce((sum, shift) => sum + (shift.expectedCash ?? 0), 0),
    cashCounted: closedShifts.reduce((sum, shift) => sum + (shift.closingCash ?? 0), 0),
    cashVariance: closedShifts.reduce((sum, shift) => sum + (shift.variance ?? 0), 0),
  }
}
