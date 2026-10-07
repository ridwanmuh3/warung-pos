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

export interface R2Env {
  /** S3 API endpoint, used for signing and object access. */
  endpoint: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
}

export const r2Env = createServerOnlyFn((): R2Env => ({
  endpoint: required('CLOUDFLARE_S3_URI'),
  bucket: required('CLOUDFLARE_BUCKET'),
  accessKeyId: required('CLOUDFLARE_ACCESS_KEY_ID'),
  secretAccessKey: required('CLOUDFLARE_SECRET_KEY'),
}))

/**
 * Optional CDN / custom-domain base URL for images.
 *
 * When unset — the default — image reads go through this app's own `/img`
 * proxy instead, because the `*.r2.dev` development domain is blocked on some
 * shop networks while the app's own origin always works.
 */
export const r2PublicUrl = createServerOnlyFn((): string | null => {
  const value = process.env.CLOUDFLARE_R2_PUBLIC_URL?.trim()
  return value ? value.replace(/\/+$/, '') : null
})

