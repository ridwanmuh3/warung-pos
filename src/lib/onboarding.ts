/**
 * First-run guidance state.
 *
 * The setup checklist is derived from real shop data, so it needs no storage
 * and stays correct across devices. The introductory sheet is device-local:
 * it is a one-time explanation, not a permission or a data record, so a
 * versioned localStorage key per user is enough (no schema change).
 */

export const DEFAULT_TENANT_NAME = 'Warung Saya'

/** Bump when the intro changes enough to be worth showing again. */
export const GUIDE_VERSION = 1
export const GUIDE_STORAGE_PREFIX = 'warung-pos.guide'

export type SetupStepKey = 'name' | 'product' | 'shift'

export interface SetupStep {
  key: SetupStepKey
  done: boolean
}

export interface SetupProgress {
  steps: SetupStep[]
  doneCount: number
  complete: boolean
  /** The first unfinished step, or null when setup is complete. */
  next: SetupStep | null
}

export interface SetupInput {
  tenantName: string | null | undefined
  productCount: number
  shiftCount: number
}

function hasRealName(name: string | null | undefined): boolean {
  if (typeof name !== 'string') return false
  const trimmed = name.trim()
  return trimmed !== '' && trimmed !== DEFAULT_TENANT_NAME
}

export function setupProgress({ tenantName, productCount, shiftCount }: SetupInput): SetupProgress {
  const steps: SetupStep[] = [
    { key: 'name', done: hasRealName(tenantName) },
    { key: 'product', done: productCount > 0 },
    { key: 'shift', done: shiftCount > 0 },
  ]
  const doneCount = steps.filter((step) => step.done).length
  return {
    steps,
    doneCount,
    complete: doneCount === steps.length,
    next: steps.find((step) => !step.done) ?? null,
  }
}

/**
 * localStorage keys are per user *and* per guide version. Two cashiers sharing
 * one till each see the intro once; a major guide rewrite can show it again.
 */
export function guideStorageKey(userId: string): string {
  return `${GUIDE_STORAGE_PREFIX}.v${GUIDE_VERSION}.${userId}`
}

interface ReadableStorage {
  getItem: (key: string) => string | null
}

interface WritableStorage extends ReadableStorage {
  setItem: (key: string, value: string) => void
}

/**
 * Keeps the sheet closed for the rest of this tab even when localStorage is
 * unavailable (private mode). Reloading may show it again in that case, which
 * is the least surprising fallback: we cannot remember the choice.
 */
const seenThisSession = new Set<string>()

function resolveStorage<T extends ReadableStorage>(): T | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage as unknown as T
  } catch {
    return null
  }
}

export function hasSeenGuide(userId: string, storage?: ReadableStorage): boolean {
  if (seenThisSession.has(userId)) return true
  const store = storage ?? resolveStorage<ReadableStorage>()
  if (!store) return false
  try {
    return store.getItem(guideStorageKey(userId)) === '1'
  } catch {
    return false
  }
}

export function markGuideSeen(userId: string, storage?: WritableStorage): void {
  seenThisSession.add(userId)
  const store = storage ?? resolveStorage<WritableStorage>()
  if (!store) return
  try {
    store.setItem(guideStorageKey(userId), '1')
  } catch {
    // Storage can be full or blocked; the in-memory marker still covers this session.
  }
}
