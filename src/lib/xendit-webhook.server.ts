/**
 * Xendit webhook handler.
 *
 * Kept out of the route file so the whole decision matrix is unit-testable:
 * token verification, unknown references, duplicate deliveries, amount
 * mismatches, and the three v3 events we subscribe to.
 *
 * No session exists here. The tenant is never read from the payload: it comes
 * from the payment row resolved by the globally unique `reference_id`.
 */

import { verifyCallbackToken } from '../server/payments/xendit.server'
import { xenditCallbackToken } from './env.server'
import { amountMatches } from '../domain/sales/payment-lifecycle'
import {
  applyPaymentSignal,
  findPaymentByReference,
  recordPaymentAnomaly,
} from './data/payments.server'

interface XenditCapture {
  capture_amount?: number
}

interface XenditCallbackPayload {
  event?: string
  data?: {
    reference_id?: string
    payment_request_id?: string
    request_amount?: number
    currency?: string
    captures?: XenditCapture[]
  }
}

export interface WebhookResult {
  status: number
  body: Record<string, unknown>
}

function reportedAmount(payload: XenditCallbackPayload): number | null {
  if (typeof payload.data?.request_amount === 'number') return payload.data.request_amount
  const captured = payload.data?.captures?.[0]?.capture_amount
  return typeof captured === 'number' ? captured : null
}

/**
 * Always answers 2xx for a well-formed event we can handle — including
 * duplicates and unknown references — so Xendit stops retrying. Only a missing
 * token configuration or a transient database failure asks for a retry.
 */
export async function handleXenditCallback(
  headerToken: string | null,
  rawBody: string,
): Promise<WebhookResult> {
  let expected: string
  try {
    expected = xenditCallbackToken()
  } catch {
    return { status: 503, body: { ok: false, error: 'Callback token not configured' } }
  }

  if (!verifyCallbackToken(headerToken, expected)) {
    return { status: 401, body: { ok: false, error: 'Invalid callback token' } }
  }

  let payload: XenditCallbackPayload
  try {
    payload = JSON.parse(rawBody) as XenditCallbackPayload
  } catch {
    return { status: 400, body: { ok: false, error: 'Invalid JSON' } }
  }

  const referenceId = payload.data?.reference_id
  if (!referenceId) return { status: 200, body: { ok: true, ignored: 'missing-reference' } }

  const payment = await findPaymentByReference(referenceId)
  // Not ours (another environment shares a dashboard) or already pruned.
  if (!payment) return { status: 200, body: { ok: true, ignored: 'unknown-reference' } }

  const rawPayload = rawBody.slice(0, 4000)
  const providerRef = payload.data?.payment_request_id ?? null

  switch (payload.event) {
    case 'payment.capture': {
      const amount = reportedAmount(payload)
      const currency = payload.data?.currency
      if (amount === null || !amountMatches(payment.amount, amount)) {
        await recordPaymentAnomaly(payment.tenantId, payment.id, 'amount_mismatch', rawPayload)
        return { status: 200, body: { ok: true, ignored: 'amount-mismatch' } }
      }
      if (currency && currency !== 'IDR') {
        await recordPaymentAnomaly(payment.tenantId, payment.id, 'currency_mismatch', rawPayload)
        return { status: 200, body: { ok: true, ignored: 'currency-mismatch' } }
      }
      await applyPaymentSignal(payment, 'succeeded', { rawPayload, providerRef })
      return { status: 200, body: { ok: true } }
    }

    case 'payment.failure':
      await applyPaymentSignal(payment, 'failed', { rawPayload, providerRef })
      return { status: 200, body: { ok: true } }

    case 'payment_request.expiry':
      await applyPaymentSignal(payment, 'expired', { rawPayload, providerRef })
      return { status: 200, body: { ok: true } }

    default:
      return { status: 200, body: { ok: true, ignored: 'event' } }
  }
}
