import { describe, expect, it } from 'vitest'
import { __test } from '../src/lib/r2.server'

const { s3Endpoint, isServableKey, isAllowedImageContentType } = __test

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
    expect(isServableKey('seed/a.jpg?x=1')).toBe(false)
    expect(isServableKey('seed/a.jpg\\..\\x')).toBe(false)
  })
})

describe('isAllowedImageContentType', () => {
  it('allows only the exact raster types the uploader signs', () => {
    expect(isAllowedImageContentType('image/jpeg')).toBe(true)
    expect(isAllowedImageContentType('image/png')).toBe(true)
    expect(isAllowedImageContentType('image/webp')).toBe(true)
  })

  it('rejects SVG, HTML, and prefix lookalikes', () => {
    expect(isAllowedImageContentType('image/svg+xml')).toBe(false)
    expect(isAllowedImageContentType('text/html')).toBe(false)
    expect(isAllowedImageContentType('image/png; charset=utf-8')).toBe(false)
  })
})
