import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TENANT_NAME,
  GUIDE_VERSION,
  guideStorageKey,
  hasSeenGuide,
  markGuideSeen,
  setupProgress,
} from '../src/lib/onboarding'

function memoryStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
}

describe('setup progress', () => {
  it('starts at the shop name when the tenant still has the default name', () => {
    const progress = setupProgress({
      tenantName: DEFAULT_TENANT_NAME,
      productCount: 0,
      shiftCount: 0,
    })

    expect(progress.doneCount).toBe(0)
    expect(progress.complete).toBe(false)
    expect(progress.next?.key).toBe('name')
  })

  it('treats a blank name as not set', () => {
    const progress = setupProgress({ tenantName: '   ', productCount: 1, shiftCount: 1 })

    expect(progress.steps.find((step) => step.key === 'name')?.done).toBe(false)
    expect(progress.next?.key).toBe('name')
  })

  it('moves to the first unfinished step', () => {
    const progress = setupProgress({
      tenantName: 'Warung Bu Siti',
      productCount: 2,
      shiftCount: 0,
    })

    expect(progress.doneCount).toBe(2)
    expect(progress.complete).toBe(false)
    expect(progress.next?.key).toBe('shift')
  })

  it('completes after a real name, a product, and one opened shift', () => {
    const progress = setupProgress({
      tenantName: 'Warung Bu Siti',
      productCount: 1,
      shiftCount: 1,
    })

    expect(progress.doneCount).toBe(3)
    expect(progress.complete).toBe(true)
    expect(progress.next).toBeNull()
  })
})

describe('guide seen state', () => {
  it('keys the flag by user and guide version', () => {
    expect(guideStorageKey('user-a')).toContain(`v${GUIDE_VERSION}`)
    expect(guideStorageKey('user-a')).toContain('user-a')
    expect(guideStorageKey('user-a')).not.toBe(guideStorageKey('user-b'))
  })

  it('remembers a dismissal per user', () => {
    const storage = memoryStorage()
    expect(hasSeenGuide('guide-user-a', storage)).toBe(false)

    markGuideSeen('guide-user-a', storage)

    expect(hasSeenGuide('guide-user-a', storage)).toBe(true)
    expect(hasSeenGuide('guide-user-b', storage)).toBe(false)
  })

  it('reads a previously stored flag', () => {
    const storage = memoryStorage()
    storage.setItem(guideStorageKey('guide-user-c'), '1')

    expect(hasSeenGuide('guide-user-c', storage)).toBe(true)
  })
})
