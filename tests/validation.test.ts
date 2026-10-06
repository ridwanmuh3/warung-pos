import { describe, expect, it } from 'vitest'
import { discountValue, marginPercent } from '../src/lib/totals'
import { checkoutSchema, parseCheckoutForm, productDraftSchema } from '../src/lib/validation'

describe('discountValue (totals)', () => {
  it('percent takes precedence over amount', () => {
    expect(discountValue(10000, { amount: 999999, percent: 10 })).toBe(1000)
  })
  it('clamps to the subtotal', () => {
    expect(discountValue(9000, { amount: 999999, percent: null })).toBe(9000)
  })
  it('never goes negative', () => {
    expect(discountValue(9000, { amount: -500, percent: null })).toBe(0)
  })
})

describe('parseCheckoutForm', () => {
  const base = {
    paymentMethod: 'tunai',
    channel: 'dine-in',
    cashier: '',
    discountMode: 'rupiah',
    discountInput: '2000',
    cashInput: '20000',
    total: 16000,
  } as const

  it('parses a valid cash checkout', () => {
    const parsed = parseCheckoutForm(base)
    expect(parsed.discountAmount).toBe(2000)
    expect(parsed.discountPercent).toBeNull()
    expect(parsed.cashTendered).toBe(20000)
  })

  it('rejects cash below the total', () => {
    expect(() => parseCheckoutForm({ ...base, cashInput: '1000' })).toThrow()
  })

  it('rejects a percent above 100', () => {
    expect(() =>
      parseCheckoutForm({ ...base, discountMode: 'persen', discountInput: '150' }),
    ).toThrow()
  })
})

describe('input sanitisation (checkoutSchema)', () => {
  it('strips markup from the cashier name', () => {
    const parsed = checkoutSchema.parse({
      paymentMethod: 'qris',
      channel: 'dine-in',
      cashier: '<script>alert(1)</script>Siti',
      discountAmount: 0,
      discountPercent: null,
      cashTendered: null,
      total: 1000,
    })
    expect(parsed.cashier).not.toContain('<')
    expect(parsed.cashier).not.toContain('>')
  })
})

describe('productDraftSchema', () => {
  it('empty stock string means not stock-tracked (null), not zero', () => {
    const parsed = productDraftSchema.parse({
      name: 'Kopi',
      price: '5000',
      cost: '3000',
      category: 'minuman',
      emoji: '☕',
      stock: '',
      lowStockThreshold: '5',
      sku: '',
      barcode: '',
    })
    expect(parsed.stock).toBeNull()
  })
})

describe('marginPercent', () => {
  it('is 0 when there is no revenue (no division by zero)', () => {
    expect(marginPercent(0, 0)).toBe(0)
  })
  it('rounds to whole percents', () => {
    expect(marginPercent(7000, 18000)).toBe(39)
  })
})
