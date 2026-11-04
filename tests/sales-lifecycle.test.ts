import { describe, expect, it } from 'vitest'
import {
  RefundRequiredError,
  canRefund,
  canSettle,
  canVoid,
  isOutstanding,
  voidDecision,
} from '../src/domain/sales/lifecycle'
import type { LifecycleFacts } from '../src/domain/sales/lifecycle'

const facts = (overrides: Partial<LifecycleFacts> = {}): LifecycleFacts => ({
  status: 'paid',
  paymentMethod: 'cash',
  settlementStatus: 'settled',
  ...overrides,
})

const credit = (overrides: Partial<LifecycleFacts> = {}): LifecycleFacts =>
  facts({ paymentMethod: 'credit', settlementStatus: 'unsettled', ...overrides })

describe('credit settlement', () => {
  it('recognises an outstanding credit sale', () => {
    expect(isOutstanding(credit())).toBe(true)
    expect(canSettle(credit())).toBe(true)
  })

  it('rejects cash sales and settled or cancelled credit sales', () => {
    expect(isOutstanding(facts())).toBe(false)
    expect(isOutstanding(credit({ settlementStatus: 'settled' }))).toBe(false)
    expect(isOutstanding(credit({ status: 'void' }))).toBe(false)
    expect(isOutstanding(credit({ status: 'refunded' }))).toBe(false)
  })
})

describe('void vs refund (ADR-0006)', () => {
  it('voids a paid sale while its drawer is open', () => {
    expect(canVoid(facts(), false)).toBe(true)
    expect(voidDecision(facts(), false)).toBe('void')
  })

  it('requires a refund once the drawer has closed', () => {
    expect(canVoid(facts(), true)).toBe(false)
    expect(voidDecision(facts(), true)).toBe('refund')
    expect(canRefund(facts())).toBe(true)
  })

  it('does not cancel an order that is already void or refunded', () => {
    expect(canRefund(facts({ status: 'void' }))).toBe(false)
    expect(canRefund(facts({ status: 'refunded' }))).toBe(false)
    expect(voidDecision(facts({ status: 'void' }), false)).toBe('none')
  })

  it('carries a stable code for the expected failure', () => {
    const error = new RefundRequiredError()
    expect(error).toBeInstanceOf(Error)
    expect(error.code).toBe('refund-required')
    expect(error.message).toContain('refund')
  })
})
