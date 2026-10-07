import { describe, expect, it } from 'vitest'
import { buildDailyReport, channelBreakdown, summarizeCategories, topProducts } from '../src/lib/reporting'
import { dayKey, resolveReportingDay } from '../src/lib/format'
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
    paymentMethod: 'tunai',
    amountPaid: 20000,
    change: 2000,
    status: 'paid',
    channel: 'dine-in',
    ...overrides,
  }
}

const DAY = dayKey('2026-10-06T10:00:00.000Z')

describe('buildDailyReport', () => {
  it('counts only paid orders in money; void and refunded are listed but excluded', () => {
    const orders = [
      makeOrder({ total: 18000 }),
      makeOrder({ total: 9000, status: 'void' }),
      makeOrder({ total: 5000, status: 'refunded' }),
    ]
    const report = buildDailyReport(DAY, orders, [])

    expect(report.revenue).toBe(18000)
    expect(report.paid).toHaveLength(1)
    expect(report.voided).toHaveLength(1)
    expect(report.refunded).toHaveLength(1)
    expect(report.itemCount).toBe(1)
  })

  it('excludes orders from other days', () => {
    const orders = [
      makeOrder({ total: 18000 }),
      // Mid-day two days earlier: another day in every timezone.
      makeOrder({ total: 99000, createdAt: '2026-10-04T10:00:00.000Z' }),
    ]
    const report = buildDailyReport(DAY, orders, [])
    expect(report.revenue).toBe(18000)
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
    const openShift: Shift = { id: 's2', openedAt: '2026-10-06T23:00:00.000Z', openingCash: 10000 }
    const report = buildDailyReport(DAY, [], [shift, openShift])
    expect(report.cashExpected).toBe(59000)
    expect(report.cashVariance).toBe(0)
  })
})

describe('day bucketing is one rule', () => {
  it('resolveReportingDay buckets like dayKey', () => {
    expect(resolveReportingDay('2026-10-06T15:00:00.000Z')).toBe(dayKey('2026-10-06T15:00:00.000Z'))
  })
})

describe('pure aggregates ignore non-paid orders', () => {
  const orders = [
    makeOrder({ total: 18000, channel: 'ojol' }),
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
    expect(rows[0].channel).toBe('ojol')
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
      { p1: 'makanan', p2: 'minuman' },
    )
    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual({ category: 'makanan', revenue: 36000, itemsSold: 2 })
    expect(rows[1]).toEqual({ category: 'minuman', revenue: 4000, itemsSold: 1 })
  })
})
