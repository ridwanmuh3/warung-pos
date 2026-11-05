import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createServer } from 'node:http'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { resetDatabase } from './helpers/db'

process.env.XENDIT_API_KEY = 'xnd_development_test'
process.env.XENDIT_CALLBACK_TOKEN = 'callback-secret'
process.env.NODE_ENV = 'test'

const { getDb } = await import('../src/db/client.server')
const { eq } = await import('drizzle-orm')
const { tenants, users, orders, payments, carts, cartItems } = await import('../src/db/schema')
const data = await import('../src/lib/data.server')
const { handleXenditCallback } = await import('../src/lib/xendit-webhook.server')

const TENANT = 'tenant-1'
const OTHER_TENANT = 'tenant-2'
const USER = 'tenant-1-user'

let server: Server
let remoteStatus = 'PENDING'
let remoteAmount = 0
let lastCreateBody: Record<string, unknown> | undefined

beforeAll(async () => {
  server = createServer((req, res) => {
    const url = req.url ?? ''
    if (req.method === 'POST' && url === '/v3/payment_requests') {
      let body = ''
      req.on('data', (chunk) => (body += chunk))
      req.on('end', () => {
        lastCreateBody = JSON.parse(body) as Record<string, unknown>
        remoteAmount = Number(lastCreateBody.request_amount)
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(
          JSON.stringify({
            payment_request_id: 'pr-1',
            reference_id: lastCreateBody.reference_id,
            status: 'PENDING',
            request_amount: lastCreateBody.request_amount,
            currency: 'IDR',
            channel_properties: {
              expires_at: (lastCreateBody.channel_properties as { expires_at: string }).expires_at,
            },
            actions: [
              { type: 'PRESENT_TO_CUSTOMER', descriptor: 'QR_STRING', value: 'QR-PAYLOAD' },
            ],
          }),
        )
      })
      return
    }
    if (req.method === 'POST' && url.endsWith('/simulate')) {
      remoteStatus = 'SUCCEEDED'
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ status: 'PENDING', message: 'processing' }))
      return
    }
    if (req.method === 'GET' && url.startsWith('/v3/payment_requests/')) {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(
        JSON.stringify({
          payment_request_id: 'pr-1',
          reference_id: 'unused',
          status: remoteStatus,
          request_amount: remoteAmount,
          currency: 'IDR',
          actions: [{ type: 'PRESENT_TO_CUSTOMER', descriptor: 'QR_STRING', value: 'QR-PAYLOAD' }],
        }),
      )
      return
    }
    res.writeHead(404)
    res.end()
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  process.env.XENDIT_BASE_URL = `http://127.0.0.1:${port}`
})

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

async function seedTenant(id: string, name: string): Promise<void> {
  const now = new Date().toISOString()
  await getDb().insert(tenants).values({ id, name, createdAt: now })
  await getDb().insert(users).values({
    id: `${id}-user`,
    name: 'Kasir Uji',
    email: `${id}@uji.id`,
    passwordHash: 'x',
    salt: 'x',
    createdAt: now,
  })
}

async function seedProduct(stock = 10) {
  return data.createProduct(TENANT, {
    name: 'Kopi Susu',
    price: 12500,
    cost: 5000,
    category: 'drink',
    imageKey: null,
    stock,
    lowStockThreshold: 5,
    sku: `KOPI-${Math.random()}`,
  })
}

async function beginQris(quantity = 2) {
  const product = await seedProduct(10)
  const cart = await data.saveCart(TENANT, USER, [
    {
      productId: product.id,
      name: product.name,
      imageKey: product.imageKey,
      price: 12500,
      cost: 5000,
      qty: quantity,
    },
  ])
  const result = await data.beginQrisCheckout(TENANT, USER, cart.id, {
    discount: { amount: 0, percent: null },
    channel: 'dine-in',
    cashier: 'Kasir Uji',
  })
  return { product, cart, ...result }
}

function capture(referenceId: string, amount: number, event = 'payment.capture') {
  return JSON.stringify({
    event,
    api_version: 'v3',
    data: {
      reference_id: referenceId,
      payment_request_id: 'pr-1',
      request_amount: amount,
      currency: 'IDR',
      status: 'SUCCEEDED',
    },
  })
}

