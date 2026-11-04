/**
 * Application error with a stable machine-readable `code`.
 *
 * Expected failures that the client only displays (validation, shift cash
 * input) are thrown as `AppError`. Failures the client branches on
 * (empty cart, product gone, void→refund) are returned as typed outcomes
 * instead — see Phase 5 of `docs/architecture-v2.md`.
 *
 * Unexpected errors are wrapped at the server boundary so the client never
 * sees a raw stack, and can still show `message` by `code`.
 */

export class AppError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'AppError'
    this.code = code
  }
}

/** True for a real `AppError` or a seroval-deserialized lookalike. */
export function isAppError(cause: unknown): cause is AppError {
  if (cause instanceof AppError) return true
  if (typeof cause !== 'object' || cause === null) return false
  const candidate = cause as { name?: unknown; code?: unknown; message?: unknown }
  return (
    candidate.name === 'AppError' &&
    typeof candidate.code === 'string' &&
    typeof candidate.message === 'string'
  )
}

/** User-facing message when `cause` is an AppError; otherwise `undefined`. */
export function mapAppError(cause: unknown): string | undefined {
  return isAppError(cause) ? cause.message : undefined
}
