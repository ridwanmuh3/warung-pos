import type { Order, OrderStatus, PaymentMethod, SettlementStatus } from '../../types'

/**
 * Sales lifecycle rules — when an order can be voided, refunded, or settled.
 *
 * ADR-0006: a void reverses a sale while its shift drawer is still open; once
 * the shift has closed the money really left, so the cancellation is a refund
 * booked against the currently open drawer.
 *
 * ADR-0008: credit is a separate axis. A credit order is a paid sale whose
 * money has not arrived yet; settlement moves only that axis.
 *
 * Pure: callers supply the facts (status and whether the drawer closed), so
 * the rules are testable without SQL, React, or a clock.
 */

/** The lifecycle fields the predicates need. */
export interface LifecycleFacts {
  status: OrderStatus
  paymentMethod: PaymentMethod
  settlementStatus: SettlementStatus
}

/** A credit sale whose money has not arrived yet. */
export function isOutstanding(order: LifecycleFacts): boolean {
  return (
    order.paymentMethod === 'credit' &&
    order.status === 'paid' &&
    order.settlementStatus === 'unsettled'
  )
}

/** Full settlement only: a settled or non-credit order has nothing to settle. */
export function canSettle(order: LifecycleFacts): boolean {
  return isOutstanding(order)
}

/** A paid sale can be voided while its drawer is still open. */
export function canVoid(order: LifecycleFacts, shiftClosed: boolean): boolean {
  return order.status === 'paid' && !shiftClosed
}

/** A paid sale whose drawer closed is refunded instead of voided (ADR-0006). */
export function canRefund(order: LifecycleFacts): boolean {
  return order.status === 'paid'
}

export type VoidDecision = 'void' | 'refund' | 'none'

/**
 * What a cancellation attempt means for a paid sale.
 *
 * Idempotent repeats (already voided/refunded) are resolved by the repository
 * before this decision, so this only describes a fresh attempt.
 */
export function voidDecision(order: LifecycleFacts, shiftClosed: boolean): VoidDecision {
  if (order.status !== 'paid') return 'none'
  return shiftClosed ? 'refund' : 'void'
}

/**
 * Expected outcome of a void attempt. The client branches on `kind` instead of
 * matching user-facing copy: a closed shift means "open the refund dialog".
 */
export type VoidOutcome =
  | { kind: 'voided'; order: Order }
  | { kind: 'refund-required'; order: Order }

/**
 * A closed shift turns a void into a refund (ADR-0006). Thrown by the
 * repository so the RPC can return it as a typed outcome.
 */
export class RefundRequiredError extends Error {
  readonly code = 'refund-required'

  constructor(message = 'Shift pesanan ini sudah ditutup; gunakan refund, bukan void') {
    super(message)
    this.name = 'RefundRequiredError'
  }
}
