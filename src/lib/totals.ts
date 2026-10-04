import type { OrderItem } from '../types'

export function lineSubtotal(item: OrderItem): number {
  return item.price * item.qty
}

export function itemsTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + lineSubtotal(item), 0)
}

export function itemsCount(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.qty, 0)
}