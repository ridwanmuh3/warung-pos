/**
 * Products: the tenant catalog.
 *
 * Split from the former data.server.ts god-module. Every exported query takes
 * a `tenantId` and filters by it — `scripts/check-tenant-scoping.mjs` scans
 * this directory and fails the build on an unscoped access.
 */

import { and, eq } from 'drizzle-orm'
import { createServerOnlyFn } from '@tanstack/react-start'
import { getDb } from '../../db/client.server'
import { products } from '../../db/schema'
import type { Product } from '../../types'
import { toProduct } from './mappers.server'
/* ------------------------------- products ----------------------------- */

export const listProducts = createServerOnlyFn(async (tenantId: string): Promise<Product[]> => {
  const db = getDb()
  const rows = await db.select().from(products).where(eq(products.tenantId, tenantId))
  if (rows.length > 0) return rows.map(toProduct)

  // Fresh shop: install the seed catalog so the cashier is usable immediately.
  // Only ever runs while this tenant's catalog is empty.
  const { DEFAULT_PRODUCTS } = await import('../../data/products')
  await seedProductsIfEmpty(tenantId, DEFAULT_PRODUCTS)
  const seeded = await db.select().from(products).where(eq(products.tenantId, tenantId))
  return seeded.map(toProduct)
})

export const createProduct = createServerOnlyFn(
  async (tenantId: string, input: Omit<Product, 'id'>): Promise<Product> => {
    const now = new Date().toISOString()
    const product: Product = { ...input, id: crypto.randomUUID() }
    await getDb()
      .insert(products)
      .values({
        id: product.id,
        tenantId,
        name: product.name,
        price: product.price,
        cost: product.cost,
        category: product.category,
        emoji: product.emoji,
        stock: product.stock,
        lowStockThreshold: product.lowStockThreshold,
        sku: product.sku ?? null,
        barcode: product.barcode ?? null,
        createdAt: now,
        updatedAt: now,
      })
    return product
  },
)

export const updateProduct = createServerOnlyFn(
  async (tenantId: string, id: string, changes: Partial<Omit<Product, 'id'>>): Promise<void> => {
    const values: Partial<typeof products.$inferInsert> = { updatedAt: new Date().toISOString() }
    if (changes.name !== undefined) values.name = changes.name
    if (changes.price !== undefined) values.price = changes.price
    if (changes.cost !== undefined) values.cost = changes.cost
    if (changes.category !== undefined) values.category = changes.category
    if (changes.emoji !== undefined) values.emoji = changes.emoji
    if (changes.stock !== undefined) values.stock = changes.stock
    if (changes.lowStockThreshold !== undefined) values.lowStockThreshold = changes.lowStockThreshold
    if (changes.sku !== undefined) values.sku = changes.sku === '' ? null : changes.sku
    if (changes.barcode !== undefined) values.barcode = changes.barcode === '' ? null : changes.barcode
    await getDb()
      .update(products)
      .set(values)
      .where(and(eq(products.id, id), eq(products.tenantId, tenantId)))
  },
)

export const removeProduct = createServerOnlyFn(
  async (tenantId: string, id: string): Promise<void> => {
    await getDb()
      .delete(products)
      .where(and(eq(products.id, id), eq(products.tenantId, tenantId)))
  },
)

/** Seeds a tenant's catalog only when that tenant has no products yet. */
export const seedProductsIfEmpty = createServerOnlyFn(
  async (
    tenantId: string,
    seed: Array<Omit<Product, 'id'> & { id: string }>,
  ): Promise<number> => {
    const db = getDb()
    const existing = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.tenantId, tenantId))
      .limit(1)
    if (existing.length > 0) return 0
    const now = new Date().toISOString()
    await db.insert(products).values(
      seed.map((item) => ({
        id: item.id,
        tenantId,
        name: item.name,
        price: item.price,
        cost: item.cost,
        category: item.category,
        emoji: item.emoji,
        stock: item.stock,
        lowStockThreshold: item.lowStockThreshold,
        sku: item.sku ?? null,
        barcode: item.barcode ?? null,
        createdAt: now,
        updatedAt: now,
      })),
    )
    return seed.length
  },
)
