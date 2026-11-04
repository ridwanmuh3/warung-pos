import { beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { resetDatabase } from './helpers/db'

const { getDb } = await import('../src/db/client.server')
const { orderItems, products, shifts, stockMovements, tenants, users } = await import(
  '../src/db/schema'
)
const data = await import('../src/lib/data.server')

/**
 * The tenant invariant, exercised against two real tenants.
 *
 * Repository functions take `tenantId` explicitly, so these tests pass the
 * *other* tenant's id into every read and mutation. If a tenant filter is ever
 * dropped, one of these assertions fails instead of leaking data in production.
 */

const A = 'tenant-a'
const B = 'tenant-b'
const USER = 'user-shared'

beforeEach(async () => {
  await resetDatabase()
  const now = new Date().toISOString()
  await getDb()
    .insert(tenants)
    .values([
      { id: A, name: 'Warung A', createdAt: now },
      { id: B, name: 'Warung B', createdAt: now },
    ])
  await getDb()
    .insert(users)
    .values({
      id: USER,
      name: 'Kasir Uji',
      email: 'kasir@uji.id',
      passwordHash: 'x',
      salt: 'x',
      createdAt: now,
    })
})

function productInput(name: string, overrides: { price?: number; stock?: number | null } = {}) {
  return {
    name,
    price: overrides.price ?? 10000,
    cost: 6000,
    category: 'food' as const,
    imageKey: null,
    stock: overrides.stock === undefined ? 10 : overrides.stock,
    lowStockThreshold: 5,
  }
}

async function seedProduct(tenantId: string, name: string, overrides = {}) {
  return data.createProduct(tenantId, productInput(name, overrides))
}

/** Checks out a one-line cart, leaving a real order and its child rows behind. */
async function seedOrder(
  tenantId: string,
  options: { paymentMethod?: 'cash' | 'credit'; customerName?: string } = {},
) {
  const paymentMethod = options.paymentMethod ?? 'cash'
  const product = await seedProduct(tenantId, `Produk ${tenantId}`)
  const cart = await data.saveCart(tenantId, USER, [
    {
      productId: product.id,
      name: product.name,
      imageKey: product.imageKey,
      price: product.price,
      cost: product.cost,
      qty: 1,
    },
  ])
  return data.checkoutCart(tenantId, USER, cart.id, {
    discount: { amount: 0, percent: null },
    paymentMethod,
    amountPaid: paymentMethod === 'cash' ? 20000 : null,
    channel: 'dine-in',
    ...(options.customerName ? { customerName: options.customerName } : {}),
  })
}

describe('products', () => {
  it('lists and mutates only rows of the requested tenant', async () => {
    const own = await seedProduct(A, 'Milik A')
    const other = await seedProduct(B, 'Milik B')

    expect((await data.listProducts(A)).map((product) => product.id)).toEqual([own.id])
    expect((await data.listProducts(B)).map((product) => product.id)).toEqual([other.id])

    await data.updateProduct(A, other.id, { name: 'Dibajak', price: 1 })
    await data.removeProduct(A, other.id)

    const rows = await getDb().select().from(products).where(eq(products.tenantId, B))
    expect(rows).toHaveLength(1)
    expect(rows[0].name).toBe('Milik B')
  })
})

describe('shifts', () => {
  it('cannot read or close the other tenant drawer', async () => {
    const own = await data.openShift(A, { openingCash: 10000 })
    const other = await data.openShift(B, { openingCash: 20000 })

    expect((await data.listShifts(A)).map((shift) => shift.id)).toEqual([own.id])
    expect(await data.getShiftById(A, other.id)).toBeUndefined()

    const closed = await data.closeShift(A, { countedCash: 10000 })
    expect(closed?.id).toBe(own.id)

    const otherRows = await getDb().select().from(shifts).where(eq(shifts.tenantId, B))
    expect(otherRows[0].closedAt).toBeNull()
    expect((await data.getCurrentShift(B))?.id).toBe(other.id)
  })
})

describe('carts', () => {
  it('keeps open and parked carts inside their tenant', async () => {
    const ownProduct = await seedProduct(A, 'Milik A')
    const otherProduct = await seedProduct(B, 'Milik B')
    const line = (product: typeof ownProduct) => ({
      productId: product.id,
      name: product.name,
      imageKey: product.imageKey,
      price: product.price,
      cost: product.cost,
      qty: 1,
    })

    const ownCart = await data.saveCart(A, USER, [line(ownProduct)])
    await data.saveCart(B, USER, [line(otherProduct)])
    await data.parkCart(B, USER, 'Meja B')
    const parkedOther = (await data.listParkedCarts(B, USER))[0]

    expect(await data.listParkedCarts(A, USER)).toEqual([])
    expect(await data.resumeCart(A, USER, parkedOther.id)).toBeUndefined()

    await data.deleteCart(A, USER, parkedOther.id)
    expect((await data.listParkedCarts(B, USER)).map((cart) => cart.id)).toEqual([parkedOther.id])

    const openInA = await data.getOpenCart(A, USER)
    expect(openInA?.id).toBe(ownCart.id)
    expect(openInA?.items.map((item) => item.productId)).toEqual([ownProduct.id])
  })
})

describe('orders and child items', () => {
  it('cannot read, void, or refund another tenant order', async () => {
    const other = await seedOrder(B)
    const otherItems = await getDb()
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, other.id))
    expect(otherItems.length).toBeGreaterThan(0)

    expect((await data.listOrders(A)).map((order) => order.id)).toEqual([])
    expect(await data.getOrderById(A, other.id)).toBeUndefined()
    expect(await data.voidOrder(A, other.id, 'salah toko')).toBeUndefined()
    expect(await data.refundOrder(A, other.id, 'salah toko')).toBeUndefined()

    const stillPaid = await data.getOrderById(B, other.id)
    expect(stillPaid?.status).toBe('paid')
    expect(stillPaid?.items).toHaveLength(1)
  })
})

describe('credit settlement', () => {
  it('cannot settle another tenant credit order', async () => {
    const other = await seedOrder(B, { paymentMethod: 'credit', customerName: 'Bu B' })

    expect(await data.settleCreditOrder(A, other.id, { method: 'cash' })).toBeUndefined()

    const outstanding = await data.listCreditOrders(B, { settlementStatus: 'unsettled' })
    expect(outstanding.map((order) => order.id)).toEqual([other.id])
    expect(outstanding[0].settlementStatus).toBe('unsettled')
    expect(await data.listCreditOrders(A)).toEqual([])
  })
})

describe('stock', () => {
  it('does not adjust or record stock for another tenant product', async () => {
    const own = await seedProduct(A, 'Milik A', { stock: 10 })
    const other = await seedProduct(B, 'Milik B', { stock: 10 })

    await data.applyStockDelta(A, { productId: other.id, delta: 5, reason: 'restock' })
    expect((await data.listProducts(B))[0].stock).toBe(10)
    expect(await data.listStockMovements(A)).toEqual([])

    await data.applyStockDelta(A, { productId: own.id, delta: 5, reason: 'restock' })
    expect((await data.listProducts(A))[0].stock).toBe(15)
    const movements = await data.listStockMovements(A)
    expect(movements.map((movement) => movement.productId)).toEqual([own.id])
    expect(await data.listStockMovements(B)).toEqual([])

    const otherLedger = await getDb()
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.tenantId, B))
    expect(otherLedger).toEqual([])
  })
})
