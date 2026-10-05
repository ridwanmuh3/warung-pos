import { useCallback, useEffect, useState } from 'react'
import { listMembershipsFn, switchTenantFn, tenantContextFn } from './tenant.functions'
import type { MembershipSummary, TenantContext } from './tenant.server'

export interface TenantState {
  context: TenantContext | null
  memberships: MembershipSummary[]
  loading: boolean
  switchTenant: (tenantId: string) => Promise<void>
}

/**
 * The active shop and the shops this user can switch to.
 *
 * The tenant is resolved server-side from the session cookie; this hook only
 * mirrors it for the UI. Switching writes the cookie and reloads, because the
 * cart and every cached list belong to the previous shop.
 */
export function useTenant(): TenantState {
  const [context, setContext] = useState<TenantContext | null>(null)
  const [memberships, setMemberships] = useState<MembershipSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([tenantContextFn(), listMembershipsFn()])
      .then(([nextContext, nextMemberships]) => {
        if (cancelled) return
        setContext(nextContext)
        setMemberships(nextMemberships)
      })
      .catch(() => {
        // A failed lookup leaves the switcher empty; the route guards still hold.
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const switchTenant = useCallback(async (tenantId: string) => {
    await switchTenantFn({ data: { tenantId } })
    // Every cached list and the cart belong to the old shop: start clean.
    if (typeof window !== 'undefined') window.location.assign('/')
  }, [])

  return { context, memberships, loading, switchTenant }
}
