import { currentUserFn, loginFn, logoutFn, registerFn } from './auth.functions'
import type { AuthResponse } from './auth.functions'
import type { PublicUser } from './auth.server'
import { startCartSync, stopCartSync } from './cart'
import { loginSchema, registerSchema } from './validation'

/**
 * Client-side auth facade.
 *
 * The password hash lives on the server; the browser only holds an encrypted
 * session cookie. `login`/`register`/`logout` are RPC calls, and the current
 * user is re-fetched from the server rather than cached in localStorage.
 *
 * The subscription contract is deliberately one-way: `refreshSession()` writes
 * the cache and notifies; subscribers only *read* `getSessionSnapshot()`. A
 * subscriber that triggered another fetch would loop forever.
 */

export type { PublicUser, AuthResponse }

const listeners = new Set<() => void>()

function authError(cause: unknown): AuthResponse {
  if (cause instanceof Error) {
    try {
      const issues: unknown = JSON.parse(cause.message)
      if (Array.isArray(issues)) {
        const messages = issues.flatMap((issue: unknown) =>
          typeof issue === 'object' && issue !== null && 'message' in issue && typeof issue.message === 'string'
            ? [issue.message]
            : [],
        )
        if (messages.length) return { ok: false, errors: messages }
      }
    } catch { /* Non-validation errors must not expose internal details. */ }
  }
  return { ok: false, errors: ['Tidak dapat terhubung. Coba lagi.'] }
}

let cache: PublicUser | null = null
let resolved = false

/** Latest known user. Stable identity between refreshes. */
export function getSessionSnapshot(): PublicUser | null {
  return cache
}

/** Whether the first server lookup has completed. */
export function isSessionResolved(): boolean {
  return resolved
}

export function subscribeToSession(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export async function login(input: { email: string; password: string }): Promise<AuthResponse> {
  const parsed = loginSchema.safeParse(input)
  if (!parsed.success) return { ok: false, errors: parsed.error.issues.map((issue) => issue.message) }
  let result: AuthResponse
  try {
    result = await loginFn({ data: parsed.data })
  } catch (cause) {
    return authError(cause)
  }
  if (result.ok) {
    cache = result.user
    resolved = true
    listeners.forEach((listener) => listener())
    void startCartSync()
  }
  return result
}

export async function register(input: {
  name: string
  email: string
  password: string
  confirmPassword: string
  warungName?: string
}): Promise<AuthResponse> {
  const parsed = registerSchema.safeParse(input)
  if (!parsed.success) return { ok: false, errors: parsed.error.issues.map((issue) => issue.message) }
  let result: AuthResponse
  try {
    result = await registerFn({ data: parsed.data })
  } catch (cause) {
    return authError(cause)
  }
  if (result.ok) {
    cache = result.user
    resolved = true
    listeners.forEach((listener) => listener())
    void startCartSync()
  }
  return result
}

export async function logout(): Promise<void> {
  await logoutFn()
  // The cart belongs to the account: drop the local copy so the next user on
  // this device never sees it.
  stopCartSync()
  cache = null
  resolved = true
  listeners.forEach((listener) => listener())
}

/** Fetches the current user from the server, updates the cache, notifies. */
export async function refreshSession(): Promise<PublicUser | null> {
  const user = await currentUserFn()
  cache = user
  resolved = true
  listeners.forEach((listener) => listener())
  if (user) void startCartSync()
  return user
}
