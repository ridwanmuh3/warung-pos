/**
 * Stock: the append-only movement ledger and on-hand cache.
 *
 * Split from the former data.server.ts god-module. Every exported query takes
 * a `tenantId` and filters by it — `scripts/check-tenant-scoping.mjs` scans
 * this directory and fails the build on an unscoped access.
 */

import { and, desc, eq } from 'drizzle-orm'
import { createServerOnlyFn } from '@tanstack/react-start'
import { getDb } from '../../db/client.server'
import { products, stockMovements } from '../../db/schema'
import type { StockMovement, StockMovementReason } from '../../types'
import type { DbOrTx } from './mappers.server'
/* -------------------------------- stock ------------------------------- */

export const listStockMovements = createServerOnlyFn(
  async (tenantId: string, limit = 200): Promise<StockMovement[]> => {
    const rows = await getDb()
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.tenantId, tenantId))
      .orderBy(desc(stockMovements.at))
      .limit(limit)
    return rows.map((row) => ({
      id: row.id,
      productId: row.productId,
      delta: row.delta,
      reason: row.reason,
      at: row.at,
      ...(row.orderId ? { orderId: row.orderId } : {}),
    }))
  },
)

/**
 * Applies a delta to one product and records the movement.
 * Oversell is warn-and-allow (ADR-0005): on-hand may go negative so the
 * ledger always reconciles with `products.stock`. Scoped by tenant.
 */
export async function applyStockDeltaOn(
  db: DbOrTx,
  tenantId: string,
  input: {
    productId: string
    delta: number
    reason: StockMovementReason
    orderId?: string
  },
): Promise<void> {
  const rows = await db
    .select({ stock: products.stock })
    .from(products)
    .where(and(eq(products.id, input.productId), eq(products.tenantId, tenantId)))
    .limit(1)
  const current = rows[0]
  if (!current || current.stock === null) return

  await db
    .update(products)
    .set({
      stock: current.stock + input.delta,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(products.id, input.productId), eq(products.tenantId, tenantId)))

  await db.insert(stockMovements).values({
    id: crypto.randomUUID(),
    tenantId,
    productId: input.productId,
    delta: input.delta,
    reason: input.reason,
    at: new Date().toISOString(),
    orderId: input.orderId ?? null,
  })
}

export const applyStockDelta = createServerOnlyFn(
  async (
    tenantId: string,
    input: {
      productId: string
      delta: number
      reason: StockMovementReason
      orderId?: string
    },
  ): Promise<void> => {
    return applyStockDeltaOn(getDb(), tenantId, input)
  },
)
