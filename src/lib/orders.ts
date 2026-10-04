import type { Order, OrderItem, PaymentMethod } from '../types'
import { dayKey } from './format'

const STORAGE_KEY = 'warung-pos.orders.v1'

const listeners = new Set<() => void>()

/** Raw orders as stored, newest first. Kept stable between writes so it can be
 * handed straight to useSyncExternalStore. */
let cache: Order[] | null = null

function isOrder(value: unknown): value is Order {
  if (typeof value !== 'object' || value === null) return false
  const o = value as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.orderNumber === 'string' &&
    typeof o.createdAt === 'string' &&
    Array.isArray(o.items) &&
    typeof o.total === 'number'
  )
}

function read(): Order[] {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    const stored: Order[] = Array.isArray(parsed) ? parsed.filter(isOrder) : []
    cache = [...stored].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  } catch {
    cache = []
  }
  return cache
}

function write(orders: Order[]): void {
  cache = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders))
  } catch {
    // Storage full or unavailable: keep the in-memory cache so the session still works.
  }
  listeners.forEach((listener) => listener())
}

function nextOrderNumber(orders: Order[]): string {
  const today = dayKey(new Date().toISOString())
  const todayCount = orders.filter((order) => dayKey(order.createdAt) === today).length
  return `ORD-${String(todayCount + 1).padStart(3, '0')}`
}

export function listOrders(): Order[] {
  return read()
}

export function getOrder(id: string): Order | undefined {
  return read().find((order) => order.id === id)
}

export function createOrder(input: {
  items: OrderItem[]
  total: number
  paymentMethod: PaymentMethod
  amountPaid: number | null
  change: number | null
}): Order {
  const orders = read()
  const now = new Date().toISOString()
  const order: Order = {
    id: crypto.randomUUID(),
    orderNumber: nextOrderNumber(orders),
    createdAt: now,
    items: input.items,
    subtotal: input.items.reduce((sum, item) => sum + item.price * item.qty, 0),
    total: input.total,
    paymentMethod: input.paymentMethod,
    amountPaid: input.amountPaid,
    change: input.change,
  }
  write([order, ...orders])
  return order
}

/** Stable snapshot for useSyncExternalStore. */
export function getOrdersSnapshot(): Order[] {
  return read()
}

/** Subscribe to storage changes so order views stay in sync. Returns an unsubscribe fn. */
export function subscribeToOrders(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