beforeEach(async () => {
  await resetDatabase()
  remoteStatus = 'PENDING'
  lastCreateBody = undefined
  await seedTenant(TENANT, 'Warung Uji')
  await seedTenant(OTHER_TENANT, 'Warung Lain')
})

describe('QRIS checkout (order-first)', () => {
  it('creates a pending order, reserves stock, and stores the QR', async () => {
    const { order, payment, product } = await beginQris(2)

    expect(order.status).toBe('pending')
    expect(order.total).toBe(25000)
    expect(payment.status).toBe('pending')
    expect(payment.qrString).toBe('QR-PAYLOAD')
    expect(payment.amount).toBe(25000)
    expect(lastCreateBody).toMatchObject({
      request_amount: 25000,
      channel_code: 'QRIS',
      capture_method: 'AUTOMATIC',
      type: 'PAY',
    })

    const [fresh] = await data.listProducts(TENANT)
    expect(fresh.id).toBe(product.id)
    expect(fresh.stock).toBe(8)
  })

  it('reuses the original attempt when the cart is submitted twice', async () => {
    const product = await seedProduct(10)
    const cart = await data.saveCart(TENANT, USER, [
      {
        productId: product.id,
        name: product.name,
        imageKey: product.imageKey,
        price: 12500,
        cost: 5000,
        qty: 1,
      },
    ])
    const first = await data.beginQrisCheckout(TENANT, USER, cart.id, {
      discount: { amount: 0, percent: null },
      channel: 'dine-in',
    })
    const second = await data.beginQrisCheckout(TENANT, USER, cart.id, {
      discount: { amount: 0, percent: null },
      channel: 'dine-in',
    })
    expect(second.order.id).toBe(first.order.id)
    expect(second.payment.id).toBe(first.payment.id)
  })

  it('regenerates a fresh attempt and expires the old one', async () => {
    const { order, payment } = await beginQris(1)
    const next = await data.regenerateQrisPayment(TENANT, order.id)
    expect(next?.payment.id).not.toBe(payment.id)
    expect(next?.payment.status).toBe('pending')

    const rows = await getDb().select().from(payments).where(eq(payments.orderId, order.id))
    expect(rows).toHaveLength(2)
    expect(rows.filter((row) => row.status === 'expired')).toHaveLength(1)
  })

  it('cancels a pending order, restocks, and parks the items as a cart', async () => {
    const { order } = await beginQris(2)
    const cancelled = await data.cancelPendingOrder(TENANT, USER, order.id, 'Salah input')

    expect(cancelled?.status).toBe('void')
    const [fresh] = await data.listProducts(TENANT)
    expect(fresh.stock).toBe(10)

    const payment = await data.getLatestPayment(TENANT, order.id)
    expect(payment?.status).toBe('cancelled')

    const parked = await data.listParkedCarts(TENANT, USER)
    expect(parked).toHaveLength(1)
    expect(parked[0].label).toContain(order.orderNumber)
    expect(parked[0].items[0]?.qty).toBe(2)
  })
})

