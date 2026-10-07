/**
 * Legacy import: localStorage snapshot → tenant rows, batch-tagged and undoable.
 *
 * Split from the former data.server.ts god-module. Every exported query takes
 * a `tenantId` and filters by it — `scripts/check-tenant-scoping.mjs` scans
 * this directory and fails the build on an unscoped access.
 */

import { and, eq } from 'drizzle-orm'
import { createServerOnlyFn } from '@tanstack/react-start'
import { getDb } from '../../db/client.server'
import { counters, orderItems, orders, products, shifts, stockMovements } from '../../db/schema'
import type { OrderItem, OrderStatus, PaymentMethod, ProductCategory, SalesChannel, StockMovementReason } from '../../types'
import { ORDER_SEQUENCE_KEY } from './mappers.server'
/* ----------------------------- legacy import -------------------------- */

export interface ImportProduct {
  id: string
  name: string
  price: number
  cost: number
  category: ProductCategory
  imageKey: string | null
  stock: number | null
  lowStockThreshold: number
  sku?: string
  barcode?: string
}

export interface ImportOrder {
  id: string
  orderNumber: string
  createdAt: string
  items: OrderItem[]
  subtotal: number
  discount: number
  total: number
  costTotal: number
  profit: number
  paymentMethod: PaymentMethod
  amountPaid: number | null
  change: number | null
  status: OrderStatus
  channel: SalesChannel
  cashier?: string
  shiftId?: string
  voidedAt?: string
  voidReason?: string
}

export interface ImportShift {
  id: string
  openedAt: string
  closedAt?: string
  openingCash: number
  closingCash?: number
  expectedCash?: number
  variance?: number
  note?: string
}

export interface ImportStockMovement {
  id: string
  productId: string
  delta: number
  reason: StockMovementReason
  at: string
  orderId?: string
}

export interface LegacyImportInput {
  batchId: string
  products: ImportProduct[]
  orders: ImportOrder[]
  shifts: ImportShift[]
  stockMovements: ImportStockMovement[]
  /** Highest order number seen in the legacy data, as a bare integer. */
  orderNumberCounter: number
}

export interface ImportBatchResult {
  batchId: string
  products: number
  orders: number
  shifts: number
  stockMovements: number
}

/** Parses the numeric part of `ORD-###`; 0 when it does not match. */
export function orderNumberValue(orderNumber: string): number {
  const match = /(\d+)\s*$/.exec(orderNumber)
  return match ? Number(match[1]) : 0
}

/**
 * Imports a legacy localStorage snapshot into one tenant, in a single
 * transaction. Idempotent: original ids are reused as primary keys with
 * `on conflict do nothing`, so running twice changes nothing. Every row is
 * tagged with `importBatchId` so `undoImport` can remove exactly this batch.
 */
