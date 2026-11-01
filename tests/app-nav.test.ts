import { describe, expect, it } from 'vitest'
import { isActive } from '../src/components/app-nav'

describe('navigasi sidebar', () => {
    it('menandai rute tepat dan turunannya, bukan rute berawalan mirip', () => {
        expect(isActive('/cashier', '/cashier')).toBe(true)
        expect(isActive('/products', '/cashier')).toBe(false)
        expect(isActive('/orders/123', '/orders')).toBe(true)
        expect(isActive('/produksi', '/products')).toBe(false)
    })
})
