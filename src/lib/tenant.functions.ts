import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { readSessionTenantId, readSessionUserId, writeSessionTenantId } from './session.server'
import type { MemberRow, MembershipSummary, Role, TenantContext } from './tenant.server'
import {
  addMemberByEmail,
  listMemberships,
  listTenantMembers,
  findMembership,
  requireMembership,
  updateMemberRole,
} from './tenant.server'
import { email as emailSchema } from './validation'

/** Tenant/role RPC. The client only ever *reads* its role and *asks* to switch. */

const roleSchema = z.enum(['owner', 'manager', 'cashier'])

export const tenantContextFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<TenantContext | null> => {
    try {
      const ctx = await requireMembership('cashier')
      return ctx
    } catch {
      return null
    }
  },
)

export const listMembershipsFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<MembershipSummary[]> => {
    const userId = await readSessionUserId()
    if (!userId) return []
    return listMemberships(userId)
  },
)

/** Switches the active shop, but only to a tenant the caller is a member of. */
export const switchTenantFn = createServerFn({ method: 'POST' })
  .validator(z.object({ tenantId: z.string().min(1) }))
  .handler(async ({ data: input }): Promise<boolean> => {
    const userId = await readSessionUserId()
    if (!userId) return false
    const membership = await findMembership(input.tenantId, userId)
    if (!membership) return false
    await writeSessionTenantId(input.tenantId)
    return true
  })

/** The active tenant id from the cookie; used to render the current selection. */
export const activeTenantIdFn = createServerFn({ method: 'GET' }).handler(async () => {
  return { tenantId: await readSessionTenantId() }
})

export const listMembersFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<MemberRow[]> => {
    const ctx = await requireMembership('owner')
    return listTenantMembers(ctx.tenantId)
  },
)

export const updateMemberRoleFn = createServerFn({ method: 'POST' })
  .validator(z.object({ membershipId: z.string().min(1), role: roleSchema }))
  .handler(async ({ data: input }): Promise<void> => {
    const ctx = await requireMembership('owner')
    await updateMemberRole(ctx.tenantId, input.membershipId, input.role)
  })

export const inviteMemberFn = createServerFn({ method: 'POST' })
  .validator(z.object({ email: emailSchema, role: roleSchema }))
  .handler(async ({ data: input }): Promise<MemberRow> => {
    const ctx = await requireMembership('owner')
    return addMemberByEmail(ctx.tenantId, input.email, input.role as Role)
  })
