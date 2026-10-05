import type { Order, OrderItem, PaymentMethod, SalesChannel } from '../types'
import { applyStockForOrder } from './products'
import { currentShift } from './shifts'

const STORAGE_KEY = 'warung-pos.orders.v2'
const LEGACY_STORAGE_KEY = 'warung-pos.orders.v1'
const SEQUENCE_KEY = 'warung-pos.order-seq.v1'

const listeners = new Set<() => void>()

/** Raw orders as stored, newest first. Kept stable between writes so it can be
 * handed straight to useSyncExternalStore. */
let cache: Order[] | null = null

function isOrderItem(value: unknown): value is OrderItem {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Record<string, unknown>
  return (
    typeof item.productId === 'string' &&
    typeof item.name === 'string' &&
    typeof item.price === 'number' &&
    typeof item.qty === 'number'
  )
}

/** Orders saved before HPP existed get `cost: 0` so profit stays computable. */
function normalizeItem(value: unknown): OrderItem | null {
  if (!isOrderItem(value)) return null
  return { ...value, cost: typeof value.cost === 'number' && value.cost >= 0 ? value.cost : 0 }
}

/** Fills fields added after v1 so old records keep working. */
function normalizeOrder(value: unknown): Order | null {
  if (typeof value !== 'object' || value === null) return null
  const o = value as Record<string, unknown>
  if (
    typeof o.id !== 'string' ||
    typeof o.orderNumber !== 'string' ||
    typeof o.createdAt !== 'string' ||
    !Array.isArray(o.items) ||
    typeof o.total !== 'number'
  ) {
    return null
  }
  const items = o.items
    .map(normalizeItem)
    .filter((item): item is OrderItem => item !== null)
  const subtotal = typeof o.subtotal === 'number' ? o.subtotal : items.reduce((sum, item) => sum + item.price * item.qty, 0)
  const discount = typeof o.discount === 'number' ? o.discount : Math.max(0, subtotal - o.total)
  const total = o.total
  const costTotal =
    typeof o.costTotal === 'number'
      ? o.costTotal
      : items.reduce((sum, item) => sum + item.cost * item.qty, 0)
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    createdAt: o.createdAt,
    items,
    subtotal,
    discount,
    total,
    costTotal,
    // Recomputed rather than trusted, so legacy rows still report a margin.
    profit: typeof o.profit === 'number' ? o.profit : total - costTotal,
    paymentMethod: o.paymentMethod as PaymentMethod,
    amountPaid: typeof o.amountPaid === 'number' ? o.amountPaid : null,
    change: typeof o.change === 'number' ? o.change : null,
    // Orders written before voiding existed are all completed sales.
    status: o.status === 'void' ? 'void' : 'paid',
    // Orders written before channels existed were counter sales.
    channel:
      o.channel === 'bungkus' || o.channel === 'ojol' || o.channel === 'dine-in' ? o.channel : 'dine-in',
    ...(typeof o.cashier === 'string' && o.cashier !== '' ? { cashier: o.cashier } : {}),
    ...(typeof o.shiftId === 'string' && o.shiftId !== '' ? { shiftId: o.shiftId } : {}),
    ...(typeof o.voidedAt === 'string' ? { voidedAt: o.voidedAt } : {}),
    ...(typeof o.voidReason === 'string' ? { voidReason: o.voidReason } : {}),
  }
}

/** Reads the v1 key once and rewrites it under v2. Idempotent: v2 wins if present. */
function migrateLegacy(): Order[] {
  try {
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!legacy) return []
    const parsed: unknown = JSON.parse(legacy)
    const orders = Array.isArray(parsed)
      ? parsed.map(normalizeOrder).filter((order): order is Order => order !== null)
      : []
    if (orders.length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(orders))
    localStorage.removeItem(LEGACY_STORAGE_KEY)
    return orders
  } catch {
    return []
  }
}

function read(): Order[] {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) {
      cache = sortNewestFirst(migrateLegacy())
      return cache
    }
    const parsed: unknown = JSON.parse(raw)
    const stored = Array.isArray(parsed)
      ? parsed.map(normalizeOrder).filter((order): order is Order => order !== null)
      : []
    cache = sortNewestFirst(stored)
  } catch {
    cache = []
  }
  return cache
}

function sortNewestFirst(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function write(orders: Order[]): void {
  cache = sortNewestFirst(orders)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders))
  } catch {
    // Storage full or unavailable: keep the in-memory cache so the session still works.
  }
  listeners.forEach((listener) => listener())
}

/**
 * Monotonic order number.
 *
 * The sequence is persisted separately from the order list, so deleting or
 * voiding the highest order can never hand its number to a later sale. The
 * orders list is also consulted, which keeps numbering correct when orders
 * arrive from elsewhere (e.g. a restored backup).
 */
function nextOrderNumber(orders: Order[]): string {
  const highestIssued = orders.reduce((max, order) => {
    const match = /^ORD-(\d+)$/.exec(order.orderNumber)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)
  const next = Math.max(readSequence(), highestIssued) + 1
  writeSequence(next)
  return `ORD-${String(next).padStart(3, '0')}`
}

function readSequence(): number {
  try {
    const raw = localStorage.getItem(SEQUENCE_KEY)
    const value = raw === null ? 0 : Number(raw)
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
  } catch {
    return 0
  }
}

function writeSequence(value: number): void {
  try {
    localStorage.setItem(SEQUENCE_KEY, String(value))
  } catch {
    // Storage unavailable: numbering falls back to the order list.
  }
}

export function listOrders(): Order[] {
  return read()
}

export function getOrder(id: string): Order | undefined {
  return read().find((order) => order.id === id)
}

export function createOrder(input: {
  items: OrderItem[]
  discount: number
  paymentMethod: PaymentMethod
  amountPaid: number | null
  change: number | null
  channel: SalesChannel
  cashier?: string
}): Order {
  const orders = read()
  const subtotal = input.items.reduce((sum, item) => sum + item.price * item.qty, 0)
  const discount = Math.min(Math.max(0, Math.round(input.discount)), subtotal)
  const total = subtotal - discount
  const costTotal = input.items.reduce((sum, item) => sum + item.cost * item.qty, 0)
  const activeShift = currentShift()
  const order: Order = {
    id: crypto.randomUUID(),
    orderNumber: nextOrderNumber(orders),
    createdAt: new Date().toISOString(),
    items: input.items,
    subtotal,
    discount,
    total,
    costTotal,
    profit: total - costTotal,
    paymentMethod: input.paymentMethod,
    amountPaid: input.amountPaid,
    change: input.change,
    status: 'paid',
    channel: input.channel,
    ...(input.cashier?.trim() ? { cashier: input.cashier.trim() } : {}),
    // Stamped so a shift close can attribute cash movements to it.
    ...(activeShift ? { shiftId: activeShift.id } : {}),
  }
  write([order, ...orders])
  // Inventory is deducted only after the order is safely persisted.
  applyStockForOrder(order.items, 'sale', order.id)
  return order
}

/**
 * Marks an order as void and returns its items to stock.
 * Idempotent: voiding an already-void order changes nothing.
 */
export function voidOrder(id: string, reason: string): Order | undefined {
  const orders = read()
  const existing = orders.find((order) => order.id === id)
  if (!existing || existing.status === 'void') return existing

  const voided: Order = {
    ...existing,
    status: 'void',
    voidedAt: new Date().toISOString(),
    ...(reason.trim() !== '' ? { voidReason: reason.trim() } : {}),
  }
  write(orders.map((order) => (order.id === id ? voided : order)))
  applyStockForOrder(existing.items, 'void', existing.id)
  return voided
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
