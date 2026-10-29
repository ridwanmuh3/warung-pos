import { describe, expect, it } from 'vitest'
import { changeQty, demoChange, demoTotal } from '../src/lib/demoCart'

describe('marketing demo (no live checkout)', () => {
  it('adds, removes and clamps product quantities without mutating the old cart', () => {
    const first = changeQty({}, 'indomie', 1)
    const second = changeQty(first, 'indomie', 200)
    expect(first).toEqual({ indomie: 1 })
    expect(second).toEqual({ indomie: 99 })
    expect(changeQty(first, 'indomie', -10)).toEqual({})
  })

  it('totals rupiah and never displays negative change', () => {
    const cart = { indomie: 2, aqua: 1 }
    expect(demoTotal(cart)).toBe(11000)
    expect(demoChange(cart, 10000)).toBe(0)
    expect(demoChange(cart, 20000)).toBe(9000)
  })
})
