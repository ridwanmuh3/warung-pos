import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { isXenditConfigured, isXenditTestMode } from '../src/lib/env.server'

/**
 * The sandbox "Simulasikan Pembayaran" action is gated on the credential, not
 * on `NODE_ENV`: a deployed sandbox is a production build, and that is exactly
 * where the button has to work. These tests pin the gate so a future change
 * cannot quietly expose simulation on a live key.
 */

const savedKey = process.env.XENDIT_API_KEY
const savedLive = process.env.XENDIT_LIVE

beforeEach(() => {
  delete process.env.XENDIT_LIVE
})

afterEach(() => {
  if (savedKey === undefined) delete process.env.XENDIT_API_KEY
  else process.env.XENDIT_API_KEY = savedKey
  if (savedLive === undefined) delete process.env.XENDIT_LIVE
  else process.env.XENDIT_LIVE = savedLive
})

describe('Xendit test-mode detection', () => {
  it('is true for a development key, whatever the runtime', () => {
    process.env.XENDIT_API_KEY = 'xnd_development_example'
    process.env.NODE_ENV = 'production'
    expect(isXenditTestMode()).toBe(true)
  })

  it('is false for a production key, even with XENDIT_LIVE', () => {
    process.env.XENDIT_API_KEY = 'xnd_production_example'
    process.env.XENDIT_LIVE = 'true'
    expect(isXenditTestMode()).toBe(false)
  })

  it('is false when the key is missing', () => {
    delete process.env.XENDIT_API_KEY
    expect(isXenditTestMode()).toBe(false)
  })

  it('is false for a blank key', () => {
    process.env.XENDIT_API_KEY = '   '
    expect(isXenditTestMode()).toBe(false)
  })

  it('never throws for a production key without XENDIT_LIVE', () => {
    // `xenditEnv()` deliberately throws here; the capability helper must not,
    // because it runs while rendering an ordinary page.
    process.env.XENDIT_API_KEY = 'xnd_production_example'
    expect(() => isXenditTestMode()).not.toThrow()
    expect(isXenditTestMode()).toBe(false)
  })
})

describe('QRIS availability', () => {
  it('tracks whether any key is configured', () => {
    process.env.XENDIT_API_KEY = 'xnd_development_example'
    expect(isXenditConfigured()).toBe(true)
    delete process.env.XENDIT_API_KEY
    expect(isXenditConfigured()).toBe(false)
  })
})
