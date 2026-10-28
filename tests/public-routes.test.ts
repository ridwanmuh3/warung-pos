import { describe, expect, it } from 'vitest'
import { isPublicPath } from '../src/lib/public-routes'

describe('rute publik', () => {
  it('membuka halaman pemasaran tanpa sesi', () => {
    expect(isPublicPath('/beranda')).toBe(true)
    expect(isPublicPath('/sitemap')).toBe(true)
    expect(isPublicPath('/privasi')).toBe(true)
    expect(isPublicPath('/ketentuan')).toBe(true)
    expect(isPublicPath('/masuk')).toBe(true)
  })

  it('menjaga rute aplikasi tetap di balik gerbang sesi', () => {
    expect(isPublicPath('/')).toBe(false)
    expect(isPublicPath('/produk')).toBe(false)
    expect(isPublicPath('/checkout')).toBe(false)
    expect(isPublicPath('/laporan')).toBe(false)
  })

  it('tidak membuka path yang hanya mirip', () => {
    expect(isPublicPath('/berandax')).toBe(false)
    expect(isPublicPath('/beranda/')).toBe(false)
    expect(isPublicPath('/privasi-lama')).toBe(false)
  })
})
