import { expect, it, vi } from 'vitest'

vi.mock('../src/lib/cart.functions', () => ({
  getOpenCartFn: vi.fn(),
  saveCartFn: vi.fn(),
}))

import { clearCart, currentCartItems, setCartItems } from '../src/lib/cart'

it('restores exact cart snapshot after clearing without sharing item references', () => {
  const original = [{ productId: 'item-1', name: 'Teh', price: 5000, cost: 3000, imageKey: null, qty: 2 }]
  setCartItems(original)
  const saved = currentCartItems()
  clearCart()
  expect(currentCartItems()).toEqual([])
  setCartItems(saved)
  expect(currentCartItems()).toEqual(original)
  expect(currentCartItems()[0]).not.toBe(saved[0])
  clearCart()
})
