import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import * as data from './data.server'
import type { ImportBatchResult } from './data.server'
import { requireMembership } from './tenant.server'

/**
 * Legacy-migration RPC (Phase 8B).
 *
 * `localStorage` is only readable in the browser, so the client sends the
 * validated bundle. The server never trusts it blindly: the payload is
 * re-validated here, the tenant and role come from the session, and the whole
 * import runs in one transaction with a server-generated batch id.
 */

const itemSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1),
  emoji: z.string(),
  price: z.number().int().min(0),
  qty: z.number().int().min(1),
  cost: z.number().int().min(0),
})

const productSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  price: z.number().int().min(0),
  cost: z.number().int().min(0),
  category: z.enum(['makanan', 'minuman', 'snack']),
  emoji: z.string(),
  stock: z.number().int().nullable(),
  lowStockThreshold: z.number().int().min(0),
  sku: z.string().optional(),
  barcode: z.string().optional(),
})

const orderSchema = z.object({
  id: z.string().min(1),
  orderNumber: z.string().min(1),
  createdAt: z.string(),
  items: z.array(itemSchema),
  subtotal: z.number().int().min(0),
  discount: z.number().int().min(0),
  total: z.number().int().min(0),
  costTotal: z.number().int().min(0),
  profit: z.number().int(),
  paymentMethod: z.enum(['tunai', 'qris', 'transfer']),
  amountPaid: z.number().int().nullable(),
  change: z.number().int().nullable(),
  status: z.enum(['paid', 'void']),
  channel: z.enum(['dine-in', 'bungkus', 'ojol']),
  cashier: z.string().optional(),
  shiftId: z.string().optional(),
  voidedAt: z.string().optional(),
  voidReason: z.string().optional(),
})

const shiftSchema = z.object({
  id: z.string().min(1),
  openedAt: z.string(),
  openingCash: z.number().int().min(0),
  closedAt: z.string().optional(),
  closingCash: z.number().int().optional(),
  expectedCash: z.number().int().optional(),
  variance: z.number().int().optional(),
  note: z.string().optional(),
})

const movementSchema = z.object({
  id: z.string().min(1),
  productId: z.string().min(1),
  delta: z.number().int(),
  reason: z.enum(['sale', 'restock', 'adjust', 'void']),
  at: z.string(),
  orderId: z.string().optional(),
})

const importInputSchema = z.object({
  products: z.array(productSchema),
  orders: z.array(orderSchema),
  shifts: z.array(shiftSchema),
  stockMovements: z.array(movementSchema),
  orderNumberCounter: z.number().int().min(0),
})

export const importLegacyFn = createServerFn({ method: 'POST' })
  .validator(importInputSchema)
  .handler(async ({ data: input }): Promise<ImportBatchResult> => {
    const ctx = await requireMembership('manager')
    return data.importBatch(ctx.tenantId, ctx.userId, {
      batchId: crypto.randomUUID(),
      products: input.products,
      orders: input.orders,
      shifts: input.shifts,
      stockMovements: input.stockMovements,
      orderNumberCounter: input.orderNumberCounter,
    })
  })

export const undoImportFn = createServerFn({ method: 'POST' })
  .validator(z.object({ batchId: z.string().min(1) }))
  .handler(async ({ data: input }): Promise<void> => {
    const ctx = await requireMembership('manager')
    await data.undoImport(ctx.tenantId, input.batchId)
  })
