/**
 * Orders: checkout, history, void, and refund.
 *
 * Split from the former data.server.ts god-module. Every exported query takes
 * a `tenantId` and filters by it — `scripts/check-tenant-scoping.mjs` scans
 * this directory and fails the build on an unscoped access.
 */

import { and, desc, eq, gte, inArray, or, sql } from 'drizzle-orm'
import { createServerOnlyFn } from '@tanstack/react-start'
import { getDb } from '../../db/client.server'
import { carts, cartItems, counters, orderItems, orders, payments, products, shifts } from '../../db/schema'
import type {
  Order,
  OrderStatus,
  PaymentMethod,
  SalesChannel,
  SettlementPaymentMethod,
} from '../../types'
import { priceCart } from '../../domain/sales/pricing'
import { validatePayment } from '../../domain/sales/payment'
import { RefundRequiredError, canRefund, canSettle, voidDecision } from '../../domain/sales/lifecycle'
import { AppError } from '../../shared/lib/app-error'
import { applyStockDeltaOn } from './stock.server'
import { hydrateOrders, toOrder, ORDER_SEQUENCE_KEY } from './mappers.server'
import type { DbOrTx } from './mappers.server'
/* -------------------------------- orders ------------------------------ */

/** Atomically increments and returns this tenant's next order number. */
async function nextOrderNumber(tenantId: string, db: DbOrTx = getDb()): Promise<string> {
  const rows = await db
    .select()
    .from(counters)
    .where(and(eq(counters.tenantId, tenantId), eq(counters.key, ORDER_SEQUENCE_KEY)))
    .limit(1)
  const next = (rows[0]?.value ?? 0) + 1
  if (rows.length === 0) {
    await db.insert(counters).values({ tenantId, key: ORDER_SEQUENCE_KEY, value: next })
  } else {
    await db
      .update(counters)
      .set({ value: next })
      .where(and(eq(counters.tenantId, tenantId), eq(counters.key, ORDER_SEQUENCE_KEY)))
  }
  return `ORD-${String(next).padStart(3, '0')}`
}

export interface CheckoutCartInput {
  /**
   * Validated discount intent; the server computes the rupiah value against
   * its own subtotal via `priceCart` (percent takes precedence).
   */
  discount: { amount: number; percent: number | null }
  paymentMethod: PaymentMethod
  /** Cash tendered; required for `cash`, ignored otherwise. */
  amountPaid: number | null
  channel: SalesChannel
  cashier?: string
  /** Required for `credit`, ignored otherwise. */
  customerName?: string
}

/**
 * Optional hooks for the asynchronous QRIS flow.
 *
 * `status: 'pending'` reserves stock exactly like a sale but keeps the money
 * rules dormant until the gateway confirms. `payment` is written in the same
 * transaction as the order, so a crash can never leave a payable QR with no
 * order (or an order with no attempt row to reconcile).
 */
export interface CheckoutCartOptions {
  status?: Extract<OrderStatus, 'paid' | 'pending'>
  payment?: { id: string; referenceId: string; expiresAt: string }
}

/**
 * Settles a cart into an order (ADR-0004). The cart is the idempotency key:
 * the first checkout creates the order and marks the cart `checked_out` in
 * the same transaction as the order, line items, and stock movements; a
 * retry against a checked-out cart returns the original order unchanged.
 *
 * Only the caller's *open* cart may be checked out — a parked cart must be
 * resumed first, so payment always matches what the cashier sees on screen.
 */
