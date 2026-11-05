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
 * Session-cookie secret. Required and at least 32 characters: falling back to
 * the database token would tie cookie validity to a database credential and
 * make sessions forgeable if that token leaked.
 */
export const sessionSecret = createServerOnlyFn((): string => {
  const value = required('SESSION_SECRET').trim()
  if (value.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters')
  }
  return value
})

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

export interface XenditEnv {
  apiKey: string
  /** API origin; overridable so tests can point at a local fake server. */
  baseUrl: string
  /** Test key in use; production keys are refused unless explicitly allowed. */
  isTestKey: boolean
}

/**
 * Xendit credentials and the safety rail around them.
 *
 * A production key (`xnd_production_…`) is refused unless `XENDIT_LIVE=true`
 * is set explicitly. That prevents a live key pasted into a dev `.env` from
 * charging real customers during local testing.
 */
export const xenditEnv = createServerOnlyFn((): XenditEnv => {
  const apiKey = required('XENDIT_API_KEY').trim()
  const isTestKey = apiKey.startsWith('xnd_development')
  const live = (process.env.XENDIT_LIVE ?? '').trim().toLowerCase() === 'true'
  if (!isTestKey && !live) {
    throw new Error(
      'XENDIT_API_KEY is a production key; set XENDIT_LIVE=true to use it explicitly',
    )
  }
  return {
    apiKey,
    baseUrl: (process.env.XENDIT_BASE_URL?.trim() || 'https://api.xendit.co').replace(/\/+$/, ''),
    isTestKey,
  }
})

/**
 * Dashboard webhook verification token. Required only by the callback route:
 * a checkout can create a QR without it, but deliveries cannot be trusted.
 */
export const xenditCallbackToken = createServerOnlyFn((): string =>
  required('XENDIT_CALLBACK_TOKEN').trim(),
)

/** True when the gateway is wired up; the QRIS option is hidden otherwise. */
export const isXenditConfigured = createServerOnlyFn((): boolean =>
  Boolean(process.env.XENDIT_API_KEY?.trim()),
)

/**
 * True when the loaded key can only move test money.
 *
 * This — not `NODE_ENV` — is the gate for the "Simulasikan Pembayaran" button.
 * A deployed sandbox build is still a production build, so an environment
 * check hides the button on exactly the deployment where it is needed. The key
 * type is the real safety property: a `xnd_development_…` key cannot charge
 * anyone, and a production key turns simulation off by itself.
 *
 * Fails closed: a missing key or a production key without `XENDIT_LIVE` reads
 * as "not test mode", so the button never appears when it could cost money.
 */
export const isXenditTestMode = createServerOnlyFn((): boolean =>
  (process.env.XENDIT_API_KEY?.trim() ?? '').startsWith('xnd_development'),
)

