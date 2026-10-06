import { beforeEach, describe, expect, it } from 'vitest'
import { resetDatabase } from './helpers/db'

const { getDb } = await import('../src/db/client.server')
const { tenants, users, orders } = await import('../src/db/schema')
const { eq } = await import('drizzle-orm')
const data = await import('../src/lib/data.server')

const TENANT = 'tenant-1'
const USER = 'user-1'

async function seedTenantAndUser(): Promise<void> {
  const now = new Date().toISOString()
  await getDb().insert(tenants).values({ id: TENANT, name: 'Warung Uji', createdAt: now })
  await getDb().insert(users).values({
    id: USER,
    name: 'Kasir Uji',
    email: 'kasir@uji.id',
    passwordHash: 'x',
    salt: 'x',
    createdAt: now,
  })
}

async function seedProduct(id: string, price: number, cost: number, stock: number | null) {
  return data.createProduct(TENANT, {
    name: `Produk ${id}`,
    price,
    cost,
    category: 'makanan',
    emoji: '🍚',
    stock,
    lowStockThreshold: 5,
    sku: id,
  })
}

const checkoutInput = {
  discount: { amount: 0, percent: null },
  paymentMethod: 'tunai' as const,
  amountPaid: 20000,
  channel: 'dine-in' as const,
}

beforeEach(async () => {
  await resetDatabase()
  await seedTenantAndUser()
})

describe('checkout consumes the open cart (ADR-0004)', () => {
  it('converts the open cart into an order and closes the cart', async () => {
    const product = await seedProduct('MKN-001', 9000, 5000, 10)
    const cart = await data.saveCart(TENANT, USER, [
      { productId: product.id, name: product.name, emoji: product.emoji, price: 9000, cost: 5000, qty: 2 },
    ])

    const order = await data.checkoutCart(TENANT, USER, cart.id, checkoutInput)

    expect(order.total).toBe(18000)
    expect(order.items).toHaveLength(1)
    // The cart is no longer open; a fresh cart starts empty.
    expect(await data.getOpenCart(TENANT, USER)).toBeUndefined()
  })

  it('settles one cart exactly once: a retry returns the original order', async () => {
    const product = await seedProduct('MKN-001', 9000, 5000, 10)
    const cart = await data.saveCart(TENANT, USER, [
      { productId: product.id, name: product.name, emoji: product.emoji, price: 9000, cost: 5000, qty: 2 },
    ])

    const first = await data.checkoutCart(TENANT, USER, cart.id, checkoutInput)
    const retry = await data.checkoutCart(TENANT, USER, cart.id, checkoutInput)

    expect(retry.id).toBe(first.id)
    expect(retry.orderNumber).toBe(first.orderNumber)
    // Exactly one order exists, and stock was deducted exactly once.
    const allOrders = await getDb().select().from(orders).where(eq(orders.tenantId, TENANT))
    expect(allOrders).toHaveLength(1)
    const [after] = await data.listProducts(TENANT)
    expect(after.stock).toBe(8)
  })

  it('rejects checking out a parked cart', async () => {
    const product = await seedProduct('MKN-001', 9000, 5000, 10)
    await data.saveCart(TENANT, USER, [
      { productId: product.id, name: product.name, emoji: product.emoji, price: 9000, cost: 5000, qty: 1 },
    ])
    await data.parkCart(TENANT, USER, 'Meja 3')
    const [parked] = await data.listParkedCarts(TENANT, USER)

    await expect(data.checkoutCart(TENANT, USER, parked.id, checkoutInput)).rejects.toThrow()
  })

  it('a checked-out cart cannot be resurrected by resumeCart', async () => {
    const product = await seedProduct('MKN-001', 9000, 5000, 10)
    const cart = await data.saveCart(TENANT, USER, [
      { productId: product.id, name: product.name, emoji: product.emoji, price: 9000, cost: 5000, qty: 1 },
    ])
    await data.checkoutCart(TENANT, USER, cart.id, checkoutInput)

    const resurrected = await data.resumeCart(TENANT, USER, cart.id)
    expect(resurrected).toBeUndefined()
    expect(await data.getOpenCart(TENANT, USER)).toBeUndefined()
  })
})
