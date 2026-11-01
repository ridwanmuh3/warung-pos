import { describe, expect, it } from 'vitest'
import { csvField } from '../src/lib/reporting'
import { sessionSecret } from '../src/lib/env.server'
import {
  entityId,
  imageKeySchema,
  orderItemSchema,
  orderItemsSchema,
  safeInternalPath,
} from '../src/lib/validation'
import { securityHeaders } from '../src/lib/security-headers'

describe('input bounds', () => {
  it('rejects oversized row ids before they reach a query', () => {
    expect(entityId.safeParse('x'.repeat(100)).success).toBe(true)
    expect(entityId.safeParse('x'.repeat(101)).success).toBe(false)
  })

  it('caps cart / legacy line arrays', () => {
    const item = {
      productId: 'p1',
      name: 'Kopi',
      imageKey: 'seed/aqua.jpg',
      price: 5000,
      qty: 1,
      cost: 3000,
    }
    expect(orderItemSchema.safeParse(item).success).toBe(true)
    expect(orderItemsSchema.safeParse(Array.from({ length: 200 }, () => item)).success).toBe(true)
    expect(orderItemsSchema.safeParse(Array.from({ length: 201 }, () => item)).success).toBe(false)
  })

  it('rejects unsafe image keys and accepts app-owned prefixes', () => {
    expect(imageKeySchema.safeParse('seed/aqua.jpg').success).toBe(true)
    expect(imageKeySchema.safeParse('products/tenant-1/a.png').success).toBe(true)
    expect(imageKeySchema.safeParse('products/../secret.png').success).toBe(false)
    expect(imageKeySchema.safeParse('https://evil.example/a.png').success).toBe(false)
    expect(imageKeySchema.safeParse('/etc/passwd').success).toBe(false)
  })
})

describe('safeInternalPath', () => {
  it('allows only same-origin absolute paths', () => {
    expect(safeInternalPath('/')).toBe('/')
    expect(safeInternalPath('/cashier?tab=1')).toBe('/cashier?tab=1')
    expect(safeInternalPath('  /settings  ')).toBe('/settings')
  })

  it('rejects protocol-relative, absolute, encoded-slash, and control-character targets', () => {
    expect(safeInternalPath('https://evil.example')).toBeNull()
    expect(safeInternalPath('//evil.example')).toBeNull()
    expect(safeInternalPath('/\\evil.example')).toBeNull()
    expect(safeInternalPath('/%2f%2fevil.example')).toBeNull()
    expect(safeInternalPath('/%5cevil.example')).toBeNull()
    expect(safeInternalPath('/ok\nLocation: https://evil.example')).toBeNull()
    expect(safeInternalPath('')).toBeNull()
    expect(safeInternalPath(null)).toBeNull()
  })
})

describe('CSV formula injection', () => {
  it('keeps numeric negatives numeric', () => {
    expect(csvField(-500)).toBe('-500')
  })

  it('prefixes formula introducers in text cells', () => {
    expect(csvField('=1+1')).toBe("'=1+1")
    expect(csvField('=HYPERLINK("https://evil.example")')).toBe(
      '"\'=HYPERLINK(""https://evil.example"")"',
    )
    expect(csvField('+1+1')).toBe("'+1+1")
    expect(csvField('-1+1')).toBe("'-1+1")
    expect(csvField('@SUM(1,1)')).toBe("\"'@SUM(1,1)\"")
    expect(csvField('\t=1+1')).toBe("'\t=1+1")
    expect(csvField('\r=1+1')).toBe("\"'\r=1+1\"")
  })

  it('still quotes commas, quotes, and newlines', () => {
    expect(csvField('a,b')).toBe('"a,b"')
    expect(csvField('a"b')).toBe('"a""b"')
    expect(csvField('a\nb')).toBe('"a\nb"')
  })
})

describe('session secret', () => {
  it('rejects missing or short values', () => {
    const original = process.env.SESSION_SECRET
    try {
      delete process.env.SESSION_SECRET
      expect(() => sessionSecret()).toThrow('SESSION_SECRET')
      process.env.SESSION_SECRET = 'too-short'
      expect(() => sessionSecret()).toThrow('at least 32')
      process.env.SESSION_SECRET = 'a'.repeat(32)
      expect(sessionSecret()).toHaveLength(32)
    } finally {
      if (original === undefined) delete process.env.SESSION_SECRET
      else process.env.SESSION_SECRET = original
    }
  })
})

describe('response security headers', () => {
  it('sets the baseline hardening headers in development', () => {
    const headers = securityHeaders({ production: false })
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
    expect(headers['X-Frame-Options']).toBe('DENY')
    expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'")
    expect(headers['Content-Security-Policy']).toContain("object-src 'none'")
    expect(headers['Strict-Transport-Security']).toBeUndefined()
  })

  it('adds HSTS only in production', () => {
    const headers = securityHeaders({ production: true })
    expect(headers['Strict-Transport-Security']).toContain('max-age=31536000')
  })
})
