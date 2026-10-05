import { createServerFn } from '@tanstack/react-start'
import {
  countUsers,
  createUser,
  findUserByEmail,
  findUserById,
  verifyPassword,
} from './auth.server'
import type { PublicUser } from './auth.server'
import { destroySession, readSessionUserId, writeSessionUserId } from './session.server'
import { loginSchema, registerSchema } from './validation'

/**
 * Typed authentication RPC.
 *
 * Every credential check happens on the server. The client receives only a
 * `PublicUser` (never a hash or salt) and an encrypted session cookie.
 */

export type AuthResponse =
  | { ok: true; user: PublicUser }
  | { ok: false; errors: string[] }

export const registerFn = createServerFn({ method: 'POST' })
  .validator(registerSchema)
  .handler(async ({ data }): Promise<AuthResponse> => {
    const existing = await findUserByEmail(data.email)
    if (existing) return { ok: false, errors: ['Email sudah terdaftar'] }

    const user = await createUser({ name: data.name, email: data.email, password: data.password })
    await writeSessionUserId(user.id)
    return { ok: true, user }
  })

export const loginFn = createServerFn({ method: 'POST' })
  .validator(loginSchema)
  .handler(async ({ data }): Promise<AuthResponse> => {
    const user = await findUserByEmail(data.email)
    // Identical message for unknown email and wrong password: no enumeration.
    if (!user) return { ok: false, errors: ['Email atau kata sandi salah'] }

    const valid = await verifyPassword(user, data.password)
    if (!valid) return { ok: false, errors: ['Email atau kata sandi salah'] }

    await writeSessionUserId(user.id)
    return {
      ok: true,
      user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt },
    }
  })

export const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  await destroySession()
  return { ok: true as const }
})

/** Resolves the signed-in user from the request cookie. */
export const currentUserFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<PublicUser | null> => {
    const userId = await readSessionUserId()
    if (!userId) return null
    // A cookie can outlive its user row (e.g. after a database reset).
    return (await findUserById(userId)) ?? null
  },
)

/** Whether any account exists yet, so the UI can steer to registration. */
export const userCountFn = createServerFn({ method: 'GET' }).handler(async () => {
  return { count: await countUsers() }
})
