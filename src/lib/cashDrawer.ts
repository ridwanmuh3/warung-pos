import type { OrderStatus, PaymentMethod } from '../types'

/**
 * The cash-drawer rule (CONTEXT.md: Shift; ADR-0002, ADR-0006).
 *
 * `expectedDrawerCash` is the ONE definition of "Kas seharusnya": the float
 * plus cash sales of this shift, minus cash voids of this shift, minus cash
 * refunds paid out of this drawer. Both the authoritative server close
 * (`closeShift`) and the cashier's live display (`ShiftPanel`) compute through
 * this function, so the two can never drift again.
 */

/** The minimal order shape the rule needs; satisfied by hydrated Orders and by raw rows. */
export interface CashOrderLike {
  total: number
  status: OrderStatus
  paymentMethod: PaymentMethod
  shiftId?: string
  refundedInShiftId?: string
}

export function expectedDrawerCash(input: {
  openingCash: number
  orders: CashOrderLike[]
  shiftId: string
}): number {
  const { openingCash, orders, shiftId } = input
  let cash = openingCash
  for (const order of orders) {
    if (order.paymentMethod !== 'tunai') continue
    if (order.shiftId === shiftId && order.status === 'paid') cash += order.total
    else if (order.shiftId === shiftId && order.status === 'void') cash -= order.total
    if (order.status === 'refunded' && order.refundedInShiftId === shiftId) cash -= order.total
  }
  return cash
}
