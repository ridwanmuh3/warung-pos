import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import * as data from './data.server'
import { requireMembership } from './tenant.server'
import {
  checkoutFormSchema,
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
    return data.createProduct(ctx.tenantId, {
      name: draft.name,
      price: draft.price,
      cost: draft.cost,
      category: draft.category,
      emoji: draft.emoji,
      stock: draft.stock,
      lowStockThreshold: draft.lowStockThreshold,
      sku: draft.sku ?? '',
      barcode: draft.barcode ?? '',
    })
  })

export const updateProductFn = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id: z.string().min(1),
      draft: productDraftSchema,
    }),
  )
  .handler(async ({ data: input }): Promise<void> => {
    const ctx = await requireMembership('manager')
    const draft = input.draft
    await data.updateProduct(ctx.tenantId, input.id, {
      name: draft.name,
      price: draft.price,
      cost: draft.cost,
      category: draft.category,
      emoji: draft.emoji,
      stock: draft.stock,
      lowStockThreshold: draft.lowStockThreshold,
      sku: draft.sku ?? '',
      barcode: draft.barcode ?? '',
    })
  })

export const deleteProductFn = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data: input }): Promise<void> => {
    const ctx = await requireMembership('manager')
    await data.removeProduct(ctx.tenantId, input.id)
  })

export const restockProductFn = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().min(1), delta: z.number().int().min(1).max(10_000) }))
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

/** Restores the seed catalog. Only inserts when the tenant's catalog is empty. */
export const seedProductsFn = createServerFn({ method: 'POST' }).handler(
  async (): Promise<number> => {
    const ctx = await requireMembership('manager')
    const { DEFAULT_PRODUCTS } = await import('../data/products')
    return data.seedProductsIfEmpty(ctx.tenantId, DEFAULT_PRODUCTS)
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
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data: input }): Promise<Order | undefined> => {
    const ctx = await requireMembership('cashier')
    // A wrong tenant simply has no such order: an id leak reveals nothing.
    return data.getOrderById(ctx.tenantId, input.id)
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
      amountPaid: checkout.paymentMethod === 'tunai' ? checkout.cashTendered : null,
      channel: checkout.channel,
      cashier: checkout.cashier ?? '',
    })
  })

export const voidOrderFn = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().min(1), reason: z.string().max(240) }))
  .handler(async ({ data: input }): Promise<Order | undefined> => {
    const ctx = await requireMembership('manager')
    return data.voidOrder(ctx.tenantId, input.id, input.reason)
  })

/** Returns money for an order whose shift has closed (ADR-0006). */
export const refundOrderFn = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().min(1), reason: z.string().max(240) }))
  .handler(async ({ data: input }): Promise<Order | undefined> => {
    const ctx = await requireMembership('manager')
    return data.refundOrder(ctx.tenantId, input.id, input.reason)
  })

/* -------------------------------- shifts ------------------------------ */

export const listShiftsFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Shift[]> => {
    const ctx = await requireMembership('cashier')
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
  .validator(z.object({ shiftId: z.string().min(1) }))
  .handler(async ({ data: input }): Promise<Order[]> => {
    const ctx = await requireMembership('cashier')
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
