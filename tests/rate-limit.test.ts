import { beforeEach, describe, expect, it } from 'vitest'
import {
  consumeRegistration,
  LOGIN_IP_MAX_FAILURES,
  LOGIN_MAX_FAILURES,
  loginIpStatus,
  loginStatus,
  recordLoginFailure,
  recordLoginIpFailure,
  REGISTER_MAX_ATTEMPTS,
  resetAuthRateLimitForTests,
  clearLogin,
} from '../src/lib/rate-limit.server'

beforeEach(() => {
  resetAuthRateLimitForTests()
})

describe('login limiter', () => {
  it('allows attempts until the failure budget is spent', () => {
    const key = 'login:user@example.com:127.0.0.1'
    for (let attempt = 0; attempt < LOGIN_MAX_FAILURES; attempt += 1) {
      expect(loginStatus(key).allowed).toBe(true)
      recordLoginFailure(key)
    }
    const blocked = loginStatus(key)
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('clears the budget after a successful login', () => {
    const key = 'login:user@example.com:127.0.0.1'
    recordLoginFailure(key)
    recordLoginFailure(key)
    clearLogin(key)
    expect(loginStatus(key).allowed).toBe(true)
  })

  it('caps a spray across many emails by IP', () => {
    const key = 'login-ip:127.0.0.1'
    for (let attempt = 0; attempt < LOGIN_IP_MAX_FAILURES; attempt += 1) {
      expect(loginIpStatus(key).allowed).toBe(true)
      recordLoginIpFailure(key)
    }
    expect(loginIpStatus(key).allowed).toBe(false)
  })
})

describe('registration limiter', () => {
  it('caps registrations per key and window', () => {
    for (let attempt = 0; attempt < REGISTER_MAX_ATTEMPTS; attempt += 1) {
      expect(consumeRegistration('register:127.0.0.1').allowed).toBe(true)
    }
    expect(consumeRegistration('register:127.0.0.1').allowed).toBe(false)
  })
})
