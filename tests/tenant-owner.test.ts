import { beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { resetDatabase } from './helpers/db'

const { getDb } = await import('../src/db/client.server')
const { memberships, tenants, users } = await import('../src/db/schema')
const { updateMemberRole } = await import('../src/lib/tenant.server')

const TENANT = 'tenant-owner-test'
const OTHER_TENANT = 'tenant-other'

async function seedUser(id: string, email: string): Promise<void> {
  await getDb().insert(users).values({
    id,
    name: id,
    email,
    passwordHash: 'x',
    salt: 'x',
    createdAt: new Date().toISOString(),
  })
}

beforeEach(async () => {
  await resetDatabase()
  const now = new Date().toISOString()
  await getDb().insert(tenants).values([
    { id: TENANT, name: 'Warung Uji', createdAt: now },
    { id: OTHER_TENANT, name: 'Warung Lain', createdAt: now },
  ])
  await seedUser('user-owner', 'owner@example.com')
  await seedUser('user-manager', 'manager@example.com')
  await seedUser('user-other', 'other@example.com')
  await getDb().insert(memberships).values([
    { id: 'membership-owner', tenantId: TENANT, userId: 'user-owner', role: 'owner', createdAt: now },
    { id: 'membership-manager', tenantId: TENANT, userId: 'user-manager', role: 'manager', createdAt: now },
    { id: 'membership-other', tenantId: OTHER_TENANT, userId: 'user-other', role: 'owner', createdAt: now },
  ])
})

describe('membership role changes', () => {
  it('refuses to demote the last owner', async () => {
    await expect(updateMemberRole(TENANT, 'membership-owner', 'cashier')).rejects.toThrow(
      'pemilik terakhir',
    )

    const rows = await getDb()
      .select({ role: memberships.role })
      .from(memberships)
      .where(eq(memberships.id, 'membership-owner'))
    expect(rows[0]?.role).toBe('owner')
  })

  it('allows demotion once another owner exists', async () => {
    const now = new Date().toISOString()
    await getDb().insert(memberships).values({
      id: 'membership-second-owner',
      tenantId: TENANT,
      userId: 'user-other',
      role: 'owner',
      createdAt: now,
    })

    await updateMemberRole(TENANT, 'membership-owner', 'manager')

    const rows = await getDb()
      .select({ role: memberships.role })
      .from(memberships)
      .where(eq(memberships.id, 'membership-owner'))
    expect(rows[0]?.role).toBe('manager')
  })

  it('cannot change a membership in another tenant', async () => {
    await expect(updateMemberRole(TENANT, 'membership-other', 'cashier')).rejects.toThrow(
      'Anggota tidak ditemukan',
    )

    const rows = await getDb()
      .select({ role: memberships.role })
      .from(memberships)
      .where(eq(memberships.id, 'membership-other'))
    expect(rows[0]?.role).toBe('owner')
  })
})
