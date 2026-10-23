/**
 * Best-effort, per-process abuse limiter for unauthenticated auth calls.
 *
 * A single-node warung deployment gets useful protection without a new
 * database table. Multi-instance deployments should put a shared limiter
 * (Redis/DB/WAF) in front of the app; this module deliberately does not pretend
 * to coordinate across processes.
 */

interface Bucket {
  count: number
  resetAt: number
}

export const LOGIN_WINDOW_MS = 15 * 60 * 1000
export const LOGIN_MAX_FAILURES = 5
/** Coarse per-IP ceiling so a spray across many emails still hits a wall. */
export const LOGIN_IP_MAX_FAILURES = 50
export const REGISTER_WINDOW_MS = 60 * 60 * 1000
export const REGISTER_MAX_ATTEMPTS = 10

const MAX_BUCKETS = 10_000
const buckets = new Map<string, Bucket>()

export interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds: number
}

function retryAfter(resetAt: number, now: number): number {
  return Math.max(1, Math.ceil((resetAt - now) / 1000))
}

function sweep(now: number): void {
  if (buckets.size <= MAX_BUCKETS) return
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
  // Still too large: drop the oldest insertion. This is a safety valve, not a
  // correctness guarantee, and keeps memory bounded under a spray of keys.
  while (buckets.size > MAX_BUCKETS) {
    const oldest = buckets.keys().next().value
    if (oldest === undefined) break
    buckets.delete(oldest)
  }
}

/** Peek at the current login bucket without consuming an attempt. */
function peek(key: string, limit: number): RateLimitResult {
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) return { allowed: true, retryAfterSeconds: 0 }
  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSeconds: retryAfter(bucket.resetAt, now) }
  }
  return { allowed: true, retryAfterSeconds: 0 }
}

function hit(key: string, windowMs: number): void {
  const now = Date.now()
  sweep(now)
  const current = buckets.get(key)
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return
  }
  current.count += 1
}

/** Peek at the per-email login bucket. */
export function loginStatus(key: string): RateLimitResult {
  return peek(key, LOGIN_MAX_FAILURES)
}

/** Record one failed login. A successful login should call `clearLogin`. */
export function recordLoginFailure(key: string): void {
  hit(key, LOGIN_WINDOW_MS)
}

/** Peek at the per-IP login bucket. */
export function loginIpStatus(key: string): RateLimitResult {
  return peek(key, LOGIN_IP_MAX_FAILURES)
}

/** Record one failed login against the caller's IP bucket. */
export function recordLoginIpFailure(key: string): void {
  hit(key, LOGIN_WINDOW_MS)
}

export function clearLogin(key: string): void {
  buckets.delete(key)
}

/** Consume one registration attempt for the caller's key. */
export function consumeRegistration(key: string): RateLimitResult {
  const now = Date.now()
  sweep(now)
  const current = buckets.get(key)
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + REGISTER_WINDOW_MS })
    return { allowed: true, retryAfterSeconds: 0 }
  }
  if (current.count >= REGISTER_MAX_ATTEMPTS) {
    return { allowed: false, retryAfterSeconds: retryAfter(current.resetAt, now) }
  }
  current.count += 1
  return { allowed: true, retryAfterSeconds: 0 }
}

/** Test-only hook; production code must not need to reset this state. */
export function resetAuthRateLimitForTests(): void {
  buckets.clear()
}
