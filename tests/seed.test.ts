import { beforeEach, describe, expect, it } from 'vitest'
import { resetDatabase } from './helpers/db'

const { getDb } = await import('../src/db/client.server')
const { tenants } = await import('../src/db/schema')
const data = await import('../src/lib/data.server')
const { DEFAULT_PRODUCTS } = await import('../src/data/products')

const TENANT = 'tenant-1'

beforeEach(async () => {
  await resetDatabase()
  await getDb()
    .insert(tenants)
    .values({ id: TENANT, name: 'Warung Uji', createdAt: new Date().toISOString() })
})

describe('seed catalog', () => {
  it('installs every seed product with its image key on a fresh tenant', async () => {
    const products = await data.listProducts(TENANT)

    expect(products).toHaveLength(DEFAULT_PRODUCTS.length)
    for (const seed of DEFAULT_PRODUCTS) {
      const stored = products.find((p) => p.id === seed.id)
      expect(stored?.imageKey).toBe(seed.imageKey)
    }
  })

  it('does not overwrite a catalog that already has rows', async () => {
    await data.createProduct(TENANT, {
      name: 'Kopi',
      price: 5000,
      cost: 3000,
      category: 'minuman',
      imageKey: null,
      stock: 1,
      lowStockThreshold: 5,
    })

    const products = await data.listProducts(TENANT)
    expect(products).toHaveLength(1)
    expect(products[0].name).toBe('Kopi')
  })
})
