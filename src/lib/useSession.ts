import { useEffect, useState } from 'react'
import { getSessionSnapshot, isSessionResolved, refreshSession, subscribeToSession } from './auth.session'
import type { PublicUser } from './auth.server'

/**
 * The signed-in user, resolved from the server session cookie.
 *
 * `undefined` means "not resolved yet" — the app shows a loading shell instead
 * of flashing the sign-in screen while the first request is in flight.
 *
 * Subscribers read the cache only; the single fetch happens here on mount, so a
 * notification can never trigger another fetch.
 */
export function useSession(): PublicUser | null | undefined {
  const [user, setUser] = useState<PublicUser | null | undefined>(
    isSessionResolved() ? getSessionSnapshot() : undefined,
  )

  useEffect(() => {
    let cancelled = false

    const unsubscribe = subscribeToSession(() => {
      if (!cancelled) setUser(getSessionSnapshot())
    })

    if (!isSessionResolved()) {
      refreshSession()
        .then(() => {
          if (!cancelled) setUser(getSessionSnapshot())
        })
        .catch(() => {
          // A failed lookup means "not signed in", never a stuck loading shell.
          if (!cancelled) setUser(null)
        })
    }

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  return user
}