export const checkoutCart = createServerOnlyFn(
  async (
    tenantId: string,
    userId: string,
    cartId: string,
    input: CheckoutCartInput,
    options: CheckoutCartOptions = {},
  ): Promise<Order> => {
    const db = getDb()
    const cartRows = await db
      .select()
      .from(carts)
      .where(and(eq(carts.id, cartId), eq(carts.tenantId, tenantId), eq(carts.userId, userId)))
      .limit(1)
    const cart = cartRows[0]
    if (!cart) throw new Error('Keranjang tidak ditemukan')
    if (cart.status === 'checked_out') {
      const settled = await db
        .select()
        .from(orders)
        .where(and(eq(orders.cartId, cartId), eq(orders.tenantId, tenantId)))
        .limit(1)
      if (settled[0]) return (await hydrateOrders(settled))[0]
      throw new Error('Keranjang sudah dibayar tetapi pesanannya tidak ditemukan')
    }
    if (cart.status !== 'open') {
      throw new Error('Hanya keranjang aktif yang bisa dibayar; lanjutkan dulu pesanan tertahan')
    }

    const lines = await db.select().from(cartItems).where(eq(cartItems.cartId, cart.id))
    if (lines.length === 0) throw new Error('Keranjang masih kosong')

    return db.transaction(async (tx) => {
      // ADR-0003: the server prices the order. Name, image, price, and HPP all
      // come from the live catalog; the cart's snapshots are display-only.
      const catalog = await tx
        .select()
        .from(products)
        .where(
          and(
            eq(products.tenantId, tenantId),
            inArray(products.id, lines.map((line) => line.productId)),
          ),
        )
      const pricing = priceCart({
        items: lines.map((line) => ({
          productId: line.productId,
          name: line.name,
          imageKey: line.imageKey,
          price: line.price,
          cost: line.cost,
          qty: line.qty,
        })),
        catalog,
        discount: input.discount,
      })
      const missing = pricing.missing[0]
      if (missing) {
        throw new AppError(
          'product-missing',
          `Produk "${missing.name}" sudah tidak ada di katalog; hapus dari keranjang`,
        )
      }

      const { items: priced, subtotal, discount, total, costTotal } = pricing
      const payment = validatePayment({
        paymentMethod: input.paymentMethod,
        total,
        amountPaid: input.amountPaid,
        customerName: input.customerName,
      })
      const customerName = payment.customerName

      const openShiftRows = await tx
        .select({ id: shifts.id })
        .from(shifts)
        .where(and(eq(shifts.tenantId, tenantId), sql`${shifts.closedAt} is null`))
        .limit(1)

      const order: Order = {
        id: crypto.randomUUID(),
        orderNumber: await nextOrderNumber(tenantId, tx),
        createdAt: new Date().toISOString(),
        items: priced,
        subtotal,
        discount,
        total,
        costTotal,
        profit: total - costTotal,
        paymentMethod: input.paymentMethod,
        amountPaid: payment.amountPaid,
        change: payment.change,
        status: options.status ?? 'paid',
        settlementStatus: payment.settlementStatus,
        ...(customerName ? { customerName } : {}),
        channel: input.channel,
        ...(input.cashier ? { cashier: input.cashier } : {}),
        ...(openShiftRows[0] ? { shiftId: openShiftRows[0].id } : {}),
      }

      await tx.insert(orders).values({
        id: order.id,
        tenantId,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        subtotal,
        discount,
        total,
        costTotal,
        profit: order.profit,
        paymentMethod: order.paymentMethod,
        amountPaid: order.amountPaid,
        change: order.change,
        status: order.status,
        customerName: order.customerName ?? null,
        settlementStatus: order.settlementStatus,
        channel: order.channel,
        cashier: order.cashier ?? null,
        shiftId: order.shiftId ?? null,
        userId,
        cartId: cart.id,
      })

      await tx.insert(orderItems).values(
        priced.map((line) => ({
          id: crypto.randomUUID(),
          orderId: order.id,
          productId: line.productId,
          name: line.name,
          imageKey: line.imageKey,
          price: line.price,
          cost: line.cost,
          qty: line.qty,
        })),
      )

      if (options.payment) {
        const now = new Date().toISOString()
        await tx.insert(payments).values({
          id: options.payment.id,
          tenantId,
          orderId: order.id,
          provider: 'xendit',
          referenceId: options.payment.referenceId,
          status: 'creating',
          amount: total,
          expiresAt: options.payment.expiresAt,
          createdAt: now,
          updatedAt: now,
        })
      }

      for (const line of priced) {
        await applyStockDeltaOn(tx, tenantId, {
          productId: line.productId,
          delta: -line.qty,
          reason: 'sale',
          orderId: order.id,
        })
      }

      await tx
        .update(carts)
        .set({
          status: 'checked_out',
          checkedOutAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(and(eq(carts.id, cart.id), eq(carts.tenantId, tenantId)))

      return order
    })
  },
)

export interface ListOrdersOptions {
  /** Inclusive lower bound on `created_at` (ISO string). */
  fromIso?: string
}

export const listOrders = createServerOnlyFn(
  async (tenantId: string, options: ListOrdersOptions = {}): Promise<Order[]> => {
    const rows = await getDb()
      .select()
      .from(orders)
      .where(
        options.fromIso
          ? and(eq(orders.tenantId, tenantId), gte(orders.createdAt, options.fromIso))
          : eq(orders.tenantId, tenantId),
      )
      .orderBy(desc(orders.createdAt))
    return hydrateOrders(rows)
  },
)

/** All orders belonging to one shift, plus refunds booked against it — the
 *  exact input the drawer rule needs, without the cashier's "today" window. */
export const listOrdersForDrawer = createServerOnlyFn(
  async (tenantId: string, shiftId: string): Promise<Order[]> => {
    const rows = await getDb()
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.tenantId, tenantId),
          or(
            eq(orders.shiftId, shiftId),
            eq(orders.refundedInShiftId, shiftId),
            eq(orders.settledInShiftId, shiftId),
          ),
        ),
      )
      .orderBy(desc(orders.createdAt))
    return hydrateOrders(rows)
  },
)

