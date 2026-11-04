import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import * as data from './data.server'
import { requireMembership } from './tenant.server'
import { IMAGE_CONTENT_TYPES, createUploadTarget, deleteObject, imageBaseUrl, objectExists } from './r2.server'
import {
  entityId,
  openingCashFormSchema,
  openingCashSchema,
  productDraftSchema,
  shiftCloseFormSchema,
  shiftCloseSchema,
} from './validation'
import type { Order, Product, Shift, StockMovement } from '../types'

/**
 * Typed data RPC.
 *
 * Every handler first resolves the caller's **tenant and role** from the
 * encrypted session cookie (`requireMembership`). The client never sends a
 * tenant id, so a crafted request cannot reach another shop's data; and a role
 * that is too low is rejected here, not merely hidden in the UI.
 *
 * Checkout now lives in `features/checkout`; it is re-exported here so existing
 * imports keep working until the facade is deleted.
 */
export { checkoutFn } from '../features/checkout/checkout.functions'

/** Local start-of-day, as an ISO string, for the cashier's "today only" view. */
function startOfTodayIso(): string {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  return start.toISOString()
}

/* ------------------------------- products ----------------------------- */

export const listProductsFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Product[]> => {
    const ctx = await requireMembership('cashier')
    return data.listProducts(ctx.tenantId)
  },
)

export const createProductFn = createServerFn({ method: 'POST' })
  .validator(productDraftSchema)
  .handler(async ({ data: draft }): Promise<Product> => {
    const ctx = await requireMembership('manager')
    const imageKey = await verifiedImageKey(ctx.tenantId, draft.imageKey)
    return data.createProduct(ctx.tenantId, {
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
    const imageKey = await verifiedImageKey(ctx.tenantId, draft.imageKey)
    const before = (await data.listProducts(ctx.tenantId)).find((product) => product.id === input.id)
    await data.updateProduct(ctx.tenantId, input.id, {
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
    // Clean up the replaced upload once the new key is safely stored.
    // ponytail: only `products/<tenantId>/` keys are deleted; seed keys are shared.
    const oldKey = before?.imageKey
    if (oldKey && oldKey !== imageKey && oldKey.startsWith(`products/${ctx.tenantId}/`)) {
      await deleteObject(oldKey)
    }
  })

export const deleteProductFn = createServerFn({ method: 'POST' })
  .validator(z.object({ id: entityId }))
  .handler(async ({ data: input }): Promise<void> => {
    const ctx = await requireMembership('manager')
    const before = (await data.listProducts(ctx.tenantId)).find((product) => product.id === input.id)
    await data.removeProduct(ctx.tenantId, input.id)
    if (before?.imageKey?.startsWith(`products/${ctx.tenantId}/`)) {
      await deleteObject(before.imageKey)
    }
  })

/* ---------------------------- product images --------------------------- */

/**
 * Image keys the server will store: null, a shared `seed/` key, or a verified
 * upload owned by this tenant. Any other key is rejected so a crafted request
 * cannot point a product at another tenant's object.
 */
async function verifiedImageKey(tenantId: string, key: string | null): Promise<string | null> {
  if (key === null) return null
  if (key.startsWith('seed/')) return key
  if (!key.startsWith(`products/${tenantId}/`) || !(await objectExists(key))) {
    throw new Error('Gambar tidak ditemukan di penyimpanan; unggah ulang')
  }
  return key
}

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

export const restockProductFn = createServerFn({ method: 'POST' })
  .validator(z.object({ id: entityId, delta: z.number().int().min(1).max(10_000) }))
  .handler(async ({ data: input }): Promise<void> => {
    const ctx = await requireMembership('manager')
    await data.applyStockDelta(ctx.tenantId, {
      productId: input.id,
      delta: input.delta,
      reason: 'restock',
    })
  })

export const listStockMovementsFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<StockMovement[]> => {
    const ctx = await requireMembership('manager')
    return data.listStockMovements(ctx.tenantId)
  },
)

/* -------------------------------- sales ------------------------------- */

/**
 * Sales history now lives in `features/sales`; re-exported here so existing
 * imports keep working until this facade is deleted.
 */
export {
  getOrderFn,
  listCreditOrdersFn,
  listOrdersFn,
  refundOrderFn,
  settleCreditOrderFn,
  voidOrderFn,
} from '../features/sales/sales.functions'
export type {
  RefundOrderResult,
  VoidOrderResult,
} from '../features/sales/sales.functions'

/* -------------------------------- shifts ------------------------------ */

export const listShiftsFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Shift[]> => {
    const ctx = await requireMembership('cashier')
    if (ctx.role === 'cashier') {
      return data.listShifts(ctx.tenantId, {
        fromIso: startOfTodayIso(),
        includeOpen: true,
      })
    }
    return data.listShifts(ctx.tenantId)
  },
)

export const currentShiftFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Shift | undefined> => {
    const ctx = await requireMembership('cashier')
    return data.getCurrentShift(ctx.tenantId)
  },
)

export const openShiftFn = createServerFn({ method: 'POST' })
  .validator(openingCashFormSchema)
  .handler(async ({ data: input }): Promise<Shift> => {
    const ctx = await requireMembership('cashier')
    const parsed = openingCashSchema.safeParse(input)
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Modal awal tidak valid')
    return data.openShift(ctx.tenantId, {
      openingCash: parsed.data.openingCash,
      userId: ctx.userId,
    })
  })

/** Orders feeding the drawer's expected-cash display: the open shift's sales
 *  and its refunds, unwindowed (unlike the cashier's today-only order list). */
export const listDrawerOrdersFn = createServerFn({ method: 'GET' })
  .validator(z.object({ shiftId: entityId }))
  .handler(async ({ data: input }): Promise<Order[]> => {
    const ctx = await requireMembership('cashier')
    const shift = await data.getShiftById(ctx.tenantId, input.shiftId)
    if (!shift) return []
    // A cashier may inspect today's shifts and the still-open shift. Closed
    // historical shifts are manager/owner territory.
    if (ctx.role === 'cashier' && shift.openedAt < startOfTodayIso() && shift.closedAt) {
      return []
    }
    return data.listOrdersForDrawer(ctx.tenantId, input.shiftId)
  })

export const closeShiftFn = createServerFn({ method: 'POST' })
  .validator(shiftCloseFormSchema)
  .handler(async ({ data: input }): Promise<Shift | undefined> => {
    const ctx = await requireMembership('cashier')
    const parsed = shiftCloseSchema.safeParse(input)
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Jumlah kas tidak valid')
    return data.closeShift(ctx.tenantId, {
      countedCash: parsed.data.countedCash,
      note: parsed.data.note,
    })
  })
