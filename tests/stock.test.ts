import { beforeEach, describe, expect, it } from 'vitest'
import { resetDatabase } from './helpers/db'

const { getDb } = await import('../src/db/client.server')
const { tenants } = await import('../src/db/schema')
const data = await import('../src/lib/data.server')

const TENANT = 'tenant-1'

async function seedTenant(id = TENANT): Promise<void> {
  await getDb()
    .insert(tenants)
    .values({ id, name: 'Warung Uji', createdAt: new Date().toISOString() })
}

function productDraft(overrides: Partial<Parameters<typeof data.createProduct>[1]> = {}) {
  return {
    name: 'Kopi Tubruk',
    price: 5000,
    cost: 3000,
    category: 'minuman' as const,
    imageKey: null,
    stock: 2,
    lowStockThreshold: 5,
    ...overrides,
  }
}

beforeEach(async () => {
  await resetDatabase()
  await seedTenant()
})

describe('oversell policy: warn-and-allow (ADR-0005)', () => {
  it('selling more than on-hand drives stock negative, not zero', async () => {
    const product = await data.createProduct(TENANT, productDraft({ stock: 2 }))

    await data.applyStockDelta(TENANT, {
      productId: product.id,
      delta: -5,
      reason: 'sale',
    })

    const [after] = await data.listProducts(TENANT)
    expect(after.stock).toBe(-3)
  })

  it('records the true delta in the ledger, so movements reconcile with on-hand', async () => {
    const product = await data.createProduct(TENANT, productDraft({ stock: 2 }))

    await data.applyStockDelta(TENANT, {
      productId: product.id,
      delta: -5,
      reason: 'sale',
    })

    const movements = await data.listStockMovements(TENANT)
    expect(movements).toHaveLength(1)
    expect(movements[0].delta).toBe(-5)
  })

  it('restocking absorbs a deficit naturally', async () => {
    const product = await data.createProduct(TENANT, productDraft({ stock: 2 }))
    await data.applyStockDelta(TENANT, { productId: product.id, delta: -5, reason: 'sale' })

    await data.applyStockDelta(TENANT, {
      productId: product.id,
      delta: 10,
      reason: 'restock',
    })

    const [after] = await data.listProducts(TENANT)
    expect(after.stock).toBe(7)
  })

  it('leaves untracked products untracked', async () => {
    const product = await data.createProduct(TENANT, productDraft({ stock: null }))

    await data.applyStockDelta(TENANT, {
      productId: product.id,
      delta: -5,
      reason: 'sale',
    })

    const [after] = await data.listProducts(TENANT)
    expect(after.stock).toBeNull()
  })
})
