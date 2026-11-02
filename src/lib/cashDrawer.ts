import type {
  OrderStatus,
  PaymentMethod,
  SettlementPaymentMethod,
  SettlementStatus,
} from '../types'

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
  settlementStatus?: SettlementStatus
  settledPaymentMethod?: SettlementPaymentMethod
  settledInShiftId?: string
}

export function expectedDrawerCash(input: {
  openingCash: number
  orders: CashOrderLike[]
  shiftId: string
}): number {
  const { openingCash, orders, shiftId } = input
  let cash = openingCash
  for (const order of orders) {
    // A credit sale only reaches the drawer when it is settled in cash. The
    // original sale shift never counts: no money moved at checkout.
    const isCashSale = order.paymentMethod === 'cash'
    const isCashSettlement =
      order.paymentMethod === 'credit' &&
      order.settlementStatus === 'settled' &&
      order.settledPaymentMethod === 'cash'

    if (isCashSale) {
      if (order.shiftId === shiftId && order.status === 'paid') cash += order.total
      else if (order.shiftId === shiftId && order.status === 'void') cash -= order.total
      if (order.status === 'refunded' && order.refundedInShiftId === shiftId) cash -= order.total
      continue
    }

    if (!isCashSettlement) continue
    if (order.settledInShiftId === shiftId && order.status === 'paid') cash += order.total
    else if (order.settledInShiftId === shiftId && order.status === 'void') cash -= order.total
    // A refund of a cash-settled credit pays money back out of the refunding drawer.
    if (order.status === 'refunded' && order.refundedInShiftId === shiftId) cash -= order.total
  }
  return cash
}