export const getOrderById = createServerOnlyFn(
  async (tenantId: string, id: string): Promise<Order | undefined> => {
    const rows = await getDb()
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)))
      .limit(1)
    if (rows.length === 0) return undefined
    const [order] = await hydrateOrders(rows)
    return order
  },
)

export interface ListCreditOrdersOptions {
  /** `unsettled` is the outstanding debt list; omit for all credit orders. */
  settlementStatus?: 'settled' | 'unsettled'
}

/** Credit (Ngutang) orders, newest first. Used by the debt screen. */
export const listCreditOrders = createServerOnlyFn(
  async (tenantId: string, options: ListCreditOrdersOptions = {}): Promise<Order[]> => {
    const filters = [eq(orders.tenantId, tenantId), eq(orders.paymentMethod, 'credit')]
    if (options.settlementStatus) {
      filters.push(eq(orders.settlementStatus, options.settlementStatus))
    }
    const rows = await getDb()
      .select()
      .from(orders)
      .where(and(...filters))
      .orderBy(desc(orders.createdAt))
    return hydrateOrders(rows)
  },
)

/**
 * Marks a credit order as paid. Full settlement only (the UI is a toggle),
 * and the original `paymentMethod` stays `credit` so reports keep showing how
 * the sale was made; the money side lives in `settledPaymentMethod`.
 *
 * Idempotent: settling an already-settled order returns it unchanged.
 */
export const settleCreditOrder = createServerOnlyFn(
  async (
    tenantId: string,
    id: string,
    input: { method: SettlementPaymentMethod; userId?: string },
  ): Promise<Order | undefined> => {
    const db = getDb()
    const rows = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)))
      .limit(1)
    const existing = rows[0]
    if (!existing) return undefined
    if (existing.paymentMethod !== 'credit') {
      throw new Error('Hanya pesanan ngutang yang bisa ditandai lunas')
    }
    if (existing.status !== 'paid') {
      throw new Error('Pesanan batal atau refund tidak bisa ditandai lunas')
    }
    if (!canSettle(existing)) return (await hydrateOrders(rows))[0]

    const openShiftRows = await db
      .select({ id: shifts.id })
      .from(shifts)
      .where(and(eq(shifts.tenantId, tenantId), sql`${shifts.closedAt} is null`))
      .limit(1)

    return db.transaction(async (tx) => {
      await tx
        .update(orders)
        .set({
          settlementStatus: 'settled',
          settledAt: new Date().toISOString(),
          settledPaymentMethod: input.method,
          // Only a cash settlement reaches a drawer; the shift is recorded
          // for every method so the audit trail is complete.
          settledInShiftId: openShiftRows[0]?.id ?? null,
          settledByUserId: input.userId ?? null,
        })
        .where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)))

      const updated = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)))
        .limit(1)
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, id))
      return toOrder(updated[0], items)
    })
  },
)

