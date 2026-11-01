import { describe, expect, it } from 'vitest'
import { isPublicPath } from '../src/lib/public-routes'

describe('rute publik', () => {
  it('membuka halaman pemasaran tanpa sesi', () => {
    expect(isPublicPath('/beranda')).toBe(true)
    expect(isPublicPath('/sitemap')).toBe(true)
    expect(isPublicPath('/privacy')).toBe(true)
    expect(isPublicPath('/terms')).toBe(true)
    expect(isPublicPath('/login')).toBe(true)
  })

  it('menjaga rute aplikasi tetap di balik gerbang sesi', () => {
    expect(isPublicPath('/')).toBe(true)
    expect(isPublicPath('/products')).toBe(false)
    expect(isPublicPath('/checkout')).toBe(false)
    expect(isPublicPath('/cashier')).toBe(false)
    expect(isPublicPath('/reports')).toBe(false)
  })

  it('tidak membuka path yang hanya mirip', () => {
    expect(isPublicPath('/berandax')).toBe(false)
    expect(isPublicPath('/beranda/')).toBe(false)
    expect(isPublicPath('/privacy-lama')).toBe(false)
  })
})
