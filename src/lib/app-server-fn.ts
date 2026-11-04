import { z } from 'zod'
import { requireMembership } from './tenant.server'
import type { Role, TenantContext } from './tenant.server'
import { AppError } from '../shared/lib/app-error'

/**
 * Shared helpers for typed server functions.
 *
 * Call sites still use `createServerFn(...).validator(...).handler(...)` so
 * TanStack Start's import-protection plugin can see the `.handler` boundary
 * and allow `*.server.*` imports. These helpers fill in the Phase 5 contract:
 *   1. validate the payload as `AppError` (never JSON-in-message),
 *   2. resolve membership/role,
 *   3. let expected outcomes return normally,
 *   4. rethrow `AppError`s and wrap anything else consistently.
 */

/** Zod → function validator that throws `AppError` instead of JSON Error. */
export function appValidator<T>(schema: z.ZodType<T>): (input: unknown) => T {
  return (input: unknown): T => {
    const parsed = schema.safeParse(input)
    if (!parsed.success) {
      throw new AppError(
        'validation',
        parsed.error.issues[0]?.message ?? 'Input tidak valid',
      )
    }
    return parsed.data
  }
}

/** Resolve membership, run the handler, and normalise unexpected errors. */
export async function withAppHandler<T>(
  minRole: Role,
  run: (ctx: TenantContext) => Promise<T>,
): Promise<T> {
  try {
    const ctx = await requireMembership(minRole)
    return await run(ctx)
  } catch (cause) {
    if (cause instanceof AppError) throw cause
    throw new AppError(
      'unexpected',
      cause instanceof Error ? cause.message : 'Terjadi kesalahan tidak terduga',
    )
  }
}
