import { createServerOnlyFn } from '@tanstack/react-start'
import { and, asc, eq } from 'drizzle-orm'
import { getDb } from '../db/client.server'
import { memberships, tenants, users } from '../db/schema'
import { readSessionTenantId, readSessionUserId } from './session.server'

/**
 * Tenant resolution and role enforcement (Phase 8C).
 *
 * The rule is absolute: **`tenant_id` and `role` never come from the client.**
 * Every server function asks for a context here, which reads the encrypted
 * session cookie, loads the membership, and returns the tenant id and role. The
 * caller then passes that tenant id into `data.server.ts`, where every query is
 * filtered by it.
 */

export type Role = 'owner' | 'manager' | 'cashier'

export interface TenantContext {
  userId: string
  tenantId: string
  tenantName: string
  role: Role
}

export interface MembershipSummary {
  tenantId: string
  tenantName: string
  role: Role
}

const ROLE_RANK: Record<Role, number> = { cashier: 0, manager: 1, owner: 2 }

export function hasAtLeast(role: Role, min: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min]
}

function roleLabel(min: Role): string {
  return min === 'owner' ? 'pemilik' : min === 'manager' ? 'manajer' : 'kasir'
}

/** Creates a tenant and makes `userId` its owner. */
export const createTenantForUser = createServerOnlyFn(
  async (userId: string, name: string): Promise<string> => {
    const db = getDb()
    const tenantId = crypto.randomUUID()
    const now = new Date().toISOString()
    await db.insert(tenants).values({ id: tenantId, name, createdAt: now })
    await db.insert(memberships).values({
      id: crypto.randomUUID(),
      tenantId,
      userId,
      role: 'owner',
      createdAt: now,
    })
    return tenantId
  },
)

/** Default shop for a brand-new account. */
export const provisionDefaultTenant = createServerOnlyFn(async (userId: string): Promise<string> => {
  return createTenantForUser(userId, 'Warung Saya')
})

async function membershipsForUser(userId: string): Promise<MembershipSummary[]> {
  const rows = await getDb()
    .select({
      tenantId: memberships.tenantId,
      tenantName: tenants.name,
      role: memberships.role,
    })
    .from(memberships)
    .innerJoin(tenants, eq(tenants.id, memberships.tenantId))
    .where(eq(memberships.userId, userId))
    .orderBy(asc(memberships.createdAt))
  return rows
}

/**
 * Resolves the caller's active tenant. A user with no membership at all (e.g.
 * after a database reset) gets a fresh default shop instead of a hard error.
 */
export const requireMembership = createServerOnlyFn(
  async (minRole: Role = 'cashier'): Promise<TenantContext> => {
    const userId = await readSessionUserId()
    if (!userId) throw new Error('Anda harus masuk terlebih dahulu')

    let list = await membershipsForUser(userId)
    if (list.length === 0) {
      await provisionDefaultTenant(userId)
      list = await membershipsForUser(userId)
    }

    const requested = await readSessionTenantId()
    const active = list.find((item) => item.tenantId === requested) ?? list[0]!

    if (!hasAtLeast(active.role, minRole)) {
      throw new Error(`Aksi ini hanya untuk ${roleLabel(minRole)}`)
    }

    return {
      userId,
      tenantId: active.tenantId,
      tenantName: active.tenantName,
      role: active.role,
    }
  },
)

/** Memberships for the signed-in user, for the shop switcher. */
export const listMemberships = createServerOnlyFn(
  async (userId: string): Promise<MembershipSummary[]> => membershipsForUser(userId),
)

export interface MemberRow {
  membershipId: string
  userId: string
  name: string
  email: string
  role: Role
  createdAt: string
}

export const listTenantMembers = createServerOnlyFn(
  async (tenantId: string): Promise<MemberRow[]> => {
    const rows = await getDb()
      .select({
        membershipId: memberships.id,
        userId: users.id,
        name: users.name,
        email: users.email,
        role: memberships.role,
        createdAt: memberships.createdAt,
      })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(eq(memberships.tenantId, tenantId))
      .orderBy(asc(memberships.createdAt))
    return rows
  },
)

/** True when the user is already a member of the tenant. */
export const findMembership = createServerOnlyFn(
  async (tenantId: string, userId: string): Promise<{ id: string; role: Role } | undefined> => {
    const rows = await getDb()
      .select({ id: memberships.id, role: memberships.role })
      .from(memberships)
      .where(and(eq(memberships.tenantId, tenantId), eq(memberships.userId, userId)))
      .limit(1)
    return rows[0]
  },
)

export const addMemberByEmail = createServerOnlyFn(
  async (tenantId: string, email: string, role: Role): Promise<MemberRow> => {
    const db = getDb()
    const userRows = await db.select().from(users).where(eq(users.email, email)).limit(1)
    const user = userRows[0]
    if (!user) throw new Error('Tidak ada akun dengan email tersebut')
    const existing = await findMembership(tenantId, user.id)
    if (existing) throw new Error('Pengguna sudah menjadi anggota toko ini')

    const membershipId = crypto.randomUUID()
    await db.insert(memberships).values({
      id: membershipId,
      tenantId,
      userId: user.id,
      role,
      createdAt: new Date().toISOString(),
    })
    return {
      membershipId,
      userId: user.id,
      name: user.name,
      email: user.email,
      role,
      createdAt: new Date().toISOString(),
    }
  },
)

export const updateMemberRole = createServerOnlyFn(
  async (tenantId: string, membershipId: string, role: Role): Promise<void> => {
    await getDb()
      .update(memberships)
      .set({ role })
      .where(and(eq(memberships.tenantId, tenantId), eq(memberships.id, membershipId)))
  },
)
