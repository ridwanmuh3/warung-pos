import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import * as data from './data.server'
import { readSessionUserId } from './session.server'
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
 * Every export is a `createServerFn`, so the client only ever sees an RPC stub —
 * the SQL and the database credentials stay on the server. Inputs are validated
 * with the same schemas the forms use, so a hand-crafted request cannot bypass
 * the UI rules.
 */

/* ------------------------------- products ----------------------------- */

export const listProductsFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Product[]> => data.listProducts(),
)

export const createProductFn = createServerFn({ method: 'POST' })
  .validator(productDraftSchema)
  .handler(async ({ data: draft }): Promise<Product> =>
    data.createProduct({
      name: draft.name,
      price: draft.price,
      cost: draft.cost,
      category: draft.category,
      emoji: draft.emoji,
      stock: draft.stock,
      lowStockThreshold: draft.lowStockThreshold,
      sku: draft.sku ?? '',
      barcode: draft.barcode ?? '',
    }),
  )

export const updateProductFn = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id: z.string().min(1),
      draft: productDraftSchema,
    }),
  )
  .handler(async ({ data: input }): Promise<void> => {
    const draft = input.draft
    await data.updateProduct(input.id, {
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
    await data.removeProduct(input.id)
  })

export const restockProductFn = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().min(1), delta: z.number().int().min(1).max(10_000) }))
  .handler(async ({ data: input }): Promise<void> => {
    await data.applyStockDelta({ productId: input.id, delta: input.delta, reason: 'restock' })
  })

export const listStockMovementsFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<StockMovement[]> => data.listStockMovements(),
)

/** Restores the seed catalog. Only inserts when the table is empty. */
export const seedProductsFn = createServerFn({ method: 'POST' }).handler(
  async (): Promise<number> => {
    const { DEFAULT_PRODUCTS } = await import('../data/products')
    return data.seedProductsIfEmpty(DEFAULT_PRODUCTS)
  },
)

/* -------------------------------- orders ------------------------------ */

const orderItemSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1),
  emoji: z.string(),
  price: z.number().int().min(0),
  qty: z.number().int().min(1),
  cost: z.number().int().min(0),
})

export const listOrdersFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Order[]> => data.listOrders(),
)

export const getOrderFn = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data: input }): Promise<Order | undefined> => data.getOrderById(input.id))

export const createOrderFn = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      items: z.array(orderItemSchema).min(1, 'Keranjang masih kosong'),
      discount: z.number().int().min(0),
      checkout: checkoutFormSchema,
    }),
  )
  .handler(async ({ data: input }): Promise<Order> => {
    // The raw form payload is re-validated here with the domain schema, so a
    // crafted request cannot bypass the rules the UI applies.
    const checkout = parseCheckoutForm(input.checkout)
    // The signed-in user is read from the encrypted cookie, never from the
    // request body, so a client cannot claim to be someone else.
    const userId = (await readSessionUserId()) ?? undefined
    return data.createOrder({
      items: input.items,
      discount: input.discount,
      paymentMethod: checkout.paymentMethod,
      amountPaid: checkout.paymentMethod === 'tunai' ? checkout.cashTendered : null,
      change:
        checkout.paymentMethod === 'tunai' ? (checkout.cashTendered ?? 0) - checkout.total : null,
      channel: checkout.channel,
      cashier: checkout.cashier ?? '',
      ...(userId ? { userId } : {}),
    })
  })

export const voidOrderFn = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().min(1), reason: z.string().max(240) }))
  .handler(async ({ data: input }): Promise<Order | undefined> =>
    data.voidOrder(input.id, input.reason),
  )

/* -------------------------------- shifts ------------------------------ */

export const listShiftsFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Shift[]> => data.listShifts(),
)

export const currentShiftFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Shift | undefined> => data.getCurrentShift(),
)

export const openShiftFn = createServerFn({ method: 'POST' })
  .validator(openingCashFormSchema)
  .handler(async ({ data: input }): Promise<Shift> => {
    const parsed = openingCashSchema.safeParse(input)
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Modal awal tidak valid')
    const userId = (await readSessionUserId()) ?? undefined
    return data.openShift({ openingCash: parsed.data.openingCash, ...(userId ? { userId } : {}) })
  })

export const closeShiftFn = createServerFn({ method: 'POST' })
  .validator(shiftCloseFormSchema)
  .handler(async ({ data: input }): Promise<Shift | undefined> => {
    const parsed = shiftCloseSchema.safeParse(input)
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Jumlah kas tidak valid')
    return data.closeShift({ countedCash: parsed.data.countedCash, note: parsed.data.note })
  })
