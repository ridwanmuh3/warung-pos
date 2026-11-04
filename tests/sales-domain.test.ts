import { describe, expect, it } from 'vitest'
import { priceCart } from '../src/domain/sales/pricing'
import { validatePayment } from '../src/domain/sales/payment'
import type { OrderItem } from '../src/types'

const item = (overrides: Partial<OrderItem> = {}): OrderItem => ({
  productId: 'p1',
  name: 'Indomie',
  imageKey: 'seed/indomie.png',
  price: 3500,
  cost: 2500,
  qty: 2,
  ...overrides,
})

const catalog = [
  { id: 'p1', name: 'Indomie Goreng', price: 4000, cost: 2800, imageKey: 'seed/baru.png' },
]

describe('priceCart', () => {
  it('re-prices lines from the live catalog (ADR-0003)', () => {
    const pricing = priceCart({ items: [item()], catalog, discount: { amount: 0, percent: null } })

    expect(pricing.items[0]).toMatchObject({
      productId: 'p1',
      name: 'Indomie Goreng',
      imageKey: 'seed/baru.png',
      price: 4000,
      cost: 2800,
      qty: 2,
    })
    expect(pricing.subtotal).toBe(8000)
    expect(pricing.costTotal).toBe(5600)
    expect(pricing.profit).toBe(2400)
    expect(pricing.missing).toEqual([])
  })

  it('falls back to the snapshot and reports a missing product', () => {
    const pricing = priceCart({
      items: [item({ productId: 'gone', name: 'Produk Lama' })],
      catalog,
      discount: { amount: 0, percent: null },
    })

    expect(pricing.items[0]).toMatchObject({ name: 'Produk Lama', price: 3500 })
    expect(pricing.missing.map((line) => line.productId)).toEqual(['gone'])
  })

  it('applies percent discount ahead of amount and clamps to subtotal', () => {
    const pricing = priceCart({
      items: [item({ price: 5000, qty: 2 })],
      catalog: [],
      discount: { amount: 999_999, percent: 10 },
    })

    expect(pricing.subtotal).toBe(10_000)
    expect(pricing.discount).toBe(1000)
    expect(pricing.total).toBe(9000)
  })

  it('never lets the total go negative', () => {
    const pricing = priceCart({
      items: [item({ price: 5000, qty: 1 })],
      catalog: [],
      discount: { amount: 999_999, percent: null },
    })

    expect(pricing.discount).toBe(5000)
    expect(pricing.total).toBe(0)
  })
})

describe('validatePayment', () => {
  it('derives change for a cash sale', () => {
    expect(validatePayment({ paymentMethod: 'cash', total: 16_000, amountPaid: 20_000 })).toEqual({
      amountPaid: 20_000,
      change: 4000,
      customerName: '',
      settlementStatus: 'settled',
    })
  })

  it('accepts exact cash', () => {
    expect(validatePayment({ paymentMethod: 'cash', total: 16_000, amountPaid: 16_000 }).change).toBe(0)
  })

  it('rejects cash below the total', () => {
    expect(() => validatePayment({ paymentMethod: 'cash', total: 16_000, amountPaid: 15_999 })).toThrow(
      'Uang diterima kurang dari total bayar',
    )
  })

  it('rejects cash with no amount', () => {
    expect(() => validatePayment({ paymentMethod: 'cash', total: 16_000, amountPaid: null })).toThrow(
      'Uang diterima kurang dari total bayar',
    )
  })

  it('requires a customer name for credit and ignores tendered cash', () => {
    expect(() => validatePayment({ paymentMethod: 'credit', total: 16_000, customerName: '   ' })).toThrow(
      'Nama pelanggan wajib diisi untuk pembayaran ngutang',
    )

    expect(
      validatePayment({
        paymentMethod: 'credit',
        total: 16_000,
        amountPaid: 20_000,
        customerName: '  Bu Siti  ',
      }),
    ).toEqual({
      amountPaid: null,
      change: null,
      customerName: 'Bu Siti',
      settlementStatus: 'unsettled',
    })
  })

  it('treats non-cash methods as settled with no change', () => {
    expect(validatePayment({ paymentMethod: 'qris', total: 16_000, amountPaid: 20_000 })).toEqual({
      amountPaid: null,
      change: null,
      customerName: '',
      settlementStatus: 'settled',
    })
  })
})
