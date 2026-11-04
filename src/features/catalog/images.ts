/**
 * Product-image key ownership.
 *
 * An image key is one of:
 * - `null` — the placeholder;
 * - a shared `seed/` key shipped with the app;
 * - an upload under this tenant's own `products/<tenantId>/` prefix;
 * - anything else — a foreign key a crafted request must not attach to a
 *   product.
 *
 * Pure so the policy is testable without R2 or a session.
 */

export type ImageKeyOwner = 'none' | 'seed' | 'tenant' | 'foreign'

export function imageKeyOwner(tenantId: string, key: string | null): ImageKeyOwner {
  if (key === null) return 'none'
  if (key.startsWith('seed/')) return 'seed'
  if (key.startsWith(`products/${tenantId}/`)) return 'tenant'
  return 'foreign'
}

/** True only for an upload this tenant owns; seed keys stay shared. */
export function isTenantImageKey(tenantId: string, key: string): boolean {
  return imageKeyOwner(tenantId, key) === 'tenant'
}
