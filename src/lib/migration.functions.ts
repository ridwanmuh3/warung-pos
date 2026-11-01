import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import * as data from './data.server'
import type { ImportBatchResult } from './data.server'
import { requireMembership } from './tenant.server'
import {
  cleanText,
  entityId,
  imageKeySchema,
  MAX_LINE_ITEMS,
  noteText,
  orderItemSchema,
  paymentMethod,
  productCategory,
  requiredText,
  rupiah,
  salesChannel,
  skuCode,
  barcodeCode,
} from './validation'

/**
 * Legacy-migration RPC (Phase 8B).
 *
 * `localStorage` is only readable in the browser, so the client sends the
 * validated bundle. The server never trusts it blindly: the payload is
 * re-validated here, the tenant and role come from the session, and the whole
 * import runs in one transaction with a server-generated batch id.
 *
 * Imported arrays are capped and every id/string is bounded. Image keys are
 * re-homed to this tenant (or dropped) and cross-tenant shift references are
 * rejected before the transaction starts.
 */

const MAX_MONEY = 1_000_000_000

/** Signed money: profit and drawer variance may legitimately be negative. */
const signedMoney = z.number().int().min(-MAX_MONEY).max(MAX_MONEY)

/** ISO timestamp; `Date.parse` is deliberately permissive for old exports. */
const isoDate = z
  .string()
  .max(40, 'Tanggal terlalu panjang')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Tanggal tidak valid')

const legacyId = entityId

/** `ORD-###` larger than the counter bound would overflow SQLite integers. */
const orderNumber = requiredText(64, 'Nomor pesanan wajib diisi').refine((value) => {
  const match = /(\d+)\s*$/.exec(value)
  return !match || Number(match[1]) <= MAX_MONEY
}, 'Nomor pesanan terlalu besar')

const legacyOrderItemSchema = orderItemSchema.extend({
  // Legacy keys are checked and re-homed in the handler, not by the wire
  // schema, so a stale foreign key cannot abort an otherwise valid import.
  imageKey: z.string().max(200).nullable(),
})

const productSchema = z.object({
  id: legacyId,
  name: requiredText(120, 'Nama produk wajib diisi'),
  price: rupiah,
  cost: rupiah,
  category: productCategory,
  imageKey: z.string().max(200).nullable(),
  stock: z.number().int().min(0).max(MAX_MONEY).nullable(),
  lowStockThreshold: rupiah,
  sku: skuCode.optional(),
  barcode: barcodeCode.optional(),
})

const orderSchema = z.object({
  id: legacyId,
  orderNumber,
  createdAt: isoDate,
  items: z.array(legacyOrderItemSchema).max(MAX_LINE_ITEMS, 'Terlalu banyak item'),
  subtotal: rupiah,
  discount: rupiah,
  total: rupiah,
  costTotal: rupiah,
  profit: signedMoney,
  paymentMethod,
  amountPaid: signedMoney.nullable(),
  change: signedMoney.nullable(),
  status: z.enum(['paid', 'void', 'refunded']),
  channel: salesChannel,
  cashier: cleanText(60).optional(),
  shiftId: legacyId.optional(),
  voidedAt: isoDate.optional(),
  voidReason: noteText.optional(),
})

const shiftSchema = z.object({
  id: legacyId,
  openedAt: isoDate,
  openingCash: rupiah,
  closedAt: isoDate.optional(),
  closingCash: signedMoney.optional(),
  expectedCash: signedMoney.optional(),
  variance: signedMoney.optional(),
  note: noteText.optional(),
})

const movementSchema = z.object({
  id: legacyId,
  productId: legacyId,
  delta: signedMoney,
  reason: z.enum(['sale', 'restock', 'adjust', 'void', 'refund']),
  at: isoDate,
  orderId: legacyId.optional(),
})

const importInputSchema = z
  .object({
    products: z.array(productSchema).max(5_000, 'Terlalu banyak produk'),
    orders: z.array(orderSchema).max(20_000, 'Terlalu banyak pesanan'),
    shifts: z.array(shiftSchema).max(5_000, 'Terlalu banyak shift'),
    stockMovements: z.array(movementSchema).max(50_000, 'Terlalu banyak mutasi stok'),
    orderNumberCounter: z.number().int().min(0).max(MAX_MONEY),
  })
  .superRefine((input, ctx) => {
    const itemCount = input.orders.reduce((sum, order) => sum + order.items.length, 0)
    if (itemCount > 50_000) {
      ctx.addIssue({ code: 'custom', message: 'Terlalu banyak baris item impor' })
    }
  })

/**
 * Keep only image keys the importing tenant is allowed to read. A stale key
 * from another shop (or an unsafe path) is replaced with the placeholder.
 */
function rehomeImageKey(key: string | null, tenantId: string): string | null {
  if (key === null) return null
  const parsed = imageKeySchema.safeParse(key)
  if (!parsed.success || parsed.data === null) return null
  if (parsed.data.startsWith('seed/')) return parsed.data
  return parsed.data.startsWith(`products/${tenantId}/`) ? parsed.data : null
}

export const importLegacyFn = createServerFn({ method: 'POST' })
  .validator(importInputSchema)
  .handler(async ({ data: input }): Promise<ImportBatchResult> => {
    const ctx = await requireMembership('manager')

    const [existingShifts, existingProducts] = await Promise.all([
      data.listShifts(ctx.tenantId),
      data.listProducts(ctx.tenantId),
    ])
    const shiftIds = new Set([...existingShifts.map((shift) => shift.id), ...input.shifts.map((shift) => shift.id)])
    const productIds = new Set([
      ...existingProducts.map((product) => product.id),
      ...input.products.map((product) => product.id),
    ])

    for (const order of input.orders) {
      if (order.shiftId !== undefined && !shiftIds.has(order.shiftId)) {
        throw new Error('Pesanan impor merujuk shift yang bukan milik toko ini')
      }
    }
    for (const movement of input.stockMovements) {
      if (!productIds.has(movement.productId)) {
        throw new Error('Mutasi stok impor merujuk produk yang tidak ada di toko ini')
      }
    }

    return data.importBatch(ctx.tenantId, ctx.userId, {
      batchId: crypto.randomUUID(),
      products: input.products.map((product) => ({
        ...product,
        imageKey: rehomeImageKey(product.imageKey, ctx.tenantId),
      })),
      orders: input.orders.map((order) => ({
        ...order,
        items: order.items.map((item) => ({
          ...item,
          imageKey: rehomeImageKey(item.imageKey, ctx.tenantId),
        })),
      })),
      shifts: input.shifts,
      stockMovements: input.stockMovements,
      orderNumberCounter: input.orderNumberCounter,
    })
  })

export const undoImportFn = createServerFn({ method: 'POST' })
  .validator(z.object({ batchId: entityId }))
  .handler(async ({ data: input }): Promise<void> => {
    const ctx = await requireMembership('manager')
    await data.undoImport(ctx.tenantId, input.batchId)
  })
