import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import * as repo from '~/lib/data.server'
import { requireMembership } from '~/lib/tenant.server'
import { IMAGE_CONTENT_TYPES, createUploadTarget, imageBaseUrl } from '~/lib/r2.server'
import { entityId, productDraftSchema } from '~/lib/validation'
import { deleteReplacedImage, deleteTenantImage, verifyImageKey } from './images.server'
import type { Product, StockMovement } from '~/types'

/**
 * Catalog RPC: products, stock, and product images.
 *
 * Every handler resolves tenant and role from the session cookie. Image keys
 * are verified against tenant ownership before a product stores them.
 */

export const listProductsFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Product[]> => {
    const ctx = await requireMembership('cashier')
    return repo.listProducts(ctx.tenantId)
  },
)

export const createProductFn = createServerFn({ method: 'POST' })
  .validator(productDraftSchema)
  .handler(async ({ data: draft }): Promise<Product> => {
    const ctx = await requireMembership('manager')
    const imageKey = await verifyImageKey(ctx.tenantId, draft.imageKey)
    return repo.createProduct(ctx.tenantId, {
      name: draft.name,
      price: draft.price,
      cost: draft.cost,
      category: draft.category,
      imageKey,
      stock: draft.stock,
      lowStockThreshold: draft.lowStockThreshold,
      sku: draft.sku ?? '',
      barcode: draft.barcode ?? '',
    })
  })

export const updateProductFn = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id: entityId,
      draft: productDraftSchema,
    }),
  )
  .handler(async ({ data: input }): Promise<void> => {
    const ctx = await requireMembership('manager')
    const draft = input.draft
    const imageKey = await verifyImageKey(ctx.tenantId, draft.imageKey)
    const before = (await repo.listProducts(ctx.tenantId)).find((product) => product.id === input.id)
    await repo.updateProduct(ctx.tenantId, input.id, {
      name: draft.name,
      price: draft.price,
      cost: draft.cost,
      category: draft.category,
      imageKey,
      stock: draft.stock,
      lowStockThreshold: draft.lowStockThreshold,
      sku: draft.sku ?? '',
      barcode: draft.barcode ?? '',
    })
    // Clean up the replaced upload once the new key is safely stored. Seed
    // keys are shared and foreign keys are never ours to delete.
    await deleteReplacedImage(ctx.tenantId, before?.imageKey ?? null, imageKey)
  })

export const deleteProductFn = createServerFn({ method: 'POST' })
  .validator(z.object({ id: entityId }))
  .handler(async ({ data: input }): Promise<void> => {
    const ctx = await requireMembership('manager')
    const before = (await repo.listProducts(ctx.tenantId)).find((product) => product.id === input.id)
    await repo.removeProduct(ctx.tenantId, input.id)
    await deleteTenantImage(ctx.tenantId, before?.imageKey ?? null)
  })

/* ---------------------------- product images --------------------------- */

/**
 * Base URL the browser prefixes onto an image key. Safe to expose: it is
 * either this app's origin (the default `/img` proxy) or a public CDN base.
 */
export const getImageBaseUrlFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<string> => imageBaseUrl(),
)

export const getImageUploadUrlFn = createServerFn({ method: 'POST' })
  .validator(z.object({ contentType: z.enum(IMAGE_CONTENT_TYPES) }))
  .handler(async ({ data: input }): Promise<{ key: string; uploadUrl: string }> => {
    const ctx = await requireMembership('manager')
    return createUploadTarget(ctx.tenantId, input.contentType)
  })

/* -------------------------------- stock -------------------------------- */

export const restockProductFn = createServerFn({ method: 'POST' })
  .validator(z.object({ id: entityId, delta: z.number().int().min(1).max(10_000) }))
  .handler(async ({ data: input }): Promise<void> => {
    const ctx = await requireMembership('manager')
    await repo.applyStockDelta(ctx.tenantId, {
      productId: input.id,
      delta: input.delta,
      reason: 'restock',
    })
  })

export const listStockMovementsFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<StockMovement[]> => {
    const ctx = await requireMembership('manager')
    return repo.listStockMovements(ctx.tenantId)
  },
)
