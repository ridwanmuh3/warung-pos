import { useSyncExternalStore } from 'react'
import { getSessionSnapshot, subscribeToSession } from './auth'
import type { SessionUser } from './auth'

/** The signed-in user, or `null`. Re-renders on login/logout. */
export function useSession(): SessionUser | null {
  return useSyncExternalStore(subscribeToSession, getSessionSnapshot, getSessionSnapshot)
}
