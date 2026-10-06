/**
 * Shifts: the shared cash drawer session (ADR-0002).
 *
 * Split from the former data.server.ts god-module. Every exported query takes
 * a `tenantId` and filters by it — `scripts/check-tenant-scoping.mjs` scans
 * this directory and fails the build on an unscoped access.
 */

import { and, desc, eq, or, sql } from 'drizzle-orm'
import { createServerOnlyFn } from '@tanstack/react-start'
import { getDb } from '../../db/client.server'
import { orders, shifts } from '../../db/schema'
import type { Shift } from '../../types'
import { expectedDrawerCash } from '../cashDrawer'
import { toShift } from './mappers.server'
/* -------------------------------- shifts ------------------------------ */

export const listShifts = createServerOnlyFn(async (tenantId: string): Promise<Shift[]> => {
  const rows = await getDb()
    .select()
    .from(shifts)
    .where(eq(shifts.tenantId, tenantId))
    .orderBy(desc(shifts.openedAt))
  return rows.map(toShift)
})

export const getCurrentShift = createServerOnlyFn(
  async (tenantId: string): Promise<Shift | undefined> => {
    const rows = await getDb()
      .select()
      .from(shifts)
      .where(and(eq(shifts.tenantId, tenantId), sql`${shifts.closedAt} is null`))
      .limit(1)
    return rows[0] ? toShift(rows[0]) : undefined
  },
)

export const openShift = createServerOnlyFn(
  async (tenantId: string, input: { openingCash: number; userId?: string }): Promise<Shift> => {
    const db = getDb()
    const existing = await db
      .select()
      .from(shifts)
      .where(and(eq(shifts.tenantId, tenantId), sql`${shifts.closedAt} is null`))
      .limit(1)
    if (existing[0]) return toShift(existing[0])

    const shift: Shift = {
      id: crypto.randomUUID(),
      openedAt: new Date().toISOString(),
      openingCash: Math.max(0, Math.round(input.openingCash)),
    }
    await db.insert(shifts).values({
      id: shift.id,
      tenantId,
      openedAt: shift.openedAt,
      openingCash: shift.openingCash,
      userId: input.userId ?? null,
    })
    return shift
  },
)

export const closeShift = createServerOnlyFn(
  async (
    tenantId: string,
    input: { countedCash: number; note?: string },
  ): Promise<Shift | undefined> => {
    const db = getDb()
    const openRows = await db
      .select()
      .from(shifts)
      .where(and(eq(shifts.tenantId, tenantId), sql`${shifts.closedAt} is null`))
      .limit(1)
    const open = openRows[0]
    if (!open) return undefined

    // The drawer rule lives in cashDrawer.ts and is shared with the cashier's
    // live display: float + cash sales − cash voids − refunds paid from this
    // drawer. One query fetches both this shift's orders and the refunds
    // booked against it.
    const drawerOrders = await db
      .select({
        total: orders.total,
        status: orders.status,
        paymentMethod: orders.paymentMethod,
        shiftId: orders.shiftId,
        refundedInShiftId: orders.refundedInShiftId,
      })
      .from(orders)
      .where(
        and(
          eq(orders.tenantId, tenantId),
          or(eq(orders.shiftId, open.id), eq(orders.refundedInShiftId, open.id)),
        ),
      )
    const expectedCash = expectedDrawerCash({
      openingCash: open.openingCash,
      orders: drawerOrders.map((row) => ({
        total: row.total,
        status: row.status,
        paymentMethod: row.paymentMethod,
        ...(row.shiftId ? { shiftId: row.shiftId } : {}),
        ...(row.refundedInShiftId ? { refundedInShiftId: row.refundedInShiftId } : {}),
      })),
      shiftId: open.id,
    })
    const counted = Math.max(0, Math.round(input.countedCash))

    await db
      .update(shifts)
      .set({
        closedAt: new Date().toISOString(),
        closingCash: counted,
        expectedCash,
        variance: counted - expectedCash,
        note: input.note?.trim() ? input.note.trim() : null,
      })
      .where(and(eq(shifts.id, open.id), eq(shifts.tenantId, tenantId)))

    const updated = await db
      .select()
      .from(shifts)
      .where(and(eq(shifts.id, open.id), eq(shifts.tenantId, tenantId)))
      .limit(1)
    return updated[0] ? toShift(updated[0]) : undefined
  },
)
