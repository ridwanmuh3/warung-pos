import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader, getRequestIP } from '@tanstack/react-start/server'
import {
  countUsers,
  createUser,
  findUserByEmail,
  findUserById,
  verifyPassword,
  wastePasswordTime,
} from './auth.server'
import type { PublicUser } from './auth.server'
import {
  clearLogin,
  consumeRegistration,
  loginIpStatus,
  loginStatus,
  recordLoginFailure,
  recordLoginIpFailure,
} from './rate-limit.server'
import { destroySession, readSessionUserId, writeSessionIdentity } from './session.server'
import { listMemberships, provisionDefaultTenant } from './tenant.server'
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

function clientIp(): string {
  try {
    return getRequestHeader('x-nf-client-connection-ip')?.trim() || getRequestIP() || 'unknown'
  } catch {
    return 'unknown'
  }
}

function loginKey(email: string, ip: string): string {
  return `login:${email}:${ip}`
}

function loginIpKey(ip: string): string {
  return `login-ip:${ip}`
}

function rateLimited(retryAfterSeconds: number): AuthResponse {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60))
  return {
    ok: false,
    errors: [`Terlalu banyak percobaan. Coba lagi dalam ${minutes} menit.`],
  }
}

export const registerFn = createServerFn({ method: 'POST' })
  .validator(registerSchema)
  .handler(async ({ data }): Promise<AuthResponse> => {
    const limit = consumeRegistration(`register:${clientIp()}`)
    if (!limit.allowed) return rateLimited(limit.retryAfterSeconds)

    const existing = await findUserByEmail(data.email)
    if (existing) return { ok: false, errors: ['Email sudah terdaftar'] }

    let user: PublicUser
    try {
      user = await createUser({ name: data.name, email: data.email, password: data.password })
    } catch (error) {
      // Two simultaneous registrations can both pass the check above; the
      // unique email index is the real arbiter. Re-check to return the same
      // friendly error instead of leaking a database exception.
      if (await findUserByEmail(data.email)) {
        return { ok: false, errors: ['Email sudah terdaftar'] }
      }
      throw error
    }

    const tenantId = await provisionDefaultTenant(user.id, data.warungName ?? 'Warung Saya')
    await writeSessionIdentity(user.id, tenantId)
    return { ok: true, user }
  })

export const loginFn = createServerFn({ method: 'POST' })
  .validator(loginSchema)
  .handler(async ({ data }): Promise<AuthResponse> => {
    const ip = clientIp()
    const key = loginKey(data.email, ip)
    const ipKey = loginIpKey(ip)
    const limit = loginStatus(key)
    if (!limit.allowed) return rateLimited(limit.retryAfterSeconds)
    const ipLimit = loginIpStatus(ipKey)
    if (!ipLimit.allowed) return rateLimited(ipLimit.retryAfterSeconds)

    const user = await findUserByEmail(data.email)
    // Identical message and comparable work for unknown email and wrong
    // password: no enumeration through the response or the clock.
    if (!user) {
      await wastePasswordTime(data.password)
      recordLoginFailure(key)
      recordLoginIpFailure(ipKey)
      return { ok: false, errors: ['Email atau kata sandi salah'] }
    }

    const valid = await verifyPassword(user, data.password)
    if (!valid) {
      recordLoginFailure(key)
      recordLoginIpFailure(ipKey)
      return { ok: false, errors: ['Email atau kata sandi salah'] }
    }

    clearLogin(key)

    // Every account belongs to at least one shop. Older accounts created before
    // multi-tenancy get their default shop on first sign-in.
    const existing = await listMemberships(user.id)
    const tenantId = existing[0]?.tenantId ?? (await provisionDefaultTenant(user.id))
    await writeSessionIdentity(user.id, tenantId)
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