/**
 * Idempotent: voiding an already-void order changes nothing and restocks nothing.
 *
 * A void is only possible while the order's shift is still open — the money
 * arguably never left that drawer (ADR-0006). Once the shift has closed, the
 * cancellation is a Refund instead; use `refundOrder`.
 */
export const voidOrder = createServerOnlyFn(
  async (tenantId: string, id: string, reason: string): Promise<Order | undefined> => {
    const db = getDb()
    const rows = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)))
      .limit(1)
    const existing = rows[0]
    if (!existing) return undefined
    if (existing.status === 'void') return (await hydrateOrders(rows))[0]
    if (existing.status === 'refunded') {
      throw new Error('Pesanan sudah dikembalikan dananya; tidak bisa di-void')
    }
    if (existing.shiftId) {
      const shiftRows = await db
        .select({ closedAt: shifts.closedAt })
        .from(shifts)
        .where(and(eq(shifts.id, existing.shiftId), eq(shifts.tenantId, tenantId)))
        .limit(1)
      if (voidDecision(existing, Boolean(shiftRows[0]?.closedAt)) === 'refund') {
        throw new RefundRequiredError()
      }
    }

    // Status flip and restock commit together: a failure mid-restock must not
    // leave a voided order whose inventory is only partly returned.
    return db.transaction(async (tx) => {
      await tx
        .update(orders)
        .set({
          status: 'void' satisfies OrderStatus,
          voidedAt: new Date().toISOString(),
          voidReason: reason.trim() === '' ? null : reason.trim(),
        })
        .where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)))

      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, id))
      for (const item of items) {
        await applyStockDeltaOn(tx, tenantId, {
          productId: item.productId,
          delta: item.qty,
          reason: 'void',
          orderId: id,
        })
      }

      const updated = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)))
        .limit(1)
      return toOrder(updated[0], items)
    })
  },
)

/**
 * Returns money for an order whose shift has already closed (ADR-0006).
 * The refund is booked against the *currently open* shift — the drawer the
 * cash physically leaves — so closing that drawer explains the variance.
 * Restocks tracked inventory like a void does. Idempotent.
 */
export const refundOrder = createServerOnlyFn(
  async (tenantId: string, id: string, reason: string): Promise<Order | undefined> => {
    const db = getDb()
    const rows = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)))
      .limit(1)
    const existing = rows[0]
    if (!existing) return undefined
    if (existing.status === 'refunded') return (await hydrateOrders(rows))[0]
    if (!canRefund(existing)) {
      throw new Error('Hanya pesanan berstatus paid yang bisa di-refund')
    }

    const openShiftRows = await db
      .select({ id: shifts.id })
      .from(shifts)
      .where(and(eq(shifts.tenantId, tenantId), sql`${shifts.closedAt} is null`))
      .limit(1)

    // Same atomicity as voidOrder: status flip and restock commit together.
    return db.transaction(async (tx) => {
      await tx
        .update(orders)
        .set({
          status: 'refunded' satisfies OrderStatus,
          refundedAt: new Date().toISOString(),
          refundReason: reason.trim() === '' ? null : reason.trim(),
          refundedInShiftId: openShiftRows[0]?.id ?? null,
        })
        .where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)))

      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, id))
      for (const item of items) {
        await applyStockDeltaOn(tx, tenantId, {
          productId: item.productId,
          delta: item.qty,
          reason: 'refund',
          orderId: id,
        })
      }

      const updated = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)))
        .limit(1)
      return toOrder(updated[0], items)
    })
  },
)
