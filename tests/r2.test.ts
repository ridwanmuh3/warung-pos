import { describe, expect, it } from 'vitest'
import { __test } from '../src/lib/r2.server'

const { s3Endpoint, isServableKey } = __test

describe('s3Endpoint', () => {
  const BUCKET = 'devtest-bucket'
  const BASE = 'https://acct.r2.cloudflarestorage.com'

  it('strips a trailing /<bucket> the dashboard adds', () => {
    expect(s3Endpoint(`${BASE}/${BUCKET}`, BUCKET)).toBe(BASE)
    expect(s3Endpoint(`${BASE}/${BUCKET}/`, BUCKET)).toBe(BASE)
  })

  it('leaves a bare endpoint untouched', () => {
    expect(s3Endpoint(BASE, BUCKET)).toBe(BASE)
    expect(s3Endpoint(`${BASE}/`, BUCKET)).toBe(BASE)
  })

  it('does not strip a path that merely ends in the bucket name substring', () => {
    expect(s3Endpoint(`${BASE}/other-${BUCKET}`, BUCKET)).toBe(`${BASE}/other-${BUCKET}`)
  })
})

describe('isServableKey', () => {
  it('serves keys the app itself stores', () => {
    expect(isServableKey('seed/aqua.jpg')).toBe(true)
    expect(isServableKey('products/tenant-1/2b1f.png')).toBe(true)
  })

  it('refuses foreign keys and traversal', () => {
    expect(isServableKey('')).toBe(false)
    expect(isServableKey('/etc/passwd')).toBe(false)
    expect(isServableKey('secret/keys.txt')).toBe(false)
    expect(isServableKey('seed/../../etc/passwd')).toBe(false)
    expect(isServableKey('products/tenant-1/../../../x')).toBe(false)
  })
})
