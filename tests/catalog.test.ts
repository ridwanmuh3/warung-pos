import { beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { resetDatabase } from './helpers/db'

const { getDb } = await import('../src/db/client.server')
const { products, tenants } = await import('../src/db/schema')
const data = await import('../src/lib/data.server')

const TENANT = 'tenant-empty'

beforeEach(async () => {
  await resetDatabase()
  await getDb()
    .insert(tenants)
    .values({ id: TENANT, name: 'Warung Baru', createdAt: new Date().toISOString() })
})

describe('catalog without sample data', () => {
  it('starts empty and writes nothing on the first read', async () => {
    expect(await data.listProducts(TENANT)).toEqual([])

    const rows = await getDb().select().from(products).where(eq(products.tenantId, TENANT))
    expect(rows).toHaveLength(0)
  })

  it('returns only the rows that belong to the requested tenant', async () => {
    const otherTenant = 'tenant-other'
    await getDb()
      .insert(tenants)
      .values({ id: otherTenant, name: 'Warung Lain', createdAt: new Date().toISOString() })

    await data.createProduct(TENANT, {
      name: 'Kopi',
      price: 5000,
      cost: 3000,
      category: 'drink',
      imageKey: null,
      stock: 10,
      lowStockThreshold: 5,
    })
    await data.createProduct(otherTenant, {
      name: 'Teh',
      price: 4000,
      cost: 2000,
      category: 'drink',
      imageKey: null,
      stock: 10,
      lowStockThreshold: 5,
    })

    const listed = await data.listProducts(TENANT)
    expect(listed).toHaveLength(1)
    expect(listed[0].name).toBe('Kopi')
  })
})
