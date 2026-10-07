import { describe, expect, it } from 'vitest'
import { __test } from '../src/lib/r2.server'

const { s3Endpoint } = __test

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
