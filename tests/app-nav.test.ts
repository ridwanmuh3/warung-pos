import { describe, expect, it } from 'vitest'
import { isActive } from '../src/components/app-nav'

describe('navigasi sidebar', () => {
    it('menandai rute tepat dan turunannya, bukan rute berawalan mirip', () => {
        expect(isActive('/kasir', '/kasir')).toBe(true)
        expect(isActive('/produk', '/kasir')).toBe(false)
        expect(isActive('/riwayat/123', '/riwayat')).toBe(true)
        expect(isActive('/produksi', '/produk')).toBe(false)
    })
})
