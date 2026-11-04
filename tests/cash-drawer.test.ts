import { describe, expect, it } from 'vitest'
import { expectedDrawerCash } from '../src/domain/shifts/drawer'
import type { CashOrderLike } from '../src/domain/shifts/drawer'

function order(overrides: Partial<CashOrderLike>): CashOrderLike {
  return {
    total: 0,
    status: 'paid',
    paymentMethod: 'cash',
    ...overrides,
  }
}

describe('expectedDrawerCash: the single drawer rule (CONTEXT.md: Shift)', () => {
  const SHIFT = 'shift-1'

  it('is the float when nothing sold', () => {
    expect(expectedDrawerCash({ openingCash: 50000, orders: [], shiftId: SHIFT })).toBe(50000)
  })

  it('adds cash sales of this shift only', () => {
    const orders = [
      order({ total: 9000, shiftId: SHIFT }),
      order({ total: 5000, shiftId: 'other-shift' }),
      order({ total: 7000, shiftId: SHIFT, paymentMethod: 'qris' }),
    ]
    expect(expectedDrawerCash({ openingCash: 50000, orders, shiftId: SHIFT })).toBe(59000)
  })

  it('subtracts cash voids of this shift', () => {
    const orders = [
      order({ total: 9000, shiftId: SHIFT }),
      order({ total: 9000, shiftId: SHIFT, status: 'void' }),
      order({ total: 4000, shiftId: SHIFT, status: 'void', paymentMethod: 'qris' }),
    ]
    expect(expectedDrawerCash({ openingCash: 50000, orders, shiftId: SHIFT })).toBe(50000)
  })

  it('subtracts cash refunds paid out of this drawer, booked by refundedInShiftId', () => {
    const orders = [
      // Refunded order from an OLD closed shift; cash left THIS drawer (ADR-0006).
      order({ total: 9000, shiftId: 'old-shift', status: 'refunded', refundedInShiftId: SHIFT }),
      // A qris refund never touches the drawer.
      order({
        total: 5000,
        shiftId: 'old-shift',
        status: 'refunded',
        refundedInShiftId: SHIFT,
        paymentMethod: 'qris',
      }),
    ]
    expect(expectedDrawerCash({ openingCash: 40000, orders, shiftId: SHIFT })).toBe(31000)
  })

  it('a credit sale adds nothing to the drawer until it is settled in cash', () => {
    const orders = [
      order({
        total: 9000,
        paymentMethod: 'credit',
        settlementStatus: 'unsettled',
        shiftId: SHIFT,
      }),
      order({
        total: 7000,
        paymentMethod: 'credit',
        settlementStatus: 'settled',
        settledPaymentMethod: 'qris',
        settledInShiftId: SHIFT,
      }),
      order({
        total: 5000,
        paymentMethod: 'credit',
        settlementStatus: 'settled',
        settledPaymentMethod: 'cash',
        settledInShiftId: SHIFT,
      }),
    ]
    expect(expectedDrawerCash({ openingCash: 50000, orders, shiftId: SHIFT })).toBe(55000)
  })

  it('a cash-settled credit refund subtracts from the refunding drawer', () => {
    const orders = [
      order({
        total: 8000,
        paymentMethod: 'credit',
        settlementStatus: 'settled',
        settledPaymentMethod: 'cash',
        settledInShiftId: 'old-shift',
        shiftId: 'old-shift',
        status: 'refunded',
        refundedInShiftId: SHIFT,
      }),
      // An unpaid credit that was cancelled never returned cash.
      order({
        total: 4000,
        paymentMethod: 'credit',
        settlementStatus: 'unsettled',
        shiftId: 'old-shift',
        status: 'refunded',
        refundedInShiftId: SHIFT,
      }),
    ]
    expect(expectedDrawerCash({ openingCash: 40000, orders, shiftId: SHIFT })).toBe(32000)
  })
})
