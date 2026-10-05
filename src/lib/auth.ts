import { z } from 'zod'
import { email as emailSchema, loginSchema, registerSchema } from './validation'
import type { LoginInput, RegisterInput } from './validation'

/**
 * Local authentication.
 *
 * Scope: single-device accounts, no backend. Credentials never leave the
 * browser. Passwords are stored as PBKDF2-SHA-256 hashes with a per-user random
 * salt — never in plain text — so a `localStorage` dump does not reveal them.
 *
 * This is deliberately *not* a security boundary against the device owner:
 * client-side auth cannot be. It is an access gate for shift staff, and it
 * models the exact API a real server would expose so the swap is mechanical.
 */

const USERS_KEY = 'warung-pos.users.v1'
const SESSION_KEY = 'warung-pos.session.v1'

const PBKDF2_ITERATIONS = 210_000

const listeners = new Set<() => void>()

interface StoredUser {
  id: string
  name: string
  email: string
  /** Base64 PBKDF2-SHA-256 hash. */
  passwordHash: string
  /** Base64 per-user random salt. */
  salt: string
  createdAt: string
}

export interface SessionUser {
  id: string
  name: string
  email: string
  createdAt: string
}

const storedUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string(),
  passwordHash: z.string().min(1),
  salt: z.string().min(1),
  createdAt: z.string(),
})

export type AuthResult =
  | { ok: true; user: SessionUser }
  | { ok: false; errors: string[] }

/* ------------------------------ storage ------------------------------ */

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

function readUsers(): StoredUser[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(USERS_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    // Re-validate everything read back: storage is user-editable.
    return parsed
      .map((entry) => storedUserSchema.safeParse(entry))
      .filter((result) => result.success)
      .map((result) => result.data)
  } catch {
    return []
  }
}

function writeUsers(users: StoredUser[]): void {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
  } catch {
    // Storage unavailable: registration cannot be persisted.
  }
}

function readSessionUserId(): string | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (raw === null) return null
    const parsed = z.string().safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

function writeSession(userId: string | null): void {
  try {
    if (userId === null) localStorage.removeItem(SESSION_KEY)
    else localStorage.setItem(SESSION_KEY, JSON.stringify(userId))
  } catch {
    // Storage unavailable: the session lives only for this tab.
  }
  notify()
}

/* ------------------------------- crypto ------------------------------ */

/** PBKDF2-SHA-256, constant work factor, per-user salt. */
async function hashPassword(password: string, salt: Uint8Array): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256,
  )
  return bytesToBase64(new Uint8Array(bits))
}

/** Length-independent comparison so a wrong password cannot be timed out. */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index)
  }
  return diff === 0
}

/* ------------------------------- session ----------------------------- */

let cachedUser: SessionUser | null | undefined

function toSessionUser(user: StoredUser): SessionUser {
  return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt }
}

function resolveCurrentUser(): SessionUser | null {
  if (cachedUser !== undefined) return cachedUser
  const userId = readSessionUserId()
  if (userId === null) {
    cachedUser = null
    return cachedUser
  }
  const user = readUsers().find((candidate) => candidate.id === userId)
  cachedUser = user ? toSessionUser(user) : null
  return cachedUser
}

function notify(): void {
  cachedUser = undefined
  listeners.forEach((listener) => listener())
}

/* --------------------------------- API ------------------------------- */

export async function register(input: RegisterInput): Promise<AuthResult> {
  const parsed = registerSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((issue) => issue.message) }
  }
  const { name, email, password } = parsed.data

  const users = readUsers()
  if (users.some((user) => user.email === email)) {
    return { ok: false, errors: ['Email sudah terdaftar'] }
  }

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const passwordHash = await hashPassword(password, salt)
  const user: StoredUser = {
    id: crypto.randomUUID(),
    name,
    email,
    passwordHash,
    salt: bytesToBase64(salt),
    createdAt: new Date().toISOString(),
  }
  writeUsers([...users, user])
  writeSession(user.id)
  return { ok: true, user: toSessionUser(user) }
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const parsed = loginSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((issue) => issue.message) }
  }
  const { email, password } = parsed.data

  const user = readUsers().find((candidate) => candidate.email === email)
  if (!user) {
    // Same message for unknown email and wrong password: no account enumeration.
    return { ok: false, errors: ['Email atau kata sandi salah'] }
  }

  const attempt = await hashPassword(password, base64ToBytes(user.salt))
  if (!constantTimeEqual(attempt, user.passwordHash)) {
    return { ok: false, errors: ['Email atau kata sandi salah'] }
  }

  writeSession(user.id)
  return { ok: true, user: toSessionUser(user) }
}

export function logout(): void {
  writeSession(null)
}

/** Stable snapshot for useSyncExternalStore. */
export function getSessionSnapshot(): SessionUser | null {
  return resolveCurrentUser()
}

export function subscribeToSession(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** True when no account exists yet, so the UI can steer to registration. */
export function hasRegisteredUsers(): boolean {
  return readUsers().length > 0
}

/** The email schema, re-exported for form-level reuse. */
export const emailField = emailSchema
