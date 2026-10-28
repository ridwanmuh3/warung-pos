import { createServerFn } from '@tanstack/react-start'
import { findUserById, findUserWithSecretById, verifyPassword } from './auth.server'
import { loadAccountDeletionPlan, deleteAccountData } from './account.server'
import { clearLogin, loginStatus, recordLoginFailure } from './rate-limit.server'
import { destroySession, readSessionUserId } from './session.server'
import { deleteAccountSchema } from './validation'

/**
 * Account deletion RPC.
 *
 * The preview is deliberately read-only and returns names/counts only, so the
 * confirmation dialog can show exactly what will disappear. The delete call
 * re-verifies the password, re-reads the plan (state may have changed), and
 * destroys the session in the same request.
 */

function deleteKey(userId: string): string {
  return `delete-account:${userId}`
}

async function requireUserId(): Promise<string> {
  const userId = await readSessionUserId()
  if (!userId) throw new Error('Sesi berakhir. Masuk ulang untuk menghapus akun.')
  return userId
}

export const accountDeletionPreviewFn = createServerFn({ method: 'GET' }).handler(async () => {
  const userId = await requireUserId()
  const user = await findUserById(userId)
  if (!user) throw new Error('Akun tidak ditemukan.')

  const plan = await loadAccountDeletionPlan(userId)

  return {
    email: user.email,
    tenantsToDelete: plan.tenantsToDelete.map(({ name, products, orders }) => ({
      name,
      products,
      orders,
    })),
    tenantsToLeave: plan.tenantsToLeave.map(({ name, role }) => ({ name, role })),
    blockers: plan.blockers.map(({ name, members }) => ({ name, members })),
  }
})

export const deleteAccountFn = createServerFn({ method: 'POST' })
  .validator(deleteAccountSchema)
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    const key = deleteKey(userId)

    const limit = loginStatus(key)
    if (!limit.allowed) {
      const minutes = Math.max(1, Math.ceil(limit.retryAfterSeconds / 60))
      throw new Error(`Terlalu banyak percobaan. Coba lagi dalam ${minutes} menit.`)
    }

    const user = await findUserWithSecretById(userId)
    if (!user) throw new Error('Akun tidak ditemukan.')
    if (!(await verifyPassword(user, data.password))) {
      recordLoginFailure(key)
      throw new Error('Kata sandi salah.')
    }

    clearLogin(key)

    const result = await deleteAccountData(userId)
    await destroySession()
    return { ok: true as const, ...result }
  })
