import { createServerOnlyFn } from '@tanstack/react-start'
import { timingSafeEqual } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { getDb } from '../db/client.server'
import { users } from '../db/schema'

/**
 * Server-only authentication primitives.
 *
 * Passwords are hashed with PBKDF2-SHA-256 and a per-user random salt. The hash
 * never leaves the server: queries here deliberately omit `passwordHash` from
 * their return shape so it cannot be serialised into a response by accident.
 */

const PBKDF2_ITERATIONS = 210_000
const KEY_LENGTH_BITS = 256

export interface PublicUser {
  id: string
  name: string
  email: string
  createdAt: string
}

export interface UserWithSecret extends PublicUser {
  passwordHash: string
  salt: string
}

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64')
}

function fromBase64(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, 'base64'))
}

async function derive(password: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    KEY_LENGTH_BITS,
  )
  return toBase64(new Uint8Array(bits))
}

export const hashPassword = createServerOnlyFn(async (password: string, salt: Uint8Array) =>
  derive(password, salt),
)

/** Length-independent comparison: a wrong password cannot be timed out. */
export function constantTimeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export const createUser = createServerOnlyFn(
  async (input: { name: string; email: string; password: string }): Promise<PublicUser> => {
    const db = getDb()
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const passwordHash = await derive(input.password, salt)
    const user: PublicUser = {
      id: crypto.randomUUID(),
      name: input.name,
      email: input.email,
      createdAt: new Date().toISOString(),
    }
    await db.insert(users).values({ ...user, passwordHash, salt: toBase64(salt) })
    return user
  },
)

export const findUserByEmail = createServerOnlyFn(
  async (email: string): Promise<UserWithSecret | undefined> => {
    const rows = await getDb().select().from(users).where(eq(users.email, email)).limit(1)
    return rows[0]
  },
)

export const findUserById = createServerOnlyFn(async (id: string): Promise<PublicUser | undefined> => {
  const rows = await getDb()
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1)
  return rows[0]
})

export const verifyPassword = createServerOnlyFn(async (user: UserWithSecret, password: string) => {
  const attempt = await derive(password, fromBase64(user.salt))
  return constantTimeEqual(attempt, user.passwordHash)
})

export const countUsers = createServerOnlyFn(async (): Promise<number> => {
  const rows = await getDb().select({ id: users.id }).from(users)
  return rows.length
})
