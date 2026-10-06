import { beforeEach, describe, expect, it } from 'vitest'
import { resetDatabase } from './helpers/db'

const { getDb } = await import('../src/db/client.server')
const { tenants, users, orders, stockMovements } = await import('../src/db/schema')
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

async function seedProduct(sku: string, price: number, cost: number, stock: number | null) {
  return data.createProduct(TENANT, {
    name: `Produk ${sku}`,
    price,
    cost,
    category: 'makanan',
    emoji: '🍚',
    stock,
    lowStockThreshold: 5,
    sku,
  })
}

const baseCheckout = {
  discount: { amount: 0, percent: null },
  paymentMethod: 'qris' as const,
  amountPaid: null,
  channel: 'dine-in' as const,
}

beforeEach(async () => {
  await resetDatabase()
  await seedTenantAndUser()
})

describe('checkout pricing is server-authoritative (ADR-0003)', () => {
  it('charges the catalog price, not the price the cart was parked at', async () => {
    const product = await seedProduct('MKN-001', 9000, 5000, 10)
    const cart = await data.saveCart(TENANT, USER, [
      { productId: product.id, name: product.name, emoji: product.emoji, price: 9000, cost: 5000, qty: 2 },
    ])
    // The price rises while the cart sits open.
    await data.updateProduct(TENANT, product.id, { price: 12000, cost: 7000 })

    const order = await data.checkoutCart(TENANT, USER, cart.id, baseCheckout)

    expect(order.subtotal).toBe(24000)
    expect(order.total).toBe(24000)
    expect(order.items[0].price).toBe(12000)
    // HPP is also re-snapshotted from the catalog at checkout time.
    expect(order.items[0].cost).toBe(7000)
    expect(order.costTotal).toBe(14000)
    expect(order.profit).toBe(10000)
  })

  it('ignores a crafted client price entirely', async () => {
    const product = await seedProduct('MKN-001', 9000, 5000, 10)
    // A crafted cart line: Rp100 for a Rp9.000 product.
    const cart = await data.saveCart(TENANT, USER, [
      { productId: product.id, name: product.name, emoji: product.emoji, price: 100, cost: 0, qty: 3 },
    ])

    const order = await data.checkoutCart(TENANT, USER, cart.id, baseCheckout)

    expect(order.total).toBe(27000)
    expect(order.items[0].price).toBe(9000)
  })

  it('computes change from the server total and rejects insufficient cash', async () => {
    const product = await seedProduct('MKN-001', 9000, 5000, 10)
    const cart = await data.saveCart(TENANT, USER, [
      { productId: product.id, name: product.name, emoji: product.emoji, price: 9000, cost: 5000, qty: 2 },
    ])
    // Price rises to 12.000 after the cashier typed the tendered amount.
    await data.updateProduct(TENANT, product.id, { price: 12000 })

    await expect(
      data.checkoutCart(TENANT, USER, cart.id, {
        ...baseCheckout,
        paymentMethod: 'tunai',
        amountPaid: 18000,
      }),
    ).rejects.toThrow()

    // Nothing was settled: no order, no stock movement, cart still open.
    expect(await getDb().select().from(orders).where(eq(orders.tenantId, TENANT))).toHaveLength(0)
    expect(
      await getDb().select().from(stockMovements).where(eq(stockMovements.tenantId, TENANT)),
    ).toHaveLength(0)
    expect(await data.getOpenCart(TENANT, USER)).toBeDefined()

    // Sufficient cash succeeds, and change is derived from the real total.
    const order = await data.checkoutCart(TENANT, USER, cart.id, {
      ...baseCheckout,
      paymentMethod: 'tunai',
      amountPaid: 25000,
    })
    expect(order.total).toBe(24000)
    expect(order.change).toBe(1000)
  })

  it('rejects a cart line whose product no longer exists, atomically', async () => {
    const kept = await seedProduct('MKN-001', 9000, 5000, 10)
    const deleted = await seedProduct('MKN-002', 3000, 1000, 4)
    const cart = await data.saveCart(TENANT, USER, [
      { productId: kept.id, name: kept.name, emoji: kept.emoji, price: 9000, cost: 5000, qty: 1 },
      { productId: deleted.id, name: deleted.name, emoji: deleted.emoji, price: 3000, cost: 1000, qty: 2 },
    ])
    await data.removeProduct(TENANT, deleted.id)

    await expect(data.checkoutCart(TENANT, USER, cart.id, baseCheckout)).rejects.toThrow()

    // Atomic rollback: no order, no stock deducted from the surviving product,
    // cart untouched so the cashier can drop the dead line and retry.
    expect(await getDb().select().from(orders).where(eq(orders.tenantId, TENANT))).toHaveLength(0)
    const products = await data.listProducts(TENANT)
    expect(products.find((p) => p.id === kept.id)?.stock).toBe(10)
    expect(await data.getOpenCart(TENANT, USER)).toBeDefined()
  })

  it('clamps the discount against the server-computed subtotal', async () => {
    const product = await seedProduct('MKN-001', 9000, 5000, 10)
    const cart = await data.saveCart(TENANT, USER, [
      { productId: product.id, name: product.name, emoji: product.emoji, price: 9000, cost: 5000, qty: 1 },
    ])

    const order = await data.checkoutCart(TENANT, USER, cart.id, {
      ...baseCheckout,
      discount: { amount: 999999, percent: null },
    })

    expect(order.discount).toBe(9000)
    expect(order.total).toBe(0)
  })

  it('computes a percent discount against the server subtotal, taking precedence over amount', async () => {
    const product = await seedProduct('MKN-001', 9000, 5000, 10)
    const cart = await data.saveCart(TENANT, USER, [
      { productId: product.id, name: product.name, emoji: product.emoji, price: 9000, cost: 5000, qty: 2 },
    ])

    const order = await data.checkoutCart(TENANT, USER, cart.id, {
      ...baseCheckout,
      discount: { amount: 999999, percent: 10 },
    })

    // Percent wins over the (crafted large) amount: 10% of 18.000.
    expect(order.discount).toBe(1800)
    expect(order.total).toBe(16200)
  })
})
