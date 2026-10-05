import { useSyncExternalStore } from 'react'
import type { OrderItem, Product } from '../types'

export interface CartState {
  items: OrderItem[]
  total: number
  count: number
}

const STORAGE_KEY = 'warung-pos.cart.v1'

const listeners = new Set<() => void>()

/** Server snapshot: the cart lives in the browser, so SSR always sees it empty.
 * Passing this as `getServerSnapshot` keeps hydration consistent with the
 * persisted cart instead of flashing a stale badge. */
const EMPTY_SNAPSHOT: CartState = Object.freeze({ items: [], total: 0, count: 0 })

function isOrderItem(value: unknown): value is OrderItem {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Record<string, unknown>
  return (
    typeof item.productId === 'string' &&
    typeof item.name === 'string' &&
    typeof item.price === 'number' &&
    typeof item.qty === 'number' &&
    item.qty > 0
  )
}

/** Carts saved before HPP existed get `cost: 0` rather than a broken shape. */
function normalizeItem(value: unknown): OrderItem | null {
  if (!isOrderItem(value)) return null
  return { ...value, cost: typeof value.cost === 'number' && value.cost >= 0 ? value.cost : 0 }
}

function loadItems(): OrderItem[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed)
      ? parsed.map(normalizeItem).filter((item): item is OrderItem => item !== null)
      : []
  } catch {
    return []
  }
}

let items: OrderItem[] = loadItems()

function buildSnapshot(): CartState {
  return {
    items,
    total: items.reduce((sum, item) => sum + item.price * item.qty, 0),
    count: items.reduce((sum, item) => sum + item.qty, 0),
  }
}

/** Cached so getSnapshot returns an identical reference between changes,
 * which useSyncExternalStore requires. */
let snapshot: CartState = buildSnapshot()

function persist(): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Storage unavailable: the in-memory cart keeps the session working.
  }
}

function emit(): void {
  snapshot = buildSnapshot()
  persist()
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): CartState {
  return snapshot
}

function getServerSnapshot(): CartState {
  return EMPTY_SNAPSHOT
}

export function useCart(): CartState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

function findIndex(productId: string): number {
  return items.findIndex((item) => item.productId === productId)
}

export function addToCart(product: Product): void {
  const index = findIndex(product.id)
  items =
    index === -1
      ? [
          ...items,
          {
            productId: product.id,
            name: product.name,
            emoji: product.emoji,
            price: product.price,
            qty: 1,
            // Snapshot HPP now so a later catalog edit cannot rewrite history.
            cost: product.cost,
          },
        ]
      : items.map((item, i) => (i === index ? { ...item, qty: item.qty + 1 } : item))
  emit()
}

export function setQty(productId: string, qty: number): void {
  if (qty <= 0) {
    removeFromCart(productId)
    return
  }
  items = items.map((item) => (item.productId === productId ? { ...item, qty } : item))
  emit()
}

export function removeFromCart(productId: string): void {
  items = items.filter((item) => item.productId !== productId)
  emit()
}

export function clearCart(): void {
  items = []
  emit()
}

/** Snapshots used once, outside React, when placing an order. */
export function currentCartItems(): OrderItem[] {
  return items.map((item) => ({ ...item }))
}

/** Product ids whose cart price no longer matches the catalog price. */
export function stalePriceIds(catalog: Product[]): string[] {
  const priceById = new Map(catalog.map((product) => [product.id, product.price]))
  return items
    .filter((item) => priceById.has(item.productId) && priceById.get(item.productId) !== item.price)
    .map((item) => item.productId)
}
