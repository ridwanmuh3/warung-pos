import { createServerOnlyFn } from '@tanstack/react-start'
import { and, count, eq, inArray } from 'drizzle-orm'
import { getDb } from '../db/client.server'
import { memberships, orders, products, shifts, tenants, users } from '../db/schema'
import type { Role } from './tenant.server'
import { deleteObject } from './r2.server'

/**
 * Self-service account deletion.
 *
 * Rules that protect other people's data:
 * - The account, its memberships, and its carts always go.
 * - A warung is deleted only when the leaving user is its **only** member.
 * - A last owner who still has members is blocked: deleting them would leave a
 *   warung nobody can administer. Ownership must be handed over first.
 * - Transaction history in a warung that survives stays with that warung; only
 *   the link to the deleted user is removed (`orders.user_id` / `shifts.user_id`).
 *
 * Images are deleted after the database commit and only for keys owned by a
 * deleted tenant (`products/<tenantId>/…`), never shared seed images.
 */

export interface DeletionTenant {
  id: string
  name: string
  products: number
  orders: number
}

export interface DeletionBlocker {
  id: string
  name: string
  members: number
}

export interface AccountDeletionPlan {
  tenantsToDelete: DeletionTenant[]
  tenantsToLeave: Array<{ id: string; name: string; role: Role }>
  blockers: DeletionBlocker[]
}

async function scalarCount(query: PromiseLike<Array<{ value: number }>>): Promise<number> {
  const rows = await query
  return Number(rows[0]?.value ?? 0)
}

export const loadAccountDeletionPlan = createServerOnlyFn(
  async (userId: string): Promise<AccountDeletionPlan> => {
    const db = getDb()
    const rows = await db
      .select({
        tenantId: memberships.tenantId,
        tenantName: tenants.name,
        role: memberships.role,
      })
      .from(memberships)
      .innerJoin(tenants, eq(tenants.id, memberships.tenantId))
      .where(eq(memberships.userId, userId))

    const plan: AccountDeletionPlan = {
      tenantsToDelete: [],
      tenantsToLeave: [],
      blockers: [],
    }

    for (const row of rows) {
      const members = await scalarCount(
        db
          .select({ value: count() })
          .from(memberships)
          .where(eq(memberships.tenantId, row.tenantId)),
      )
      const owners = await scalarCount(
        db
          .select({ value: count() })
          .from(memberships)
          .where(
            and(eq(memberships.tenantId, row.tenantId), eq(memberships.role, 'owner')),
          ),
      )

      if (row.role === 'owner' && owners === 1 && members > 1) {
        plan.blockers.push({ id: row.tenantId, name: row.tenantName, members })
        continue
      }

      if (row.role === 'owner' && owners === 1 && members === 1) {
        const productCount = await scalarCount(
          db
            .select({ value: count() })
            .from(products)
            .where(eq(products.tenantId, row.tenantId)),
        )
        const orderCount = await scalarCount(
          db
            .select({ value: count() })
            .from(orders)
            .where(eq(orders.tenantId, row.tenantId)),
        )
        plan.tenantsToDelete.push({
          id: row.tenantId,
          name: row.tenantName,
          products: productCount,
          orders: orderCount,
        })
        continue
      }

      plan.tenantsToLeave.push({
        id: row.tenantId,
        name: row.tenantName,
        role: row.role,
      })
    }

    return plan
  },
)

export interface DeletedAccountSummary {
  deletedTenants: string[]
  leftTenants: string[]
}

/**
 * Removes the account and returns what was deleted. The caller must verify the
 * password first; this function intentionally does no authentication so it can
 * be reused by maintenance scripts and tests.
 */
export const deleteAccountData = createServerOnlyFn(
  async (userId: string): Promise<DeletedAccountSummary> => {
    const db = getDb()
    const plan = await loadAccountDeletionPlan(userId)

    if (plan.blockers.length > 0) {
      const names = plan.blockers.map((blocker) => blocker.name).join(', ')
      throw new Error(
        `Anda masih menjadi pemilik terakhir di ${names}. Angkat anggota lain menjadi owner terlebih dahulu, lalu coba lagi.`,
      )
    }

    const tenantIds = plan.tenantsToDelete.map((tenant) => tenant.id)
    const prefixes = tenantIds.map((id) => `products/${id}/`)

    const imageRows =
      tenantIds.length === 0
        ? []
        : await db
            .select({ imageKey: products.imageKey })
            .from(products)
            .where(inArray(products.tenantId, tenantIds))

    const imageKeys = imageRows
      .map((row) => row.imageKey)
      .filter(
        (key): key is string =>
          typeof key === 'string' && prefixes.some((prefix) => key.startsWith(prefix)),
      )

    await db.transaction(async (tx) => {
      if (tenantIds.length > 0) {
        // Cascades to products, orders, order items, shifts, counters, stock
        // movements, and carts for those shops.
        await tx.delete(tenants).where(inArray(tenants.id, tenantIds))
      }

      // Keep the surviving shops' history, but cut it loose from this account.
      await tx.update(orders).set({ userId: null }).where(eq(orders.userId, userId))
      await tx.update(shifts).set({ userId: null }).where(eq(shifts.userId, userId))
      await tx.delete(users).where(eq(users.id, userId))
    })

    await Promise.all(imageKeys.map((key) => deleteObject(key)))

    return {
      deletedTenants: plan.tenantsToDelete.map((tenant) => tenant.name),
      leftTenants: plan.tenantsToLeave.map((tenant) => tenant.name),
    }
  },
)
