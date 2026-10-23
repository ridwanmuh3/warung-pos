import { beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { resetDatabase } from './helpers/db'

const { getDb } = await import('../src/db/client.server')
const { products, shifts, tenants } = await import('../src/db/schema')
const data = await import('../src/lib/data.server')

const TENANT = 'tenant-import-a'
const OTHER = 'tenant-import-b'

const baseOrder = {
  id: 'order-1',
  orderNumber: 'ORD-1',
  createdAt: '2026-01-01T01:00:00.000Z',
  items: [],
  subtotal: 0,
  discount: 0,
  total: 0,
  costTotal: 0,
  profit: 0,
  paymentMethod: 'tunai' as const,
  amountPaid: null,
  change: null,
  status: 'paid' as const,
  channel: 'dine-in' as const,
}

beforeEach(async () => {
  await resetDatabase()
  const now = new Date().toISOString()
  await getDb().insert(tenants).values([
    { id: TENANT, name: 'Warung A', createdAt: now },
    { id: OTHER, name: 'Warung B', createdAt: now },
  ])
})

describe('legacy import tenant integrity', () => {
  it('rejects a shift reference owned by another tenant', async () => {
    await getDb().insert(shifts).values({
      id: 'foreign-shift',
      tenantId: OTHER,
      openedAt: '2026-01-01T00:00:00.000Z',
      openingCash: 0,
    })

    await expect(
      data.importBatch(TENANT, 'user-a', {
        batchId: 'batch-a',
        products: [],
        orders: [{ ...baseOrder, shiftId: 'foreign-shift' }],
        shifts: [],
        stockMovements: [],
        orderNumberCounter: 0,
      }),
    ).rejects.toThrow('shift yang dirujuk')
  })

  it('rejects a product id collision with another tenant', async () => {
    await getDb().insert(products).values({
      id: 'foreign-product',
      tenantId: OTHER,
      name: 'Produk B',
      price: 1000,
      cost: 0,
      category: 'makanan',
      imageKey: null,
      stock: 1,
      lowStockThreshold: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    await expect(
      data.importBatch(TENANT, 'user-a', {
        batchId: 'batch-b',
        products: [
          {
            id: 'foreign-product',
            name: 'Produk A',
            price: 1000,
            cost: 0,
            category: 'makanan',
            imageKey: null,
            stock: 1,
            lowStockThreshold: 1,
          },
        ],
        orders: [],
        shifts: [],
        stockMovements: [],
        orderNumberCounter: 0,
      }),
    ).rejects.toThrow('milik toko lain')

    const rows = await getDb().select().from(products).where(eq(products.id, 'foreign-product'))
    expect(rows[0]?.tenantId).toBe(OTHER)
  })

  it('rejects a stock movement referencing another tenant product', async () => {
    await getDb().insert(products).values({
      id: 'foreign-product',
      tenantId: OTHER,
      name: 'Produk B',
      price: 1000,
      cost: 0,
      category: 'makanan',
      imageKey: null,
      stock: 1,
      lowStockThreshold: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    await expect(
      data.importBatch(TENANT, 'user-a', {
        batchId: 'batch-c',
        products: [],
        orders: [],
        shifts: [],
        stockMovements: [
          {
            id: 'movement-1',
            productId: 'foreign-product',
            delta: -1,
            reason: 'sale',
            at: '2026-01-01T01:00:00.000Z',
          },
        ],
        orderNumberCounter: 0,
      }),
    ).rejects.toThrow('produk yang dirujuk')
  })
})
