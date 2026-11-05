import { describe, expect, it } from 'vitest'
import {
  ENABLED_PAYMENT_METHODS,
  isEnabledPaymentMethod,
  validatePayment,
} from '../src/domain/sales/payment'

describe('enabled payment methods', () => {
  it('offers cash, QRIS, and credit only', () => {
    expect(ENABLED_PAYMENT_METHODS).toEqual(['cash', 'qris', 'credit'])
    expect(isEnabledPaymentMethod('cash')).toBe(true)
    expect(isEnabledPaymentMethod('qris')).toBe(true)
    expect(isEnabledPaymentMethod('credit')).toBe(true)
    expect(isEnabledPaymentMethod('transfer')).toBe(false)
  })

  it('rejects a crafted transfer checkout', () => {
    expect(() => validatePayment({ paymentMethod: 'transfer', total: 10000 })).toThrow(
      /tidak tersedia/,
    )
  })

  it('accepts QRIS without cash tendered', () => {
    expect(validatePayment({ paymentMethod: 'qris', total: 10000 })).toMatchObject({
      amountPaid: null,
      change: null,
      settlementStatus: 'settled',
    })
  })
})
