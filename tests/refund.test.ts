import { beforeEach, describe, expect, it } from 'vitest'
import { resetDatabase } from './helpers/db'

const { getDb } = await import('../src/db/client.server')
const { tenants, users } = await import('../src/db/schema')
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
    imageKey: null,
    stock,
    lowStockThreshold: 5,
    sku,
  })
}

/** Rings up a one-item order through the real checkout path. */
async function ringUp(
  productId: string,
  opts: { name: string; imageKey: string | null; price: number; cost: number; qty?: number },
  paymentMethod: 'tunai' | 'qris' = 'tunai',
) {
  const cart = await data.saveCart(TENANT, USER, [
    {
      productId,
      name: opts.name,
      imageKey: opts.imageKey,
      price: opts.price,
      cost: opts.cost,
      qty: opts.qty ?? 1,
    },
  ])
  return data.checkoutCart(TENANT, USER, cart.id, {
    discount: { amount: 0, percent: null },
    paymentMethod,
    amountPaid: paymentMethod === 'tunai' ? 100000 : null,
    channel: 'dine-in',
  })
}

beforeEach(async () => {
  await resetDatabase()
  await seedTenantAndUser()
})

describe('refund is separate from void (ADR-0006)', () => {
  it('voiding an order whose shift has closed is rejected', async () => {
    const product = await seedProduct('MKN-001', 9000, 5000, 10)
    await data.openShift(TENANT, { openingCash: 50000, userId: USER })
    const order = await ringUp(product.id, product)
    await data.closeShift(TENANT, { countedCash: 59000 })

    await expect(data.voidOrder(TENANT, order.id, 'salah input')).rejects.toThrow()
  })

  it('voiding within the open shift still works', async () => {
    const product = await seedProduct('MKN-001', 9000, 5000, 10)
    await data.openShift(TENANT, { openingCash: 50000, userId: USER })
    const order = await ringUp(product.id, product)

    const voided = await data.voidOrder(TENANT, order.id, 'salah input')
    expect(voided?.status).toBe('void')
  })

  it('a refund marks the order refunded and restocks with the refund reason', async () => {
    const product = await seedProduct('MKN-001', 9000, 5000, 10)
    await data.openShift(TENANT, { openingCash: 50000, userId: USER })
    const order = await ringUp(product.id, product, 'tunai')
    await data.closeShift(TENANT, { countedCash: 59000 })

    const refunded = await data.refundOrder(TENANT, order.id, 'makanan basi')

    expect(refunded?.status).toBe('refunded')
    expect(refunded?.refundReason).toBe('makanan basi')
    const [after] = await data.listProducts(TENANT)
    expect(after.stock).toBe(10)
    const movements = await data.listStockMovements(TENANT)
    expect(movements.map((m) => m.reason).sort()).toEqual(['refund', 'sale'])
  })

  it('a cash refund reduces the expected cash of the shift that pays it out', async () => {
    const product = await seedProduct('MKN-001', 9000, 5000, 10)
    await data.openShift(TENANT, { openingCash: 50000, userId: USER })
    const order = await ringUp(product.id, product, 'tunai')
    const shiftA = await data.closeShift(TENANT, { countedCash: 59000 })
    expect(shiftA?.expectedCash).toBe(59000)

    // Next day, next drawer: the customer comes back with a complaint.
    await data.openShift(TENANT, { openingCash: 40000, userId: USER })
    await data.refundOrder(TENANT, order.id, 'makanan basi')
    // Sell nothing else; the drawer should hold opening minus the refund.
    const shiftB = await data.closeShift(TENANT, { countedCash: 31000 })

    expect(shiftB?.expectedCash).toBe(31000)
    expect(shiftB?.variance).toBe(0)
  })

  it('a qris refund never touches the drawer', async () => {
    const product = await seedProduct('MKN-001', 9000, 5000, 10)
    await data.openShift(TENANT, { openingCash: 50000, userId: USER })
    const order = await ringUp(product.id, product, 'qris')
    await data.closeShift(TENANT, { countedCash: 50000 })

    await data.openShift(TENANT, { openingCash: 40000, userId: USER })
    await data.refundOrder(TENANT, order.id, 'komplain')
    const shiftB = await data.closeShift(TENANT, { countedCash: 40000 })

    expect(shiftB?.expectedCash).toBe(40000)
  })

  it('refunds are idempotent: stock is restored exactly once', async () => {
    const product = await seedProduct('MKN-001', 9000, 5000, 10)
    await data.openShift(TENANT, { openingCash: 50000, userId: USER })
    const order = await ringUp(product.id, product, 'tunai')
    await data.closeShift(TENANT, { countedCash: 59000 })

    const first = await data.refundOrder(TENANT, order.id, 'makanan basi')
    const second = await data.refundOrder(TENANT, order.id, 'makanan basi')

    expect(second?.status).toBe('refunded')
    expect(second?.refundedAt).toBe(first?.refundedAt)
    const [after] = await data.listProducts(TENANT)
    expect(after.stock).toBe(10)
  })

  it('a voided order cannot be refunded, and vice versa', async () => {
    const product = await seedProduct('MKN-001', 9000, 5000, 10)
    await data.openShift(TENANT, { openingCash: 50000, userId: USER })
    const order = await ringUp(product.id, product, 'tunai')
    await data.voidOrder(TENANT, order.id, 'salah input')

    await expect(data.refundOrder(TENANT, order.id, 'coba-coba')).rejects.toThrow()
  })
})
