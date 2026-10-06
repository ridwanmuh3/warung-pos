import { useSyncExternalStore } from 'react'
import { getOpenCartFn, saveCartFn } from './cart.functions'
import type { OrderItem, Product } from '../types'

export interface CartState {
  items: OrderItem[]
  total: number
  count: number
}

/**
 * Live cart key. v1 is owned by the legacy importer (`legacy.ts` treats it as
 * pre-server data), so the live cart moved to v2 — sharing v1 made the live
 * cart look importable and let "Selesai" wipe it. On first load we adopt any
 * v1 cart written by this same app generation, then remove the v1 key.
 */
const STORAGE_KEY = 'warung-pos.cart.v2'
const LEGACY_LIVE_KEY = 'warung-pos.cart.v1'

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
    // One-time adoption of the pre-v2 live cart (see STORAGE_KEY note).
    const adopted = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_LIVE_KEY)
    localStorage.removeItem(LEGACY_LIVE_KEY)
    const parsed: unknown = adopted ? JSON.parse(adopted) : []
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

function emitLocal(): void {
  snapshot = buildSnapshot()
  persist()
  listeners.forEach((listener) => listener())
}

function emit(): void {
  emitLocal()
  scheduleSync()
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

/** Replaces the whole cart, e.g. when a parked cart is resumed. */
export function setCartItems(next: OrderItem[]): void {
  items = next.map((item) => ({ ...item }))
  emit()
}

/** Snapshots used once, outside React, when placing an order. */
export function currentCartItems(): OrderItem[] {
  return items.map((item) => ({ ...item }))
}

/* ------------------------- server synchronisation ---------------------- *
 * The cart stays synchronous and local-first: every tap updates memory and
 * localStorage immediately. When signed in, changes are pushed to the server
 * after a short debounce, and a failed push (offline) is retried on the next
 * change or when the browser comes back online.
 */

const SYNC_DEBOUNCE_MS = 500

let syncEnabled = false
let syncing = false
let dirty = false
let syncTimer: ReturnType<typeof setTimeout> | null = null
let onlineListenerAttached = false

async function flush(): Promise<void> {
  if (!syncEnabled || !dirty) return
  if (syncing) return
  syncing = true
  try {
    await saveCartFn({ data: { items: currentCartItems() } })
    dirty = false
  } catch {
    // Keep the local cart; it will be retried later.
    dirty = true
  } finally {
    syncing = false
  }
}

function scheduleSync(): void {
  if (!syncEnabled) return
  dirty = true
  if (syncTimer !== null) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    syncTimer = null
    void flush()
  }, SYNC_DEBOUNCE_MS)
}

/** Pushes any pending local change immediately (used before checkout/navigation). */
export async function flushCart(): Promise<void> {
  if (syncTimer !== null) {
    clearTimeout(syncTimer)
    syncTimer = null
  }
  await flush()
}

/**
 * Turns on server sync for the signed-in user and hydrates from the server.
 * The server copy wins unless there are unsynced local edits.
 */
export async function startCartSync(): Promise<void> {
  syncEnabled = true
  if (!onlineListenerAttached && typeof window !== 'undefined') {
    onlineListenerAttached = true
    window.addEventListener('online', () => {
      void flush()
    })
  }
  try {
    const remote = await getOpenCartFn()
    if (remote && remote.items.length > 0 && !dirty) {
      items = remote.items.map((item) => ({ ...item }))
      emitLocal()
    } else if (items.length > 0) {
      // Local cart from the cache: push it up as this account's cart.
      scheduleSync()
    }
  } catch {
    // Offline on load: keep the local cart and retry on the next change.
  }
}

/** Stops syncing and drops the local cache (used on sign-out). */
export function stopCartSync(): void {
  syncEnabled = false
  dirty = false
  if (syncTimer !== null) {
    clearTimeout(syncTimer)
    syncTimer = null
  }
  items = []
  emitLocal()
}

/** Product ids whose cart price no longer matches the catalog price. */
export function stalePriceIds(catalog: Product[]): string[] {
  const priceById = new Map(catalog.map((product) => [product.id, product.price]))
  return items
    .filter((item) => priceById.has(item.productId) && priceById.get(item.productId) !== item.price)
    .map((item) => item.productId)
}
