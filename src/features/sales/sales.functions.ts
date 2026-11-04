import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import * as repo from '~/lib/data.server'
import { requireMembership } from '~/lib/tenant.server'
import { entityId, noteText, settlementPaymentMethod } from '~/lib/validation'
import { RefundRequiredError } from '~/domain/sales/lifecycle'
import type { VoidOutcome } from '~/domain/sales/lifecycle'
import type { Order } from '~/types'

/**
 * Sales-history RPC: list, receipt, void, refund, and credit settlement.
 *
 * Every handler resolves tenant and role from the session cookie. The void
 * call returns a typed outcome for the one expected failure — a closed drawer
 * means the cancellation is a refund (ADR-0006) — so the client never branches
 * on a user-facing message.
 */

/** Local start-of-day, as an ISO string, for the cashier's "today only" view. */
function startOfTodayIso(): string {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  return start.toISOString()
}

export const listOrdersFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Order[]> => {
    const ctx = await requireMembership('cashier')
    // Cashiers only see today's orders; managers and owners see all history.
    const options = ctx.role === 'cashier' ? { fromIso: startOfTodayIso() } : {}
    return repo.listOrders(ctx.tenantId, options)
  },
)

export const getOrderFn = createServerFn({ method: 'GET' })
  .validator(z.object({ id: entityId }))
  .handler(async ({ data: input }): Promise<Order | undefined> => {
    const ctx = await requireMembership('cashier')
    // A wrong tenant simply has no such order: an id leak reveals nothing.
    const order = await repo.getOrderById(ctx.tenantId, input.id)
    if (!order || ctx.role !== 'cashier') return order

    // The debt screen shows every credit order, including those from older
    // days, so its receipts must stay openable past the today-only window.
    if (order.paymentMethod === 'credit' && order.status === 'paid') return order

    // The cashier's "today only" rule is a server boundary, not just a UI
    // filter. Keep the current shift visible when it opened before midnight.
    if (order.createdAt >= startOfTodayIso()) return order
    const current = await repo.getCurrentShift(ctx.tenantId)
    return current && order.shiftId === current.id ? order : undefined
  })

/** Every credit order for the debt screen; the client splits unpaid/paid. */
export const listCreditOrdersFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Order[]> => {
    const ctx = await requireMembership('cashier')
    return repo.listCreditOrders(ctx.tenantId)
  },
)

/** Marks a credit order as fully paid. */
export const settleCreditOrderFn = createServerFn({ method: 'POST' })
  .validator(z.object({ id: entityId, method: settlementPaymentMethod }))
  .handler(async ({ data: input }): Promise<Order | undefined> => {
    const ctx = await requireMembership('cashier')
    return repo.settleCreditOrder(ctx.tenantId, input.id, {
      method: input.method,
      userId: ctx.userId,
    })
  })

/** The expected failure is a value: a closed drawer means "refund instead". */
export type VoidOrderResult = VoidOutcome | { kind: 'not-found' }

export const voidOrderFn = createServerFn({ method: 'POST' })
  .validator(z.object({ id: entityId, reason: noteText }))
  .handler(async ({ data: input }): Promise<VoidOrderResult> => {
    const ctx = await requireMembership('manager')
    try {
      const order = await repo.voidOrder(ctx.tenantId, input.id, input.reason ?? '')
      return order ? { kind: 'voided', order } : { kind: 'not-found' }
    } catch (cause) {
      if (!(cause instanceof RefundRequiredError)) throw cause
      const order = await repo.getOrderById(ctx.tenantId, input.id)
      return order ? { kind: 'refund-required', order } : { kind: 'not-found' }
    }
  })

export type RefundOrderResult =
  | { kind: 'refunded'; order: Order }
  | { kind: 'not-found' }

/** Returns money for an order whose shift has closed (ADR-0006). */
export const refundOrderFn = createServerFn({ method: 'POST' })
  .validator(z.object({ id: entityId, reason: noteText }))
  .handler(async ({ data: input }): Promise<RefundOrderResult> => {
    const ctx = await requireMembership('manager')
    const order = await repo.refundOrder(ctx.tenantId, input.id, input.reason ?? '')
    return order ? { kind: 'refunded', order } : { kind: 'not-found' }
  })
