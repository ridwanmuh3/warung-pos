import { DEFAULT_PRODUCTS } from '../data/products'
import type { OrderItem, Product, StockMovement, StockMovementReason } from '../types'

const STORAGE_KEY = 'warung-pos.products.v1'
const MOVEMENTS_KEY = 'warung-pos.stock-movements.v1'

const listeners = new Set<() => void>()

/** Cached so getProductsSnapshot returns an identical reference between writes,
 * which useSyncExternalStore requires. */
let cache: Product[] | null = null

function normalizeProduct(value: unknown): Product | null {
  if (typeof value !== 'object' || value === null) return null
  const p = value as Record<string, unknown>
  if (
    typeof p.id !== 'string' ||
    typeof p.name !== 'string' ||
    typeof p.price !== 'number' ||
    (p.category !== 'makanan' && p.category !== 'minuman' && p.category !== 'snack')
  ) {
    return null
  }
  return {
    id: p.id,
    name: p.name,
    price: p.price,
    category: p.category,
    emoji: typeof p.emoji === 'string' ? p.emoji : '📦',
    // Products saved before HPP existed have an unknown cost.
    cost: typeof p.cost === 'number' && p.cost >= 0 ? p.cost : 0,
    // Products saved before inventory existed are not stock-tracked.
    stock: typeof p.stock === 'number' ? p.stock : null,
    lowStockThreshold: typeof p.lowStockThreshold === 'number' ? p.lowStockThreshold : 5,
    ...(typeof p.sku === 'string' && p.sku !== '' ? { sku: p.sku } : {}),
    ...(typeof p.barcode === 'string' && p.barcode !== '' ? { barcode: p.barcode } : {}),
  }
}

function read(): Product[] {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      cache = [...DEFAULT_PRODUCTS]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
      return cache
    }
    const parsed: unknown = JSON.parse(raw)
    const products = Array.isArray(parsed)
      ? parsed.map(normalizeProduct).filter((product): product is Product => product !== null)
      : []
    cache = products.length > 0 ? products : [...DEFAULT_PRODUCTS]
  } catch {
    cache = [...DEFAULT_PRODUCTS]
  }
  return cache
}

function write(products: Product[]): void {
  cache = products
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products))
  } catch {
    // Storage unavailable: keep the in-memory copy so the session still works.
  }
  listeners.forEach((listener) => listener())
}

/** Stable snapshot for useSyncExternalStore. */
export function getProductsSnapshot(): Product[] {
  return read()
}

export function subscribeToProducts(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function addProduct(input: Omit<Product, 'id'>): Product {
  const product: Product = { ...input, id: crypto.randomUUID() }
  write([...read(), product])
  return product
}

export function updateProduct(id: string, changes: Partial<Omit<Product, 'id'>>): void {
  write(read().map((product) => (product.id === id ? { ...product, ...changes } : product)))
}

export function deleteProduct(id: string): void {
  write(read().filter((product) => product.id !== id))
}

/** Restore the seed catalog. */
export function resetProducts(): void {
  write([...DEFAULT_PRODUCTS])
}

/* ------------------------------------------------------------------ *
 * Stock
 * ------------------------------------------------------------------ */

function readMovements(): StockMovement[] {
  try {
    const raw = localStorage.getItem(MOVEMENTS_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as StockMovement[]) : []
  } catch {
    return []
  }
}

function appendMovements(movements: StockMovement[]): void {
  if (movements.length === 0) return
  try {
    // Newest first, bounded so a long-running device cannot fill storage.
    const next = [...movements, ...readMovements()].slice(0, 500)
    localStorage.setItem(MOVEMENTS_KEY, JSON.stringify(next))
  } catch {
    // Storage unavailable: the stock change still applies, only the trail is lost.
  }
}

export function listStockMovements(): StockMovement[] {
  return readMovements()
}

function applyDelta(products: Product[], productId: string, delta: number): Product[] {
  return products.map((product) => {
    if (product.id !== productId || product.stock === null) return product
    // Never go negative: an oversold tracked product floors at zero.
    return { ...product, stock: Math.max(0, product.stock + delta) }
  })
}

/**
 * Applies one delta per order line and records the audit trail.
 * Untracked products (`stock === null`) are ignored.
 */
export function applyStockForOrder(
  items: OrderItem[],
  reason: Extract<StockMovementReason, 'sale' | 'void'>,
  orderId: string,
): void {
  const products = read()
  const sign = reason === 'sale' ? -1 : 1
  let next = products
  const movements: StockMovement[] = []
  const now = new Date().toISOString()

  for (const item of items) {
    const product = products.find((candidate) => candidate.id === item.productId)
    if (!product || product.stock === null) continue
    next = applyDelta(next, item.productId, sign * item.qty)
    movements.push({
      id: crypto.randomUUID(),
      productId: item.productId,
      delta: sign * item.qty,
      reason,
      at: now,
      orderId,
    })
  }

  if (movements.length === 0) return
  write(next)
  appendMovements(movements)
}

/** Manual restock or correction, with an audit trail. */
export function adjustStock(productId: string, delta: number, reason: Extract<StockMovementReason, 'restock' | 'adjust'>): void {
  if (delta === 0) return
  write(applyDelta(read(), productId, delta))
  appendMovements([
    { id: crypto.randomUUID(), productId, delta, reason, at: new Date().toISOString() },
  ])
}

/** Products whose on-hand quantity is at or below their threshold. */
export function lowStockProducts(): Product[] {
  return read()
    .filter((product) => product.stock !== null && product.stock <= product.lowStockThreshold)
    .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0))
}
