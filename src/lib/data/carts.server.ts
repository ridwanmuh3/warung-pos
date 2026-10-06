/**
 * Carts: the server-side basket (open / parked / checked_out).
 *
 * Split from the former data.server.ts god-module. Every exported query takes
 * a `tenantId` and filters by it — `scripts/check-tenant-scoping.mjs` scans
 * this directory and fails the build on an unscoped access.
 */

import { and, desc, eq, inArray } from 'drizzle-orm'
import { createServerOnlyFn } from '@tanstack/react-start'
import { getDb } from '../../db/client.server'
import { cartItems, carts } from '../../db/schema'
import type { Cart, OrderItem } from '../../types'
import { hydrateCart, toCart } from './mappers.server'
import type { CartRow, CartItemRow } from './mappers.server'
/* --------------------------------- carts ------------------------------ */

export async function findOpenCart(tenantId: string, userId: string): Promise<CartRow | undefined> {
  const rows = await getDb()
    .select()
    .from(carts)
    .where(
      and(eq(carts.tenantId, tenantId), eq(carts.userId, userId), eq(carts.status, 'open')),
    )
    .limit(1)
  return rows[0]
}

export const getOpenCart = createServerOnlyFn(
  async (tenantId: string, userId: string): Promise<Cart | undefined> => {
    return hydrateCart(await findOpenCart(tenantId, userId))
  },
)

/**
 * Replaces the open cart's items wholesale. Last write wins. An empty save
 * removes the cart row: empty open carts are clutter, and the post-checkout
 * clear would otherwise leave one behind after every sale.
 */
export const saveCart = createServerOnlyFn(
  async (tenantId: string, userId: string, items: OrderItem[]): Promise<Cart> => {
    const db = getDb()
    const now = new Date().toISOString()
    const existing = await findOpenCart(tenantId, userId)

    if (items.length === 0) {
      if (existing) {
        await db
          .delete(carts)
          .where(and(eq(carts.id, existing.id), eq(carts.tenantId, tenantId)))
      }
      return { id: existing?.id ?? '', status: 'open', items: [], updatedAt: now }
    }

    const cartId = existing?.id ?? crypto.randomUUID()

    if (!existing) {
      await db.insert(carts).values({
        id: cartId,
        tenantId,
        userId,
        status: 'open',
        createdAt: now,
        updatedAt: now,
      })
    }

    await db.delete(cartItems).where(eq(cartItems.cartId, cartId))
    await db.insert(cartItems).values(
      items.map((item) => ({
        id: crypto.randomUUID(),
        cartId,
        productId: item.productId,
        name: item.name,
        emoji: item.emoji,
        price: item.price,
        cost: item.cost,
        qty: item.qty,
        updatedAt: now,
      })),
    )
    await db
      .update(carts)
      .set({ updatedAt: now })
      .where(and(eq(carts.id, cartId), eq(carts.tenantId, tenantId)))

    const rows = await db
      .select()
      .from(carts)
      .where(and(eq(carts.id, cartId), eq(carts.tenantId, tenantId)))
      .limit(1)
    const saved = await hydrateCart(rows[0])
    return saved ?? { id: cartId, status: 'open', items: [...items], updatedAt: now }
  },
)

export const listParkedCarts = createServerOnlyFn(
  async (tenantId: string, userId: string): Promise<Cart[]> => {
    const db = getDb()
    const rows = await db
      .select()
      .from(carts)
      .where(
        and(eq(carts.tenantId, tenantId), eq(carts.userId, userId), eq(carts.status, 'parked')),
      )
      .orderBy(desc(carts.updatedAt))
    if (rows.length === 0) return []
    const items = await db
      .select()
      .from(cartItems)
      .where(inArray(cartItems.cartId, rows.map((row) => row.id)))
    const byCart = new Map<string, CartItemRow[]>()
    for (const item of items) {
      const bucket = byCart.get(item.cartId)
      if (bucket) bucket.push(item)
      else byCart.set(item.cartId, [item])
    }
    return rows.map((row) => toCart(row, byCart.get(row.id) ?? []))
  },
)

/** Parks the open cart under a label so the cashier can start a new one. */
export const parkCart = createServerOnlyFn(
  async (tenantId: string, userId: string, label?: string): Promise<void> => {
    const db = getDb()
    const open = await findOpenCart(tenantId, userId)
    if (!open) return
    const hasItems = await db
      .select({ id: cartItems.id })
      .from(cartItems)
      .where(eq(cartItems.cartId, open.id))
      .limit(1)
    if (hasItems.length === 0) {
      // An empty cart is not worth parking.
      await db
        .delete(carts)
        .where(and(eq(carts.id, open.id), eq(carts.tenantId, tenantId)))
      return
    }
    await db
      .update(carts)
      .set({
        status: 'parked',
        label: label?.trim() ? label.trim() : null,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(carts.id, open.id), eq(carts.tenantId, tenantId)))
  },
)

/** Brings a parked cart back as the open one, parking the current open cart. */
export const resumeCart = createServerOnlyFn(
  async (tenantId: string, userId: string, cartId: string): Promise<Cart | undefined> => {
    const db = getDb()
    const rows = await db
      .select()
      .from(carts)
      .where(
        and(
          eq(carts.id, cartId),
          eq(carts.tenantId, tenantId),
          eq(carts.userId, userId),
          // Only a parked cart can be resumed; a checked-out cart is terminal (ADR-0004).
          eq(carts.status, 'parked'),
        ),
      )
      .limit(1)
    const target = rows[0]
    if (!target) return undefined

    const open = await findOpenCart(tenantId, userId)
    if (open && open.id !== target.id) {
      const openItems = await db
        .select({ id: cartItems.id })
        .from(cartItems)
        .where(eq(cartItems.cartId, open.id))
        .limit(1)
      if (openItems.length === 0) {
        // Drop an empty open cart instead of leaving clutter behind.
        await db
          .delete(carts)
          .where(and(eq(carts.id, open.id), eq(carts.tenantId, tenantId)))
      } else {
        await db
          .update(carts)
          .set({ status: 'parked', updatedAt: new Date().toISOString() })
          .where(and(eq(carts.id, open.id), eq(carts.tenantId, tenantId)))
      }
    }
    await db
      .update(carts)
      .set({ status: 'open', label: null, updatedAt: new Date().toISOString() })
      .where(and(eq(carts.id, target.id), eq(carts.tenantId, tenantId)))
    return hydrateCart(target)
  },
)

export const deleteCart = createServerOnlyFn(
  async (tenantId: string, userId: string, cartId: string): Promise<void> => {
    await getDb()
      .delete(carts)
      .where(
        and(eq(carts.id, cartId), eq(carts.tenantId, tenantId), eq(carts.userId, userId)),
      )
  },
)
