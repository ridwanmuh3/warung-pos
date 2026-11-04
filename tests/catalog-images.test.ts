import { describe, expect, it } from 'vitest'
import { imageKeyOwner, isTenantImageKey } from '../src/features/catalog/images'

const TENANT = 'tenant-a'
const OTHER = 'tenant-b'

describe('product image key ownership', () => {
  it('treats null as the placeholder', () => {
    expect(imageKeyOwner(TENANT, null)).toBe('none')
  })

  it('keeps shared seed keys', () => {
    expect(imageKeyOwner(TENANT, 'seed/aqua.jpg')).toBe('seed')
    expect(imageKeyOwner(OTHER, 'seed/aqua.jpg')).toBe('seed')
  })

  it('owns only uploads under this tenant prefix', () => {
    expect(imageKeyOwner(TENANT, `products/${TENANT}/photo.png`)).toBe('tenant')
    expect(isTenantImageKey(TENANT, `products/${TENANT}/photo.png`)).toBe(true)
  })

  it('refuses another tenant upload', () => {
    expect(imageKeyOwner(TENANT, `products/${OTHER}/photo.png`)).toBe('foreign')
    expect(isTenantImageKey(TENANT, `products/${OTHER}/photo.png`)).toBe(false)
  })

  it('refuses arbitrary prefixes that only look like uploads', () => {
    expect(imageKeyOwner(TENANT, 'products/tenant-a-evil/photo.png')).toBe('foreign')
    expect(imageKeyOwner(TENANT, 'secret/photo.png')).toBe('foreign')
  })
})
