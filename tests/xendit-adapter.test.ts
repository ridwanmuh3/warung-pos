import { describe, expect, it, vi } from 'vitest'
import {
  XenditError,
  createQrisPayment,
  getPaymentRequest,
  simulatePayment,
  verifyCallbackToken,
} from '../src/server/payments/xendit.server'
import type { XenditEnv } from '../src/lib/env.server'

const ENV: XenditEnv = {
  apiKey: 'xnd_development_example',
  baseUrl: 'https://api.xendit.test',
  isTestKey: true,
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

const created = {
  payment_request_id: 'pr-123',
  reference_id: 'ref-123',
  status: 'PENDING',
  request_amount: 25000,
  currency: 'IDR',
  channel_properties: { expires_at: '2026-11-05T10:15:00.000Z' },
  actions: [
    { type: 'PRESENT_TO_CUSTOMER', descriptor: 'QR_STRING', value: '00020101021226...' },
  ],
}

describe('Xendit create QRIS payment request', () => {
  it('sends the v3 request shape and extracts the QR string', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(created))
    const result = await createQrisPayment(
      {
        referenceId: 'ref-123',
        amount: 25000,
        description: 'Pesanan ORD-001',
        expiresAt: '2026-11-05T10:15:00.000Z',
        metadata: { order_id: 'order-1' },
      },
      { env: ENV, fetchImpl: fetchImpl as unknown as typeof fetch },
    )

    expect(result).toMatchObject({
      id: 'pr-123',
      referenceId: 'ref-123',
      status: 'PENDING',
      amount: 25000,
      currency: 'IDR',
      qrString: '00020101021226...',
      expiresAt: '2026-11-05T10:15:00.000Z',
    })

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.xendit.test/v3/payment_requests')
    expect(init.method).toBe('POST')
    const headers = init.headers as Record<string, string>
    expect(headers['api-version']).toBe('2024-11-11')
    expect(headers['idempotency-key']).toBe('ref-123')
    expect(headers.Authorization).toBe(
      `Basic ${Buffer.from('xnd_development_example:').toString('base64')}`,
    )
    expect(JSON.parse(String(init.body))).toMatchObject({
      reference_id: 'ref-123',
      type: 'PAY',
      country: 'ID',
      currency: 'IDR',
      request_amount: 25000,
      capture_method: 'AUTOMATIC',
      channel_code: 'QRIS',
      channel_properties: { expires_at: '2026-11-05T10:15:00.000Z' },
      description: 'Pesanan ORD-001',
      metadata: { order_id: 'order-1' },
    })
  })

  it('tolerates a response without a QR action', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ ...created, actions: [] }))
    const result = await createQrisPayment(
      {
        referenceId: 'ref-1',
        amount: 1000,
        description: 'x',
        expiresAt: '2026-11-05T10:15:00.000Z',
      },
      { env: ENV, fetchImpl: fetchImpl as unknown as typeof fetch },
    )
    expect(result.qrString).toBeNull()
  })

  it('classifies a 5xx as retryable and a 4xx as final', async () => {
    const server = vi.fn(async () => new Response('boom', { status: 500 }))
    await expect(
      createQrisPayment(
        { referenceId: 'r', amount: 1, description: 'x', expiresAt: 'x' },
        { env: ENV, fetchImpl: server as unknown as typeof fetch },
      ),
    ).rejects.toMatchObject({ name: 'XenditError', status: 500, retryable: true })

    const client = vi.fn(async () => new Response('bad', { status: 400 }))
    try {
      await createQrisPayment(
        { referenceId: 'r', amount: 1, description: 'x', expiresAt: 'x' },
        { env: ENV, fetchImpl: client as unknown as typeof fetch },
      )
      expect.unreachable()
    } catch (cause) {
      expect(cause).toBeInstanceOf(XenditError)
      expect((cause as XenditError).retryable).toBe(false)
    }
  })
})

describe('Xendit status reads', () => {
  it('reads one payment request by id', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(created))
    const result = await getPaymentRequest('pr-123', {
      env: ENV,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(result.status).toBe('PENDING')
    const [url] = fetchImpl.mock.calls[0] as unknown as [string]
    expect(url).toBe('https://api.xendit.test/v3/payment_requests/pr-123')
  })

  it('refuses to simulate with a live key', async () => {
    const fetchImpl = vi.fn()
    await expect(
      simulatePayment('pr-123', 25000, {
        env: { ...ENV, apiKey: 'xnd_production_example', isTestKey: false },
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toBeInstanceOf(XenditError)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('posts a simulation amount in test mode', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ status: 'PENDING' }))
    await simulatePayment('pr-123', 25000, {
      env: ENV,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.xendit.test/v3/payment_requests/pr-123/simulate')
    expect(JSON.parse(String(init.body))).toEqual({ amount: 25000 })
  })
})

describe('callback token verification', () => {
  it('accepts an exact match and rejects everything else', () => {
    expect(verifyCallbackToken('secret-token', 'secret-token')).toBe(true)
    expect(verifyCallbackToken('secret-token', 'other-token!')).toBe(false)
    expect(verifyCallbackToken('short', 'a-much-longer-token')).toBe(false)
    expect(verifyCallbackToken(null, 'secret-token')).toBe(false)
    expect(verifyCallbackToken('secret-token', '')).toBe(false)
  })
})
