import { describe, expect, it } from 'vitest'
import { AppError, isAppError, mapAppError } from '../src/shared/lib/app-error'
import { checkoutRejectionMessage } from '../src/features/checkout/checkout.outcome'

describe('AppError', () => {
  it('carries a stable code beside the user-facing message', () => {
    const error = new AppError('payment-invalid', 'Uang diterima kurang dari total bayar')
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('AppError')
    expect(error.code).toBe('payment-invalid')
    expect(error.message).toBe('Uang diterima kurang dari total bayar')
  })

  it('recognises AppError instances and wire-shaped lookalikes', () => {
    expect(isAppError(new AppError('validation', 'Format email tidak valid'))).toBe(true)
    expect(
      isAppError({ name: 'AppError', code: 'validation', message: 'Format email tidak valid' }),
    ).toBe(true)
    expect(isAppError(new Error('Format email tidak valid'))).toBe(false)
    expect(isAppError(null)).toBe(false)
  })

  it('maps an AppError to its user message without parsing message JSON', () => {
    expect(mapAppError(new AppError('validation', 'Format email tidak valid'))).toBe(
      'Format email tidak valid',
    )
    expect(mapAppError(new Error(JSON.stringify([{ message: 'Format email tidak valid' }])))).toBe(
      undefined,
    )
  })
})

describe('checkout rejection messages', () => {
  it('maps each expected checkout outcome to the cashier-facing copy', () => {
    expect(checkoutRejectionMessage({ kind: 'empty-cart' })).toBe(
      'Keranjang masih kosong. Tambah produk terlebih dahulu.',
    )
    expect(
      checkoutRejectionMessage({
        kind: 'product-missing',
        message: 'Produk "Nasi" sudah tidak ada di katalog; hapus dari keranjang',
      }),
    ).toBe('Produk "Nasi" sudah tidak ada di katalog; hapus dari keranjang')
    expect(
      checkoutRejectionMessage({
        kind: 'payment-invalid',
        message: 'Uang diterima kurang dari total bayar',
      }),
    ).toBe('Uang diterima kurang dari total bayar')
  })
})
