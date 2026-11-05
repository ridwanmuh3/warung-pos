import { createServerOnlyFn } from '@tanstack/react-start'
import { timingSafeEqual } from 'node:crypto'
import { xenditEnv } from '../../lib/env.server'
import type { XenditEnv } from '../../lib/env.server'

/**
 * Xendit Payments API v3 adapter.
 *
 * This is the only module that knows Xendit's wire format. Everything above it
 * speaks `PaymentAttempt`, so a different gateway (or the legacy per-channel
 * API) can be added without touching checkout or the webhook.
 *
 * `fetch` and the credentials are injectable so tests exercise the real
 * request shape against a fake transport — no network and no real charges.
 */

const API_VERSION = '2024-11-11'
const CHANNEL_CODE = 'QRIS'
const REQUEST_TIMEOUT_MS = 15_000

export interface XenditCreateQrisInput {
  /** Our globally unique idempotency key, sent as `reference_id`. */
  referenceId: string
  amount: number
  description: string
  expiresAt: string
  metadata?: Record<string, string>
}

export interface XenditPaymentRequest {
  /** `payment_request_id` (`pr-…`). */
  id: string
  referenceId: string
  status: string
  amount: number
  currency: string
  /** The `QR_STRING` action, already extracted from `actions[]`. */
  qrString: string | null
  expiresAt: string | null
}

/** Expected API failure; `retryable` decides whether Xendit should try again. */
export class XenditError extends Error {
  readonly status: number
  readonly retryable: boolean

  constructor(message: string, status: number, retryable: boolean) {
    super(message)
    this.name = 'XenditError'
    this.status = status
    this.retryable = retryable
  }
}

export interface XenditClientOptions {
  env?: XenditEnv
  fetchImpl?: typeof fetch
}

interface RawAction {
  type?: string
  descriptor?: string
  value?: string
}

interface RawPaymentRequest {
  id?: string
  payment_request_id?: string
  reference_id?: string
  status?: string
  request_amount?: number
  amount?: number
  currency?: string
  actions?: RawAction[]
  channel_properties?: { expires_at?: string }
  expires_at?: string
}

function resolveEnv(options: XenditClientOptions): XenditEnv {
  return options.env ?? xenditEnv()
}

function resolveFetch(options: XenditClientOptions): typeof fetch {
  return options.fetchImpl ?? globalThis.fetch
}

function authHeader(apiKey: string): string {
  return `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`
}

function toPaymentRequest(raw: RawPaymentRequest): XenditPaymentRequest {
  const qrString =
    raw.actions?.find((action) => action.descriptor === 'QR_STRING')?.value ?? null
  return {
    id: raw.payment_request_id ?? raw.id ?? '',
    referenceId: raw.reference_id ?? '',
    status: raw.status ?? 'UNKNOWN',
    amount: raw.request_amount ?? raw.amount ?? 0,
    currency: raw.currency ?? '',
    qrString,
    expiresAt: raw.channel_properties?.expires_at ?? raw.expires_at ?? null,
  }
}

async function request(
  path: string,
  init: RequestInit,
  options: XenditClientOptions,
): Promise<XenditPaymentRequest> {
  const env = resolveEnv(options)
  const fetchImpl = resolveFetch(options)
  const response = await fetchImpl(`${env.baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(env.apiKey),
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'api-version': API_VERSION,
      ...init.headers,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  const text = await response.text()
  if (!response.ok) {
    const retryable = response.status >= 500 || response.status === 429 || response.status === 408
    throw new XenditError(
      `Xendit ${response.status}: ${text.slice(0, 300) || response.statusText}`,
      response.status,
      retryable,
    )
  }

  let parsed: RawPaymentRequest
  try {
    parsed = JSON.parse(text) as RawPaymentRequest
  } catch {
    throw new XenditError('Xendit returned a non-JSON response', response.status, true)
  }
  return toPaymentRequest(parsed)
}

/** Creates a fixed-amount dynamic QRIS request for one order. */
export async function createQrisPayment(
  input: XenditCreateQrisInput,
  options: XenditClientOptions = {},
): Promise<XenditPaymentRequest> {
  return request(
    '/v3/payment_requests',
    {
      method: 'POST',
      // Xendit deduplicates retries of the same reference id.
      headers: { 'idempotency-key': input.referenceId },
      body: JSON.stringify({
        reference_id: input.referenceId,
        type: 'PAY',
        country: 'ID',
        currency: 'IDR',
        request_amount: input.amount,
        capture_method: 'AUTOMATIC',
        channel_code: CHANNEL_CODE,
        channel_properties: { expires_at: input.expiresAt },
        description: input.description.slice(0, 1000),
        ...(input.metadata ? { metadata: input.metadata } : {}),
      }),
    },
    options,
  )
}

/** Reads the authoritative status; used by polling and the manual check. */
export async function getPaymentRequest(
  paymentRequestId: string,
  options: XenditClientOptions = {},
): Promise<XenditPaymentRequest> {
  return request(
    `/v3/payment_requests/${encodeURIComponent(paymentRequestId)}`,
    { method: 'GET' },
    options,
  )
}

/**
 * Test-mode only: asks Xendit to complete the payment. It responds
 * `PENDING` immediately and delivers the real result through the webhook (or
 * the next status poll), so the whole async path is exercised.
 */
export async function simulatePayment(
  paymentRequestId: string,
  amount: number,
  options: XenditClientOptions = {},
): Promise<void> {
  const env = resolveEnv(options)
  if (!env.isTestKey) {
    throw new XenditError('Simulation is only available with a test key', 400, false)
  }
  await request(
    `/v3/payment_requests/${encodeURIComponent(paymentRequestId)}/simulate`,
    { method: 'POST', body: JSON.stringify({ amount }) },
    options,
  )
}

/**
 * Constant-time comparison of the dashboard verification token. A missing or
 * different-length header fails without leaking length information.
 */
export function verifyCallbackToken(header: string | null, expected: string): boolean {
  if (!header || !expected) return false
  const provided = Buffer.from(header)
  const secret = Buffer.from(expected)
  if (provided.length !== secret.length) return false
  return timingSafeEqual(provided, secret)
}

/** Convenience for handlers that should never throw on a missing token. */
export const callbackTokenMatches = createServerOnlyFn(
  (header: string | null, expected: string): boolean => verifyCallbackToken(header, expected),
)
