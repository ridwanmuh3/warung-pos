import { createServerOnlyFn } from '@tanstack/react-start'
import { useSession } from '@tanstack/react-start/server'
import { sessionSecret } from './env.server'

/**
 * Encrypted session cookie.
 *
 * The session is a signed, encrypted cookie handled by TanStack Start, so the
 * browser never sees a readable payload and the server never stores session
 * state. Logout clears it server-side; there is no client-side session copy that
 * could be forged.
 */

export interface SessionData {
  userId?: string
  /** Active tenant for a user who belongs to more than one shop. */
  tenantId?: string
}

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

function sessionConfig() {
  return {
    password: sessionSecret(),
    name: 'warung-pos',
    maxAge: SESSION_MAX_AGE_SECONDS,
    cookie: {
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    },
  }
}

/** Reads the signed-in user id from the request cookie, or `null`. */
export const readSessionUserId = createServerOnlyFn(async (): Promise<string | null> => {
  const session = await useSession<SessionData>(sessionConfig())
  return session.data.userId ?? null
})

/** Reads the active tenant id from the request cookie, or `null`. */
export const readSessionTenantId = createServerOnlyFn(async (): Promise<string | null> => {
  const session = await useSession<SessionData>(sessionConfig())
  return session.data.tenantId ?? null
})

/** Persists the user id into the response cookie. */
export const writeSessionUserId = createServerOnlyFn(async (userId: string): Promise<void> => {
  const session = await useSession<SessionData>(sessionConfig())
  await session.update({ userId })
})

/** Writes user and active tenant together, for sign-in and registration. */
export const writeSessionIdentity = createServerOnlyFn(
  async (userId: string, tenantId: string): Promise<void> => {
    const session = await useSession<SessionData>(sessionConfig())
    await session.update({ userId, tenantId })
  },
)

/** Persists the active tenant into the response cookie. */
export const writeSessionTenantId = createServerOnlyFn(async (tenantId: string): Promise<void> => {
  const session = await useSession<SessionData>(sessionConfig())
  await session.update({ tenantId })
})

/** Clears the session cookie. */
export const destroySession = createServerOnlyFn(async (): Promise<void> => {
  const session = await useSession<SessionData>(sessionConfig())
  await session.clear()
})
