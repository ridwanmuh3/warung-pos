import { describe, expect, it } from 'vitest'
import { legacyRedirect } from '../src/lib/legacy-routes'

describe('redirect URL lama', () => {
  it('memetakan path lama ke path English', () => {
    expect(legacyRedirect('/kasir')).toBe('/cashier')
    expect(legacyRedirect('/produk')).toBe('/products')
    expect(legacyRedirect('/keranjang')).toBe('/cart')
    expect(legacyRedirect('/laporan')).toBe('/reports')
    expect(legacyRedirect('/pengaturan')).toBe('/settings')
    expect(legacyRedirect('/masuk')).toBe('/login')
    expect(legacyRedirect('/privasi')).toBe('/privacy')
    expect(legacyRedirect('/ketentuan')).toBe('/terms')
  })

  it('memetakan segmen dinamis dan redirect lama', () => {
    expect(legacyRedirect('/riwayat/ORD-001')).toBe('/orders/ORD-001')
    expect(legacyRedirect('/sukses/ORD-001')).toBe('/order-success/ORD-001')
    expect(legacyRedirect('/beranda')).toBe('/')
    expect(legacyRedirect('/ringkasan')).toBe('/reports?tab=today')
  })

  it('menerjemahkan query param dan nilai enum', () => {
    expect(legacyRedirect('/kasir', '?kategori=makanan&cari=kopi')).toBe(
      '/cashier?category=food&q=kopi',
    )
    expect(legacyRedirect('/produk', '?kategori=minuman&menipis=true')).toBe(
      '/products?category=drink&lowStock=true',
    )
    expect(legacyRedirect('/laporan', '?tab=hari-ini&tanggal=2026-11-01')).toBe(
      '/reports?tab=today&day=2026-11-01',
    )
    expect(legacyRedirect('/riwayat', '?method=tunai&channel=ojol')).toBe(
      '/orders?method=cash&channel=delivery',
    )
  })

  it('mengembalikan null untuk path yang bukan legacy', () => {
    expect(legacyRedirect('/cashier')).toBeNull()
    expect(legacyRedirect('/tidak-ada')).toBeNull()
  })

  it('menerima trailing slash pada URL lama', () => {
    expect(legacyRedirect('/kasir/')).toBe('/cashier')
    expect(legacyRedirect('/riwayat/ORD-001/')).toBe('/orders/ORD-001')
  })
})
