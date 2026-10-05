import { createServerOnlyFn } from '@tanstack/react-start'

/**
 * Server environment access.
 *
 * `createServerOnlyFn` makes any client-side import fail loudly instead of
 * silently inlining a secret into the browser bundle. Values are read at call
 * time and never logged or returned to the client.
 */

function required(name: string): string {
  const value = process.env[name]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export interface DatabaseEnv {
  url: string
  authToken: string
}

export const databaseEnv = createServerOnlyFn((): DatabaseEnv => ({
  url: required('TURSO_URL'),
  authToken: required('TURSO_ACCESS_TOKEN'),
}))

/**
 * Session-cookie secret. Falls back to the database token so a misconfigured
 * deployment still boots, but a dedicated secret is strongly preferred: the
 * fallback ties cookie validity to the database credential's lifetime.
 */
export const sessionSecret = createServerOnlyFn((): string =>
  process.env.SESSION_SECRET?.trim() || required('TURSO_ACCESS_TOKEN'),
)

/** Whether a real database is configured, for graceful degradation in dev. */
export const hasDatabaseConfig = createServerOnlyFn((): boolean => {
  const url = process.env.TURSO_URL
  return typeof url === 'string' && url.trim() !== ''
})
