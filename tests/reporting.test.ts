import { describe, expect, it } from 'vitest'
import {
  buildSalesSummary,
  channelBreakdown,
  summarizeCategories,
  topProducts,
} from '../src/lib/reporting'
import { dayKeyOf, resolveReportingDay } from '../src/domain/time/business-day'
import type { Clock } from '../src/domain/time/business-day'
import type { Order, Shift } from '../src/types'

function makeOrder(overrides: Partial<Order>): Order {
  return {
    id: crypto.randomUUID(),
    orderNumber: 'ORD-001',
    createdAt: '2026-10-06T10:00:00.000Z',
    items: [
      { productId: 'p1', name: 'Nasi Goreng', imageKey: null, price: 18000, cost: 11000, qty: 1 },
    ],
    subtotal: 18000,
    discount: 0,
    total: 18000,
    costTotal: 11000,
    profit: 7000,
    paymentMethod: 'cash',
    amountPaid: 20000,
    change: 2000,
    status: 'paid',
    settlementStatus: 'settled',
    channel: 'dine-in',
    ...overrides,
  }
}

const DAY = dayKeyOf('2026-10-06T10:00:00.000Z')

describe('buildSalesSummary', () => {
  it('counts only paid orders in money; void and refunded are listed but excluded', () => {
    const orders = [
      makeOrder({ total: 18000 }),
      makeOrder({ total: 9000, status: 'void' }),
      makeOrder({ total: 5000, status: 'refunded' }),
    ]
    const summary = buildSalesSummary(DAY, orders)

    expect(summary.revenue).toBe(18000)
    expect(summary.paid).toHaveLength(1)
    expect(summary.voided).toHaveLength(1)
    expect(summary.refunded).toHaveLength(1)
    expect(summary.itemCount).toBe(1)
  })

  it('excludes orders from other days', () => {
    const orders = [
      makeOrder({ total: 18000 }),
      // Mid-day two days earlier: another day in every timezone.
      makeOrder({ total: 99000, createdAt: '2026-10-04T10:00:00.000Z' }),
    ]
    const summary = buildSalesSummary(DAY, orders)
    expect(summary.revenue).toBe(18000)
  })

  it('keeps gross sales and net revenue distinct', () => {
    const summary = buildSalesSummary(DAY, [
      makeOrder({
        subtotal: 18000,
        discount: 3000,
        total: 15000,
        items: [
          { productId: 'p1', name: 'Nasi Goreng', imageKey: null, price: 18000, cost: 11000, qty: 1 },
        ],
      }),
    ])
    expect(summary.grossSales).toBe(18000)
    expect(summary.revenue).toBe(15000)
    expect(summary.discountTotal).toBe(3000)
    expect(summary.profit).toBe(7000)
  })

  it('sums cash figures from closed shifts of the day only', () => {
    const shift: Shift = {
      id: 's1',
      openedAt: '2026-10-06T08:00:00.000Z',
      closedAt: '2026-10-06T22:00:00.000Z',
      openingCash: 50000,
      closingCash: 59000,
      expectedCash: 59000,
      variance: 0,
    }
    // Midday UTC keeps this shift on the same local day in the test timezones.
    const openShift: Shift = { id: 's2', openedAt: '2026-10-06T12:00:00.000Z', openingCash: 10000 }
    const summary = buildSalesSummary(DAY, [], [shift, openShift])
    expect(summary.cashExpected).toBe(59000)
    expect(summary.cashCounted).toBe(59000)
    expect(summary.cashVariance).toBe(0)
    expect(summary.shifts).toHaveLength(2)
  })

  it('is the same summary for Today and the daily report', () => {
    const orders = [
      makeOrder({ total: 18000, paymentMethod: 'cash', channel: 'dine-in' }),
      makeOrder({ total: 12000, paymentMethod: 'qris', channel: 'takeaway' }),
      makeOrder({ total: 9000, status: 'void', channel: 'delivery' }),
    ]
    const shifts: Shift[] = [
      {
        id: 's1',
        openedAt: '2026-10-06T08:00:00.000Z',
        closedAt: '2026-10-06T22:00:00.000Z',
        openingCash: 50000,
        expectedCash: 30000,
        closingCash: 30000,
        variance: 0,
      },
    ]

    // TodaySummary passes no shifts; the daily report passes them. The money
    // fields must not depend on which screen asked.
    const forToday = buildSalesSummary(DAY, orders)
    const forDailyReport = buildSalesSummary(DAY, orders, shifts)

    for (const field of ['revenue', 'grossSales', 'costTotal', 'profit', 'discountTotal', 'itemCount', 'receivableTotal'] as const) {
      expect(forToday[field]).toBe(forDailyReport[field])
    }
    expect(forToday.byPayment).toEqual(forDailyReport.byPayment)
    expect(forToday.byChannel).toEqual(forDailyReport.byChannel)

    // The mixes account for exactly the paid revenue they split.
    const paymentTotal = forDailyReport.byPayment.reduce((sum, row) => sum + row.total, 0)
    const channelTotal = forDailyReport.byChannel.reduce((sum, row) => sum + row.total, 0)
    expect(paymentTotal).toBe(forDailyReport.revenue)
    expect(channelTotal).toBe(forDailyReport.revenue)
  })
})

describe('day bucketing is one rule', () => {
  it('resolveReportingDay uses the same clock day as dayKeyOf', () => {
    const clock: Clock = { now: () => new Date(2026, 9, 6, 15, 0) }
    expect(resolveReportingDay(clock)).toBe(dayKeyOf(clock.now()))
  })
})

describe('pure aggregates ignore non-paid orders', () => {
  const orders = [
    makeOrder({ total: 18000, channel: 'delivery' }),
    makeOrder({ total: 9000, status: 'void', channel: 'dine-in' }),
  ]

  it('topProducts', () => {
    const top = topProducts(orders)
    expect(top).toHaveLength(1)
    expect(top[0].qty).toBe(1)
  })

  it('channelBreakdown', () => {
    const rows = channelBreakdown(orders)
    expect(rows).toHaveLength(1)
    expect(rows[0].channel).toBe('delivery')
  })
})

describe('summarizeCategories', () => {
  it('aggregates gross sales per category, skipping unknown products', () => {
    const rows = summarizeCategories(
      [
        { productId: 'p1', name: 'Nasi', imageKey: null, price: 18000, cost: 0, qty: 2 },
        { productId: 'p2', name: 'Teh', imageKey: null, price: 4000, cost: 0, qty: 1 },
        { productId: 'ghost', name: 'X', imageKey: null, price: 1000, cost: 0, qty: 5 },
      ],
      { p1: 'food', p2: 'drink' },
    )
    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual({ category: 'food', revenue: 36000, itemsSold: 2 })
    expect(rows[1]).toEqual({ category: 'drink', revenue: 4000, itemsSold: 1 })
  })
})
