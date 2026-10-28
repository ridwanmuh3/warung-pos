import { beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { resetDatabase } from './helpers/db'

const { getDb } = await import('../src/db/client.server')
const { memberships, orders, products, shifts, tenants, users } = await import('../src/db/schema')
const { deleteAccountData, loadAccountDeletionPlan } = await import('../src/lib/account.server')

const SOLO = 'tenant-solo'
const SHARED = 'tenant-shared'
const CO_OWNED = 'tenant-co-owned'
const OTHER = 'tenant-other'

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

async function seedProduct(tenantId: string, id: string): Promise<void> {
  const now = new Date().toISOString()
  await getDb().insert(products).values({
    id,
    tenantId,
    name: `Produk ${id}`,
    price: 5000,
    cost: 3000,
    category: 'makanan',
    stock: 10,
    lowStockThreshold: 2,
    createdAt: now,
    updatedAt: now,
  })
}

async function seedOrder(tenantId: string, id: string, number: string, userId: string): Promise<void> {
  await getDb().insert(orders).values({
    id,
    tenantId,
    orderNumber: number,
    createdAt: new Date().toISOString(),
    subtotal: 5000,
    total: 5000,
    paymentMethod: 'tunai',
    userId,
  })
}

beforeEach(async () => {
  await resetDatabase()
  const now = new Date().toISOString()

  await getDb().insert(tenants).values([
    { id: SOLO, name: 'Warung Solo', createdAt: now },
    { id: SHARED, name: 'Warung Bersama', createdAt: now },
    { id: CO_OWNED, name: 'Warung Dua Pemilik', createdAt: now },
    { id: OTHER, name: 'Warung Lain', createdAt: now },
  ])

  await seedUser('user-solo', 'solo@example.com')
  await seedUser('user-staff', 'staff@example.com')
  await seedUser('user-owner', 'owner@example.com')
  await seedUser('user-co-owner', 'co-owner@example.com')
  await seedUser('user-cashier', 'cashier@example.com')

  await getDb().insert(memberships).values([
    { id: 'm-solo', tenantId: SOLO, userId: 'user-solo', role: 'owner', createdAt: now },
    { id: 'm-staff-owner', tenantId: SHARED, userId: 'user-staff', role: 'owner', createdAt: now },
    { id: 'm-staff-cashier', tenantId: OTHER, userId: 'user-staff', role: 'cashier', createdAt: now },
    { id: 'm-owner', tenantId: CO_OWNED, userId: 'user-owner', role: 'owner', createdAt: now },
    { id: 'm-co-owner', tenantId: CO_OWNED, userId: 'user-co-owner', role: 'owner', createdAt: now },
    { id: 'm-cashier', tenantId: SHARED, userId: 'user-cashier', role: 'cashier', createdAt: now },
  ])

  await seedProduct(SOLO, 'product-solo')
  await seedProduct(CO_OWNED, 'product-co-owned')
  await seedProduct(SHARED, 'product-shared')

  await seedOrder(SOLO, 'order-solo', 'ORD-001', 'user-solo')
  await seedOrder(CO_OWNED, 'order-co-owned', 'ORD-001', 'user-owner')
  await seedOrder(SHARED, 'order-shared', 'ORD-001', 'user-cashier')
})

describe('hapus akun mandiri', () => {
  it('menghapus akun dan warung ketika pengguna adalah satu-satunya anggota', async () => {
    const plan = await loadAccountDeletionPlan('user-solo')
    expect(plan.blockers).toHaveLength(0)
    expect(plan.tenantsToDelete).toEqual([
      { id: SOLO, name: 'Warung Solo', products: 1, orders: 1 },
    ])
    expect(plan.tenantsToLeave).toHaveLength(0)

    const result = await deleteAccountData('user-solo')
    expect(result.deletedTenants).toEqual(['Warung Solo'])

    expect(await getDb().select().from(users).where(eq(users.id, 'user-solo'))).toHaveLength(0)
    expect(await getDb().select().from(tenants).where(eq(tenants.id, SOLO))).toHaveLength(0)
    expect(await getDb().select().from(products).where(eq(products.tenantId, SOLO))).toHaveLength(0)
    expect(await getDb().select().from(orders).where(eq(orders.tenantId, SOLO))).toHaveLength(0)
  })

  it('menolak pemilik terakhir yang masih punya anggota lain', async () => {
    const plan = await loadAccountDeletionPlan('user-staff')
    expect(plan.blockers).toEqual([{ id: SHARED, name: 'Warung Bersama', members: 2 }])
    expect(plan.tenantsToDelete).toHaveLength(0)

    await expect(deleteAccountData('user-staff')).rejects.toThrow('pemilik terakhir')

    expect(await getDb().select().from(users).where(eq(users.id, 'user-staff'))).toHaveLength(1)
    expect(await getDb().select().from(tenants).where(eq(tenants.id, SHARED))).toHaveLength(1)
    expect(await getDb().select().from(products).where(eq(products.tenantId, SHARED))).toHaveLength(1)
  })

  it('melepas keanggotaan dan membiarkan warung tetap berjalan bila ada pemilik lain', async () => {
    const plan = await loadAccountDeletionPlan('user-owner')
    expect(plan.blockers).toHaveLength(0)
    expect(plan.tenantsToLeave).toEqual([{ id: CO_OWNED, name: 'Warung Dua Pemilik', role: 'owner' }])

    await deleteAccountData('user-owner')

    expect(await getDb().select().from(users).where(eq(users.id, 'user-owner'))).toHaveLength(0)
    expect(await getDb().select().from(tenants).where(eq(tenants.id, CO_OWNED))).toHaveLength(1)
    const owners = await getDb()
      .select({ userId: memberships.userId })
      .from(memberships)
      .where(eq(memberships.tenantId, CO_OWNED))
    expect(owners).toEqual([{ userId: 'user-co-owner' }])

    const [order] = await getDb().select().from(orders).where(eq(orders.id, 'order-co-owned'))
    expect(order?.userId).toBeNull()
  })

  it('melepas akses kasir tanpa menghapus riwayat warung', async () => {
    await deleteAccountData('user-cashier')

    expect(await getDb().select().from(users).where(eq(users.id, 'user-cashier'))).toHaveLength(0)
    expect(await getDb().select().from(tenants).where(eq(tenants.id, SHARED))).toHaveLength(1)
    const [order] = await getDb().select().from(orders).where(eq(orders.id, 'order-shared'))
    expect(order?.userId).toBeNull()
  })

  it('memutus tautan shift tanpa menghapus shift warung yang tersisa', async () => {
    await getDb().insert(shifts).values({
      id: 'shift-shared',
      tenantId: SHARED,
      openedAt: new Date().toISOString(),
      openingCash: 100_000,
      userId: 'user-cashier',
    })

    await deleteAccountData('user-cashier')

    const [shift] = await getDb().select().from(shifts).where(eq(shifts.id, 'shift-shared'))
    expect(shift?.userId).toBeNull()
    expect(shift?.tenantId).toBe(SHARED)
  })
})
