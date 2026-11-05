import type { OrderStatus, PaymentAttempt, PaymentAttemptStatus } from '../../types'

/**
 * Xendit payment-attempt rules.
 *
 * Pure and clock-free: callers pass `now`, so the transitions are testable
 * without SQL, React, or a timer. The one non-obvious rule is that `expired`
 * is NOT terminal: a customer can complete a QR after the display window, and
 * the money really arrived, so a late `succeeded` still moves the attempt to
 * `paid`. `cancelled` is terminal — money arriving after the cashier cancelled
 * must be refunded by hand, never silently flipped to paid on a voided order.
 */

/** How long the QR stays on screen; Xendit's own expiry is set to match. */
export const PAYMENT_QR_TTL_MS = 15 * 60 * 1000

export type PaymentSignal = 'succeeded' | 'failed' | 'expired' | 'cancelled'

/** The next status for a signal, or `null` when it changes nothing. */
export function nextPaymentStatus(
  current: PaymentAttemptStatus,
  signal: PaymentSignal,
): PaymentAttemptStatus | null {
  switch (signal) {
    case 'succeeded':
      // `expired` and `failed` can still be paid late; `cancelled` cannot,
      // because the order has already been voided and restocked.
      return ['creating', 'pending', 'expired', 'failed'].includes(current) ? 'paid' : null
    case 'failed':
      return current === 'creating' || current === 'pending' ? 'failed' : null
    case 'expired':
      return current === 'creating' || current === 'pending' ? 'expired' : null
    case 'cancelled':
      return ['creating', 'pending', 'expired', 'failed'].includes(current)
        ? 'cancelled'
        : null
  }
}

/** A terminal attempt never changes again. */
export function isPaymentTerminal(status: PaymentAttemptStatus): boolean {
  return status === 'paid' || status === 'cancelled'
}

/**
 * What the cashier should see right now. A `pending` attempt whose clock ran
 * out reads as `expired` even before any expiration webhook arrives.
 */
export type PaymentDisplayState =
  | 'creating'
  | 'waiting'
  | 'expired'
  | 'paid'
  | 'failed'
  | 'cancelled'

export function paymentDisplayState(
  attempt: Pick<PaymentAttempt, 'status' | 'expiresAt'>,
  nowIso: string,
): PaymentDisplayState {
  if (attempt.status === 'pending' || attempt.status === 'creating') {
    if (attempt.expiresAt && attempt.expiresAt <= nowIso) return 'expired'
    return attempt.status === 'creating' ? 'creating' : 'waiting'
  }
  return attempt.status
}

/** Only a pending order can be cancelled or regenerated. */
export function canCancelPendingOrder(status: OrderStatus): boolean {
  return status === 'pending'
}

/** Exact rupiah equality; a mismatch must never mark an order paid. */
export function amountMatches(expected: number, received: number): boolean {
  return Number.isInteger(expected) && Number.isInteger(received) && expected === received
}

/** The ISO instant a freshly created QR should stop being displayed. */
export function qrExpiryFrom(now: Date, ttlMs: number = PAYMENT_QR_TTL_MS): string {
  return new Date(now.getTime() + ttlMs).toISOString()
}
