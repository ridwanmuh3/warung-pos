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
    category: 'food',
    imageKey: null,
    stock,
    lowStockThreshold: 5,
    sku,
  })
}

/** Rings up a one-item credit order through the real checkout path. */
async function ringUpCredit(
  productId: string,
  opts: { name: string; imageKey: string | null; price: number; cost: number; qty?: number },
  customerName = 'Bu Siti',
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
    paymentMethod: 'credit',
    amountPaid: null,
    channel: 'dine-in',
    customerName,
  })
}

beforeEach(async () => {
  await resetDatabase()
  await seedTenantAndUser()
})

describe('customer credit (Ngutang)', () => {
  it('creates an unsettled credit order without moving cash', async () => {
    const product = await seedProduct('MKN-001', 9000, 5000, 10)
    await data.openShift(TENANT, { openingCash: 50000, userId: USER })

    const order = await ringUpCredit(product.id, product)

    expect(order.paymentMethod).toBe('credit')
    expect(order.status).toBe('paid')
    expect(order.settlementStatus).toBe('unsettled')
    expect(order.customerName).toBe('Bu Siti')
    expect(order.amountPaid).toBeNull()
    expect(order.change).toBeNull()

    // The sale is real: stock moved and it counts as revenue at sale time.
    const [after] = await data.listProducts(TENANT)
    expect(after.stock).toBe(9)
    expect(order.total).toBe(9000)

    // No money entered the drawer.
    const shift = await data.closeShift(TENANT, { countedCash: 50000 })
    expect(shift?.expectedCash).toBe(50000)
    expect(shift?.variance).toBe(0)
  })

  it('requires a customer name for a credit sale', async () => {
    const product = await seedProduct('MKN-001', 9000, 5000, 10)
    const cart = await data.saveCart(TENANT, USER, [
      { productId: product.id, name: product.name, imageKey: product.imageKey, price: 9000, cost: 5000, qty: 1 },
    ])

    await expect(
      data.checkoutCart(TENANT, USER, cart.id, {
        discount: { amount: 0, percent: null },
        paymentMethod: 'credit',
        amountPaid: null,
        channel: 'dine-in',
        customerName: '   ',
      }),
    ).rejects.toThrow('Nama pelanggan')
  })

  it('settling with cash adds the money to the open drawer', async () => {
    const product = await seedProduct('MKN-001', 9000, 5000, 10)
    await data.openShift(TENANT, { openingCash: 50000, userId: USER })
    const order = await ringUpCredit(product.id, product)

    const settled = await data.settleCreditOrder(TENANT, order.id, { method: 'cash', userId: USER })

    expect(settled?.settlementStatus).toBe('settled')
    expect(settled?.settledPaymentMethod).toBe('cash')
    expect(settled?.settledAt).toBeDefined()
    expect(settled?.settledByUserId).toBe(USER)
    expect(settled?.paymentMethod).toBe('credit')

    const shift = await data.closeShift(TENANT, { countedCash: 59000 })
    expect(shift?.expectedCash).toBe(59000)
    expect(shift?.variance).toBe(0)
  })

  it('settling with QRIS never touches the drawer', async () => {
    const product = await seedProduct('MKN-001', 9000, 5000, 10)
    await data.openShift(TENANT, { openingCash: 50000, userId: USER })
    const order = await ringUpCredit(product.id, product)

    await data.settleCreditOrder(TENANT, order.id, { method: 'qris', userId: USER })
    const shift = await data.closeShift(TENANT, { countedCash: 50000 })

    expect(shift?.expectedCash).toBe(50000)
    expect(shift?.variance).toBe(0)
  })

  it('settlement is idempotent', async () => {
    const product = await seedProduct('MKN-001', 9000, 5000, 10)
    const order = await ringUpCredit(product.id, product)

    const first = await data.settleCreditOrder(TENANT, order.id, { method: 'cash', userId: USER })
    const second = await data.settleCreditOrder(TENANT, order.id, { method: 'qris', userId: USER })

    expect(second?.settlementStatus).toBe('settled')
    expect(second?.settledPaymentMethod).toBe('cash')
    expect(second?.settledAt).toBe(first?.settledAt)
  })

  it('rejects settling a non-credit order, a void order, or a refunded order', async () => {
    const product = await seedProduct('MKN-001', 9000, 5000, 10)
    await data.openShift(TENANT, { openingCash: 50000, userId: USER })

    const cashCart = await data.saveCart(TENANT, USER, [
      { productId: product.id, name: product.name, imageKey: product.imageKey, price: 9000, cost: 5000, qty: 1 },
    ])
    const cashOrder = await data.checkoutCart(TENANT, USER, cashCart.id, {
      discount: { amount: 0, percent: null },
      paymentMethod: 'cash',
      amountPaid: 10000,
      channel: 'dine-in',
    })
    await expect(
      data.settleCreditOrder(TENANT, cashOrder.id, { method: 'cash' }),
    ).rejects.toThrow('ngutang')

    const creditOrder = await ringUpCredit(product.id, product)
    await data.voidOrder(TENANT, creditOrder.id, 'salah input')
    await expect(
      data.settleCreditOrder(TENANT, creditOrder.id, { method: 'cash' }),
    ).rejects.toThrow('batal')

    const refundedCredit = await ringUpCredit(product.id, product)
    await data.closeShift(TENANT, { countedCash: 50000 })
    await data.refundOrder(TENANT, refundedCredit.id, 'komplain')
    await expect(
      data.settleCreditOrder(TENANT, refundedCredit.id, { method: 'cash' }),
    ).rejects.toThrow('refund')
  })

  it('lists outstanding and settled credit orders separately', async () => {
    const product = await seedProduct('MKN-001', 9000, 5000, 10)
    const first = await ringUpCredit(product.id, product, 'Bu Siti')
    const second = await ringUpCredit(product.id, product, 'Pak Budi')
    await data.settleCreditOrder(TENANT, second.id, { method: 'transfer', userId: USER })

    const outstanding = await data.listCreditOrders(TENANT, { settlementStatus: 'unsettled' })
    const settled = await data.listCreditOrders(TENANT, { settlementStatus: 'settled' })

    expect(outstanding.map((order) => order.id)).toEqual([first.id])
    expect(settled.map((order) => order.id)).toEqual([second.id])
  })

  it('refunding an unpaid credit sale never returns cash from the drawer', async () => {
    const product = await seedProduct('MKN-001', 9000, 5000, 10)
    await data.openShift(TENANT, { openingCash: 50000, userId: USER })
    const order = await ringUpCredit(product.id, product)
    await data.closeShift(TENANT, { countedCash: 50000 })

    await data.openShift(TENANT, { openingCash: 40000, userId: USER })
    await data.refundOrder(TENANT, order.id, 'utang dibatalkan')
    const shift = await data.closeShift(TENANT, { countedCash: 40000 })

    expect(shift?.expectedCash).toBe(40000)
    expect(shift?.variance).toBe(0)
  })
})