export const importBatch = createServerOnlyFn(
  async (
    tenantId: string,
    userId: string,
    input: LegacyImportInput,
  ): Promise<ImportBatchResult> => {
    const db = getDb()
    const now = new Date().toISOString()

    return db.transaction(async (tx) => {
      let productCount = 0
      if (input.products.length > 0) {
        const inserted = await tx
          .insert(products)
          .values(
            input.products.map((item) => ({
              id: item.id,
              tenantId,
              name: item.name,
              price: item.price,
              cost: item.cost,
              category: item.category,
              imageKey: item.imageKey,
              stock: item.stock,
              lowStockThreshold: item.lowStockThreshold,
              sku: item.sku ?? null,
              barcode: item.barcode ?? null,
              importBatchId: input.batchId,
              createdAt: now,
              updatedAt: now,
            })),
          )
          .onConflictDoNothing()
          .returning({ id: products.id })
        productCount = inserted.length
      }

      let orderCount = 0
      for (const order of input.orders) {
        const inserted = await tx
          .insert(orders)
          .values({
            id: order.id,
            tenantId,
            orderNumber: order.orderNumber,
            createdAt: order.createdAt,
            subtotal: order.subtotal,
            discount: order.discount,
            total: order.total,
            costTotal: order.costTotal,
            profit: order.profit,
            paymentMethod: order.paymentMethod,
            amountPaid: order.amountPaid,
            change: order.change,
            status: order.status,
            channel: order.channel,
            cashier: order.cashier ?? null,
            shiftId: order.shiftId ?? null,
            voidedAt: order.voidedAt ?? null,
            voidReason: order.voidReason ?? null,
            userId,
            importBatchId: input.batchId,
          })
          .onConflictDoNothing()
          .returning({ id: orders.id })
        if (inserted.length === 0) continue
        orderCount += 1
        if (order.items.length > 0) {
          await tx.insert(orderItems).values(
            order.items.map((item) => ({
              id: crypto.randomUUID(),
              orderId: order.id,
              productId: item.productId,
              name: item.name,
              imageKey: item.imageKey,
              price: item.price,
              cost: item.cost,
              qty: item.qty,
            })),
          )
        }
      }

      let shiftCount = 0
      if (input.shifts.length > 0) {
        const inserted = await tx
          .insert(shifts)
          .values(
            input.shifts.map((shift) => ({
              id: shift.id,
              tenantId,
              openedAt: shift.openedAt,
              closedAt: shift.closedAt ?? null,
              openingCash: shift.openingCash,
              closingCash: shift.closingCash ?? null,
              expectedCash: shift.expectedCash ?? null,
              variance: shift.variance ?? null,
              note: shift.note ?? null,
              userId,
              importBatchId: input.batchId,
            })),
          )
          .onConflictDoNothing()
          .returning({ id: shifts.id })
        shiftCount = inserted.length
      }

      let movementCount = 0
      if (input.stockMovements.length > 0) {
        const inserted = await tx
          .insert(stockMovements)
          .values(
            input.stockMovements.map((movement) => ({
              id: movement.id,
              tenantId,
              productId: movement.productId,
              delta: movement.delta,
              reason: movement.reason,
              at: movement.at,
              orderId: movement.orderId ?? null,
              importBatchId: input.batchId,
            })),
          )
          .onConflictDoNothing()
          .returning({ id: stockMovements.id })
        movementCount = inserted.length
      }

      // Never reuse a number: keep the counter at the highest legacy value.
      const orderNumberCounter = Math.max(
        input.orderNumberCounter,
        ...input.orders.map((order) => orderNumberValue(order.orderNumber)),
        0,
      )
      const counterRows = await tx
        .select()
        .from(counters)
        .where(and(eq(counters.tenantId, tenantId), eq(counters.key, ORDER_SEQUENCE_KEY)))
        .limit(1)
      const nextCounter = Math.max(counterRows[0]?.value ?? 0, orderNumberCounter)
      if (counterRows.length === 0) {
        await tx.insert(counters).values({
          tenantId,
          key: ORDER_SEQUENCE_KEY,
          value: nextCounter,
        })
      } else {
        await tx
          .update(counters)
          .set({ value: nextCounter })
          .where(and(eq(counters.tenantId, tenantId), eq(counters.key, ORDER_SEQUENCE_KEY)))
      }

      return {
        batchId: input.batchId,
        products: productCount,
        orders: orderCount,
        shifts: shiftCount,
        stockMovements: movementCount,
      }
    })
  },
)

/** Removes every row that came from one import batch. */
export const undoImport = createServerOnlyFn(
  async (tenantId: string, batchId: string): Promise<void> => {
    const db = getDb()
    await db.transaction(async (tx) => {
      await tx.delete(orders).where(and(eq(orders.tenantId, tenantId), eq(orders.importBatchId, batchId)))
      await tx.delete(shifts).where(and(eq(shifts.tenantId, tenantId), eq(shifts.importBatchId, batchId)))
      await tx
        .delete(stockMovements)
        .where(and(eq(stockMovements.tenantId, tenantId), eq(stockMovements.importBatchId, batchId)))
      await tx
        .delete(products)
        .where(and(eq(products.tenantId, tenantId), eq(products.importBatchId, batchId)))
    })
  },
)

export type { ProductCategory }
