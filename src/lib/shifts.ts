import type { Order, Shift } from '../types'

const STORAGE_KEY = 'warung-pos.shifts.v1'

const listeners = new Set<() => void>()

let cache: Shift[] | null = null

function normalizeShift(value: unknown): Shift | null {
  if (typeof value !== 'object' || value === null) return null
  const s = value as Record<string, unknown>
  if (typeof s.id !== 'string' || typeof s.openedAt !== 'string' || typeof s.openingCash !== 'number') {
    return null
  }
  return {
    id: s.id,
    openedAt: s.openedAt,
    openingCash: s.openingCash,
    ...(typeof s.closedAt === 'string' ? { closedAt: s.closedAt } : {}),
    ...(typeof s.closingCash === 'number' ? { closingCash: s.closingCash } : {}),
    ...(typeof s.expectedCash === 'number' ? { expectedCash: s.expectedCash } : {}),
    ...(typeof s.variance === 'number' ? { variance: s.variance } : {}),
    ...(typeof s.note === 'string' && s.note !== '' ? { note: s.note } : {}),
  }
}

function read(): Shift[] {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    cache = Array.isArray(parsed)
      ? parsed.map(normalizeShift).filter((shift): shift is Shift => shift !== null)
      : []
  } catch {
    cache = []
  }
  return cache
}

function write(shifts: Shift[]): void {
  cache = shifts
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shifts))
  } catch {
    // Storage unavailable: keep the in-memory copy so the session still works.
  }
  listeners.forEach((listener) => listener())
}

export function listShifts(): Shift[] {
  return read()
}

export function getShiftsSnapshot(): Shift[] {
  return read()
}

export function subscribeToShifts(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The open shift, or undefined when the drawer has not been opened. */
export function currentShift(): Shift | undefined {
  return read().find((shift) => shift.closedAt === undefined)
}

export function openShift(openingCash: number): Shift {
  const existing = currentShift()
  if (existing) return existing
  const shift: Shift = {
    id: crypto.randomUUID(),
    openedAt: new Date().toISOString(),
    openingCash: Math.max(0, Math.round(openingCash)),
  }
  write([shift, ...read()])
  return shift
}

/**
 * Expected drawer cash: opening float plus cash taken in, minus cash refunded
 * by voided cash orders belonging to this shift.
 */
export function expectedCashFor(shift: Shift, orders: Order[]): number {
  const cashIn = orders
    .filter((order) => order.shiftId === shift.id && order.status === 'paid' && order.paymentMethod === 'tunai')
    .reduce((sum, order) => sum + order.total, 0)
  const cashRefunded = orders
    .filter((order) => order.shiftId === shift.id && order.status === 'void' && order.paymentMethod === 'tunai')
    .reduce((sum, order) => sum + order.total, 0)
  return shift.openingCash + cashIn - cashRefunded
}

export interface ShiftCloseInput {
  countedCash: number
  note?: string
}

export interface ShiftCloseResult {
  shift: Shift
  expectedCash: number
  variance: number
}

/** Closes the open shift with a physical cash count and records the variance. */
export function closeShift(input: ShiftCloseInput, orders: Order[]): ShiftCloseResult | undefined {
  const shift = currentShift()
  if (!shift) return undefined
  const expectedCash = expectedCashFor(shift, orders)
  const counted = Math.max(0, Math.round(input.countedCash))
  const closed: Shift = {
    ...shift,
    closedAt: new Date().toISOString(),
    closingCash: counted,
    expectedCash,
    variance: counted - expectedCash,
    ...(input.note?.trim() ? { note: input.note.trim() } : {}),
  }
  write(read().map((candidate) => (candidate.id === shift.id ? closed : candidate)))
  return { shift: closed, expectedCash, variance: counted - expectedCash }
}
