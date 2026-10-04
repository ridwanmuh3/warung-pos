import { useSyncExternalStore } from 'react'
import type { OrderItem, Product } from '../types'

export interface CartState {
  items: OrderItem[]
  total: number
  count: number
}

const listeners = new Set<() => void>()

let items: OrderItem[] = []
/** Cached so getSnapshot returns an identical reference between changes,
 * which useSyncExternalStore requires. */
let snapshot: CartState = { items, total: 0, count: 0 }

function buildSnapshot(): CartState {
  return {
    items,
    total: items.reduce((sum, item) => sum + item.price * item.qty, 0),
    count: items.reduce((sum, item) => sum + item.qty, 0),
  }
}

function emit(): void {
  snapshot = buildSnapshot()
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): CartState {
  return snapshot
}

export function useCart(): CartState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

function findIndex(productId: string): number {
  return items.findIndex((item) => item.productId === productId)
}

export function addToCart(product: Product): void {
  const index = findIndex(product.id)
  items =
    index === -1
      ? [...items, { productId: product.id, name: product.name, emoji: product.emoji, price: product.price, qty: 1 }]
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
