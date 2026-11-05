import { describe, expect, it } from 'vitest'
import {
  PAYMENT_QR_TTL_MS,
  amountMatches,
  canCancelPendingOrder,
  isPaymentTerminal,
  nextPaymentStatus,
  paymentDisplayState,
  qrExpiryFrom,
} from '../src/domain/sales/payment-lifecycle'

describe('payment status transitions', () => {
  it('moves a live attempt to paid', () => {
    expect(nextPaymentStatus('creating', 'succeeded')).toBe('paid')
    expect(nextPaymentStatus('pending', 'succeeded')).toBe('paid')
  })

  it('claims a late payment after the QR window expired', () => {
    // Money really arrived; the order must not stay pending forever.
    expect(nextPaymentStatus('expired', 'succeeded')).toBe('paid')
    expect(nextPaymentStatus('failed', 'succeeded')).toBe('paid')
  })

  it('never resurrects a cancelled attempt', () => {
    // The order was voided and restocked; the owner refunds manually instead.
    expect(nextPaymentStatus('cancelled', 'succeeded')).toBeNull()
  })

  it('is idempotent for duplicate capture webhooks', () => {
    expect(nextPaymentStatus('paid', 'succeeded')).toBeNull()
    expect(nextPaymentStatus('paid', 'failed')).toBeNull()
    expect(nextPaymentStatus('cancelled', 'cancelled')).toBeNull()
  })

  it('records failure and expiry only while the attempt is live', () => {
    expect(nextPaymentStatus('pending', 'failed')).toBe('failed')
    expect(nextPaymentStatus('pending', 'expired')).toBe('expired')
    expect(nextPaymentStatus('expired', 'failed')).toBeNull()
    expect(nextPaymentStatus('expired', 'expired')).toBeNull()
    expect(nextPaymentStatus('failed', 'expired')).toBeNull()
  })

  it('cancels every non-terminal attempt', () => {
    expect(nextPaymentStatus('creating', 'cancelled')).toBe('cancelled')
    expect(nextPaymentStatus('pending', 'cancelled')).toBe('cancelled')
    expect(nextPaymentStatus('expired', 'cancelled')).toBe('cancelled')
    expect(nextPaymentStatus('failed', 'cancelled')).toBe('cancelled')
    expect(nextPaymentStatus('paid', 'cancelled')).toBeNull()
  })

  it('marks paid and cancelled as terminal', () => {
    expect(isPaymentTerminal('paid')).toBe(true)
    expect(isPaymentTerminal('cancelled')).toBe(true)
    expect(isPaymentTerminal('pending')).toBe(false)
    expect(isPaymentTerminal('expired')).toBe(false)
  })
})

describe('payment display state', () => {
  const now = '2026-11-05T10:00:00.000Z'

  it('shows waiting while the clock still runs', () => {
    expect(paymentDisplayState({ status: 'pending', expiresAt: '2026-11-05T10:15:00.000Z' }, now)).toBe(
      'waiting',
    )
  })

  it('shows expired when the clock ran out before any webhook', () => {
    expect(paymentDisplayState({ status: 'pending', expiresAt: '2026-11-05T09:59:00.000Z' }, now)).toBe(
      'expired',
    )
  })

  it('keeps terminal states as-is', () => {
    expect(paymentDisplayState({ status: 'paid' }, now)).toBe('paid')
    expect(paymentDisplayState({ status: 'cancelled' }, now)).toBe('cancelled')
    expect(paymentDisplayState({ status: 'failed' }, now)).toBe('failed')
  })
})

describe('payment guards', () => {
  it('only a pending order can be cancelled', () => {
    expect(canCancelPendingOrder('pending')).toBe(true)
    expect(canCancelPendingOrder('paid')).toBe(false)
    expect(canCancelPendingOrder('void')).toBe(false)
    expect(canCancelPendingOrder('refunded')).toBe(false)
  })

  it('requires exact integer rupiah equality', () => {
    expect(amountMatches(25000, 25000)).toBe(true)
    expect(amountMatches(25000, 24000)).toBe(false)
    expect(amountMatches(25000.5, 25000.5)).toBe(false)
  })

  it('derives a 15-minute expiry by default', () => {
    const now = new Date('2026-11-05T10:00:00.000Z')
    expect(qrExpiryFrom(now)).toBe('2026-11-05T10:15:00.000Z')
    expect(PAYMENT_QR_TTL_MS).toBe(15 * 60 * 1000)
  })
})
