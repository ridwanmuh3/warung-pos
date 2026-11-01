import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import * as data from './data.server'
import { requireMembership } from './tenant.server'
import { IMAGE_CONTENT_TYPES, createUploadTarget, deleteObject, imageBaseUrl, objectExists } from './r2.server'
import {
  checkoutFormSchema,
  entityId,
  noteText,
  openingCashFormSchema,
  openingCashSchema,
  parseCheckoutForm,
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
 */

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

/* -------------------------------- orders ------------------------------ */

export const listOrdersFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Order[]> => {
    const ctx = await requireMembership('cashier')
    // Cashiers only see today's orders; managers and owners see all history.
    const options = ctx.role === 'cashier' ? { fromIso: startOfTodayIso() } : {}
    return data.listOrders(ctx.tenantId, options)
  },
)

export const getOrderFn = createServerFn({ method: 'GET' })
  .validator(z.object({ id: entityId }))
  .handler(async ({ data: input }): Promise<Order | undefined> => {
    const ctx = await requireMembership('cashier')
    // A wrong tenant simply has no such order: an id leak reveals nothing.
    const order = await data.getOrderById(ctx.tenantId, input.id)
    if (!order || ctx.role !== 'cashier') return order

    // The cashier's "today only" rule is a server boundary, not just a UI
    // filter. Keep the current shift visible when it opened before midnight.
    if (order.createdAt >= startOfTodayIso()) return order
    const current = await data.getCurrentShift(ctx.tenantId)
    return current && order.shiftId === current.id ? order : undefined
  })

/**
 * Settles the caller's open server cart (ADR-0003/0004). The client sends no
 * cart id, no items, and no prices: the server finds the open cart, prices it
 * from the live catalog, computes totals and change itself, and settles the
 * cart exactly once. The checkout form payload is still re-validated here so
 * a crafted request cannot bypass the input rules the UI applies.
 */
export const checkoutFn = createServerFn({ method: 'POST' })
  .validator(z.object({ checkout: checkoutFormSchema }))
  .handler(async ({ data: input }): Promise<Order> => {
    const ctx = await requireMembership('cashier')
    const cart = await data.getOpenCart(ctx.tenantId, ctx.userId)
    if (!cart || cart.items.length === 0) {
      throw new Error('Keranjang masih kosong')
    }
    const checkout = parseCheckoutForm(input.checkout)
    // The validated discount intent travels; the rupiah value is computed
    // server-side against the server's own subtotal (ADR-0003).
    return data.checkoutCart(ctx.tenantId, ctx.userId, cart.id, {
      discount: { amount: checkout.discountAmount, percent: checkout.discountPercent },
      paymentMethod: checkout.paymentMethod,
      amountPaid: checkout.paymentMethod === 'cash' ? checkout.cashTendered : null,
      channel: checkout.channel,
      cashier: checkout.cashier ?? '',
    })
  })

export const voidOrderFn = createServerFn({ method: 'POST' })
  .validator(z.object({ id: entityId, reason: noteText }))
  .handler(async ({ data: input }): Promise<Order | undefined> => {
    const ctx = await requireMembership('manager')
    return data.voidOrder(ctx.tenantId, input.id, input.reason ?? '')
  })

/** Returns money for an order whose shift has closed (ADR-0006). */
export const refundOrderFn = createServerFn({ method: 'POST' })
  .validator(z.object({ id: entityId, reason: noteText }))
  .handler(async ({ data: input }): Promise<Order | undefined> => {
    const ctx = await requireMembership('manager')
    return data.refundOrder(ctx.tenantId, input.id, input.reason ?? '')
  })

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
