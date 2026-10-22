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

/**
 * A tenant's catalog, and only that tenant's rows.
 *
 * Deliberately does **not** seed a sample catalog. A new shop starts empty and
 * the owner adds its real products; sample data in a live catalog can be sold,
 * pollute reports, and cannot be removed cleanly afterwards (ADR-0007).
 */
export const listProducts = createServerOnlyFn(async (tenantId: string): Promise<Product[]> => {
  const rows = await getDb()
    .select()
    .from(products)
    .where(eq(products.tenantId, tenantId))
  return rows.map(toProduct)
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
        imageKey: product.imageKey,
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
    if (changes.imageKey !== undefined) values.imageKey = changes.imageKey
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