describe('Xendit webhook', () => {
  it('rejects a missing or wrong token', async () => {
    const { payment } = await beginQris(1)
    expect((await handleXenditCallback(null, capture(payment.referenceId, 12500))).status).toBe(401)
    expect(
      (await handleXenditCallback('wrong', capture(payment.referenceId, 12500))).status,
    ).toBe(401)
  })

  it('marks the order paid on payment.capture', async () => {
    const { order, payment } = await beginQris(1)
    const result = await handleXenditCallback(
      'callback-secret',
      capture(payment.referenceId, 12500),
    )
    expect(result.status).toBe(200)

    const fresh = await data.getOrderById(TENANT, order.id)
    expect(fresh?.status).toBe('paid')
    expect((await data.getLatestPayment(TENANT, order.id))?.status).toBe('paid')
  })

  it('is idempotent for a duplicate capture', async () => {
    const { order, payment } = await beginQris(1)
    const body = capture(payment.referenceId, 12500)
    await handleXenditCallback('callback-secret', body)
    await handleXenditCallback('callback-secret', body)

    const rows = await getDb().select().from(orders).where(eq(orders.id, order.id))
    expect(rows).toHaveLength(1)
    expect(rows[0].status).toBe('paid')
  })

  it('ignores an unknown reference without retries', async () => {
    const result = await handleXenditCallback(
      'callback-secret',
      capture('qris-does-not-exist', 12500),
    )
    expect(result).toMatchObject({ status: 200, body: { ignored: 'unknown-reference' } })
  })

  it('never marks an order paid when the amount differs', async () => {
    const { order, payment } = await beginQris(1)
    const result = await handleXenditCallback(
      'callback-secret',
      capture(payment.referenceId, 1000),
    )
    expect(result.body.ignored).toBe('amount-mismatch')
    expect((await data.getOrderById(TENANT, order.id))?.status).toBe('pending')
    expect((await data.getLatestPayment(TENANT, order.id))?.failureCode).toBe('amount_mismatch')
  })

  it('accepts a late payment after the QR window expired', async () => {
    const { order, payment } = await beginQris(1)
    await data.regenerateQrisPayment(TENANT, order.id)
    // The first attempt is now expired, but the customer paid it anyway.
    await handleXenditCallback('callback-secret', capture(payment.referenceId, 12500))
    expect((await data.getOrderById(TENANT, order.id))?.status).toBe('paid')
  })

  it('records a payment that arrives after cancellation without resurrecting the order', async () => {
    const { order, payment } = await beginQris(1)
    await data.cancelPendingOrder(TENANT, USER, order.id, 'Batal')

    await handleXenditCallback('callback-secret', capture(payment.referenceId, 12500))

    expect((await data.getOrderById(TENANT, order.id))?.status).toBe('void')
    expect((await data.getLatestPayment(TENANT, order.id))?.failureCode).toBe('paid_after_cancel')
  })

  it('never lets one tenant read or cancel another tenant order', async () => {
    const { order } = await beginQris(1)
    expect(await data.getLatestPayment(OTHER_TENANT, order.id)).toBeUndefined()
    expect(await data.cancelPendingOrder(OTHER_TENANT, USER, order.id, 'nope')).toBeUndefined()
    expect((await data.getOrderById(TENANT, order.id))?.status).toBe('pending')
  })
})

describe('manual reconciliation', () => {
  it('pays an order from Xendit status when the webhook was missed', async () => {
    const { order, payment } = await beginQris(1)
    await data.simulateOrderPayment(TENANT, order.id)
    const reconciled = await data.reconcilePayment(TENANT, order.id)

    expect(reconciled?.status).toBe('paid')
    expect((await data.getOrderById(TENANT, order.id))?.status).toBe('paid')
    expect(payment.providerRef).toBe('pr-1')
  })

  it('does not reconcile across tenants', async () => {
    const { order } = await beginQris(1)
    expect(await data.reconcilePayment(OTHER_TENANT, order.id)).toBeUndefined()
  })
})

describe('pending orders stay out of money and stock ledgers', () => {
  it('is excluded from paid orders, revenue, and the cash drawer', async () => {
    const { order } = await beginQris(1)
    const listed = await data.listOrders(TENANT)
    expect(listed.find((row) => row.id === order.id)?.status).toBe('pending')

    const [physical] = await getDb().select().from(orders).where(eq(orders.id, order.id))
    expect(physical.status).toBe('pending')

    // The sale is NOT counted as revenue anywhere: summary only reads paid.
    const { buildSalesSummary } = await import('../src/domain/reporting/summary')
    const { dayKeyOf } = await import('../src/domain/time/business-day')
    const summary = buildSalesSummary(dayKeyOf(order.createdAt), listed, [])
    expect(summary.revenue).toBe(0)
    expect(summary.orders.map((row) => row.id)).toContain(order.id)
  })

  it('restores the cart table on cancel, not the checked_out row', async () => {
    const { order, cart } = await beginQris(1)
    await data.cancelPendingOrder(TENANT, USER, order.id, 'Batal')

    const original = await getDb().select().from(carts).where(eq(carts.id, cart.id))
    expect(original[0].status).toBe('checked_out')
    const parkedItems = await getDb().select().from(cartItems)
    expect(parkedItems.length).toBeGreaterThan(0)
  })
})
