import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import * as repo from '~/lib/data.server'
import { requireMembership } from '~/lib/tenant.server'
import {
  entityId,
  openingCashFormSchema,
  openingCashSchema,
  shiftCloseFormSchema,
  shiftCloseSchema,
} from '~/lib/validation'
import { appValidator, withAppHandler } from '~/lib/app-server-fn'
import { startOfDayIso } from '~/domain/time/business-day'
import { AppError } from '~/shared/lib/app-error'
import type { Order, Shift } from '~/types'

/**
 * Shift RPC: open/close the cash drawer and read its orders.
 *
 * Every handler resolves tenant and role from the session cookie. The
 * expected-cash rule itself lives in `domain/shifts/drawer.ts`.
 *
 * Validation failures are thrown as `AppError` with a stable `code` so the
 * client can branch on `code` instead of matching error messages.
 */

export const listShiftsFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Shift[]> => {
    const ctx = await requireMembership('cashier')
    if (ctx.role === 'cashier') {
      return repo.listShifts(ctx.tenantId, {
        fromIso: startOfDayIso(),
        includeOpen: true,
      })
    }
    return repo.listShifts(ctx.tenantId)
  },
)

export const currentShiftFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Shift | undefined> => {
    const ctx = await requireMembership('cashier')
    return repo.getCurrentShift(ctx.tenantId)
  },
)

export const openShiftFn = createServerFn({ method: 'POST' })
  .validator(appValidator(openingCashFormSchema))
  .handler(async ({ data: input }) => {
    return withAppHandler('cashier', async (ctx) => {
      const parsed = openingCashSchema.safeParse(input)
      if (!parsed.success) {
        throw new AppError(
          'invalid-opening-cash',
          parsed.error.issues[0]?.message ?? 'Modal awal tidak valid',
        )
      }
      return repo.openShift(ctx.tenantId, {
        openingCash: parsed.data.openingCash,
        userId: ctx.userId,
      })
    })
  })

/** Orders feeding the drawer's expected-cash display: the open shift's sales
 *  and its refunds, unwindowed (unlike the cashier's today-only order list). */
export const listDrawerOrdersFn = createServerFn({ method: 'GET' })
  .validator(z.object({ shiftId: entityId }))
  .handler(async ({ data: input }): Promise<Order[]> => {
    const ctx = await requireMembership('cashier')
    const shift = await repo.getShiftById(ctx.tenantId, input.shiftId)
    if (!shift) return []
    // A cashier may inspect today's shifts and the still-open shift. Closed
    // historical shifts are manager/owner territory.
    if (ctx.role === 'cashier' && shift.openedAt < startOfDayIso() && shift.closedAt) {
      return []
    }
    return repo.listOrdersForDrawer(ctx.tenantId, input.shiftId)
  })

export const closeShiftFn = createServerFn({ method: 'POST' })
  .validator(appValidator(shiftCloseFormSchema))
  .handler(async ({ data: input }) => {
    return withAppHandler('cashier', async (ctx) => {
      const parsed = shiftCloseSchema.safeParse(input)
      if (!parsed.success) {
        throw new AppError(
          'invalid-closing-cash',
          parsed.error.issues[0]?.message ?? 'Jumlah kas tidak valid',
        )
      }
      return repo.closeShift(ctx.tenantId, {
        countedCash: parsed.data.countedCash,
        note: parsed.data.note,
      })
    })
  })
