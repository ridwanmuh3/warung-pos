import { DEFAULT_PRODUCTS } from '../data/products'
import type { Product } from '../types'

const STORAGE_KEY = 'warung-pos.products.v1'

const listeners = new Set<() => void>()

/** Cached so getProductsSnapshot returns an identical reference between writes,
 * which useSyncExternalStore requires. */
let cache: Product[] | null = null

function isProduct(value: unknown): value is Product {
  if (typeof value !== 'object' || value === null) return false
  const p = value as Record<string, unknown>
  return (
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    typeof p.price === 'number' &&
    (p.category === 'makanan' || p.category === 'minuman' || p.category === 'snack')
  )
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
    cache = Array.isArray(parsed) ? parsed.filter(isProduct) : [...DEFAULT_PRODUCTS]
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