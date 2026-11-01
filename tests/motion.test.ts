import { describe, expect, it } from 'vitest'
import { stepFromProgress } from '../src/lib/motion'

describe('stepFromProgress', () => {
  it('walks four events in equal quarters', () => {
    expect(stepFromProgress(0, 4)).toBe(0)
    expect(stepFromProgress(0.24, 4)).toBe(0)
    expect(stepFromProgress(0.25, 4)).toBe(1)
    expect(stepFromProgress(0.49, 4)).toBe(1)
    expect(stepFromProgress(0.5, 4)).toBe(2)
    expect(stepFromProgress(0.74, 4)).toBe(2)
    expect(stepFromProgress(0.75, 4)).toBe(3)
    expect(stepFromProgress(1, 4)).toBe(3)
  })

  it('clamps progress outside the scrollable range', () => {
    expect(stepFromProgress(-1, 4)).toBe(0)
    expect(stepFromProgress(2, 4)).toBe(3)
  })

  it('treats non-finite progress as the start', () => {
    expect(stepFromProgress(Number.NaN, 4)).toBe(0)
    expect(stepFromProgress(Number.POSITIVE_INFINITY, 4)).toBe(0)
  })

  it('has a safe answer when there is nothing to step through', () => {
    expect(stepFromProgress(0.8, 1)).toBe(0)
    expect(stepFromProgress(0.8, 0)).toBe(0)
  })
})
