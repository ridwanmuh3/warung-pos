/**
 * Row → domain mappers and shared hydration helpers.
 *
 * Split from the former data.server.ts god-module. Every exported query takes
 * a `tenantId` and filters by it — `scripts/check-tenant-scoping.mjs` scans
 * this directory and fails the build on an unscoped access.
 */

import { eq, inArray } from 'drizzle-orm'
import { getDb } from '../../db/client.server'
import type { AppDatabase } from '../../db/client.server'
import { cartItems, carts, orderItems, orders, products, shifts } from '../../db/schema'
import type { Cart, Order, OrderItem, Product, Shift } from '../../types'

/** A database handle: the client itself or a transaction inside it. */
export type DbOrTx = AppDatabase | Parameters<Parameters<AppDatabase['transaction']>[0]>[0]

export const ORDER_SEQUENCE_KEY = 'order_number'
/* ------------------------------- mapping ------------------------------ */

export type ProductRow = typeof products.$inferSelect

export function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    cost: row.cost,
    category: row.category,
    emoji: row.emoji,
    stock: row.stock,
    lowStockThreshold: row.lowStockThreshold,
    ...(row.sku ? { sku: row.sku } : {}),
    ...(row.barcode ? { barcode: row.barcode } : {}),
  }
}

export type OrderRow = typeof orders.$inferSelect
export type OrderItemRow = typeof orderItems.$inferSelect

export function toLineItem(row: { productId: string; name: string; emoji: string; price: number; qty: number; cost: number }): OrderItem {
  return {
    productId: row.productId,
    name: row.name,
    emoji: row.emoji,
    price: row.price,
    qty: row.qty,
    cost: row.cost,
  }
}

export function toOrder(row: OrderRow, items: OrderItemRow[]): Order {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    createdAt: row.createdAt,
    items: items.map(toLineItem),
    subtotal: row.subtotal,
    discount: row.discount,
    total: row.total,
    costTotal: row.costTotal,
    profit: row.profit,
    paymentMethod: row.paymentMethod,
    amountPaid: row.amountPaid,
    change: row.change,
    status: row.status,
    channel: row.channel,
    ...(row.cashier ? { cashier: row.cashier } : {}),
    ...(row.shiftId ? { shiftId: row.shiftId } : {}),
    ...(row.voidedAt ? { voidedAt: row.voidedAt } : {}),
    ...(row.voidReason ? { voidReason: row.voidReason } : {}),
    ...(row.refundedAt ? { refundedAt: row.refundedAt } : {}),
    ...(row.refundReason ? { refundReason: row.refundReason } : {}),
    ...(row.refundedInShiftId ? { refundedInShiftId: row.refundedInShiftId } : {}),
  }
}

export type ShiftRow = typeof shifts.$inferSelect

export function toShift(row: ShiftRow): Shift {
  return {
    id: row.id,
    openedAt: row.openedAt,
    openingCash: row.openingCash,
    ...(row.closedAt ? { closedAt: row.closedAt } : {}),
    ...(row.closingCash !== null ? { closingCash: row.closingCash } : {}),
    ...(row.expectedCash !== null ? { expectedCash: row.expectedCash } : {}),
    ...(row.variance !== null ? { variance: row.variance } : {}),
    ...(row.note ? { note: row.note } : {}),
  }
}

export type CartRow = typeof carts.$inferSelect
export type CartItemRow = typeof cartItems.$inferSelect

/** Alias kept for call-site clarity; same snapshot shape as order items. */
const toCartItem = toLineItem

export function toCart(row: CartRow, items: CartItemRow[]): Cart {
  return {
    id: row.id,
    status: row.status,
    ...(row.label ? { label: row.label } : {}),
    items: items.map(toCartItem),
    updatedAt: row.updatedAt,
  }
}

/** Attaches line items to a batch of orders with a single follow-up query. */
export async function hydrateOrders(rows: OrderRow[]): Promise<Order[]> {
  if (rows.length === 0) return []
  const items = await getDb()
    .select()
    .from(orderItems)
    .where(inArray(orderItems.orderId, rows.map((row) => row.id)))
  const byOrder = new Map<string, OrderItemRow[]>()
  for (const item of items) {
    const bucket = byOrder.get(item.orderId)
    if (bucket) bucket.push(item)
    else byOrder.set(item.orderId, [item])
  }
  return rows.map((row) => toOrder(row, byOrder.get(row.id) ?? []))
}

export async function hydrateCart(row: CartRow | undefined): Promise<Cart | undefined> {
  if (!row) return undefined
  const items = await getDb().select().from(cartItems).where(eq(cartItems.cartId, row.id))
  return toCart(row, items)
}
