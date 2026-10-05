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

export interface DiscountInput {
  /** Absolute rupiah amount. Ignored when `percent` is set. */
  amount: number
  /** Percentage of subtotal (0-100). Takes precedence over `amount`. */
  percent: number | null
}

/** Discount in rupiah, clamped to the subtotal so a total never goes negative. */
export function discountValue(subtotal: number, input: DiscountInput): number {
  const raw =
    input.percent === null
      ? input.amount
      : Math.round((subtotal * Math.min(Math.max(input.percent, 0), 100)) / 100)
  return Math.min(Math.max(0, Math.round(raw)), subtotal)
}

/** Sum of item HPP snapshots. */
export function itemsCost(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.cost * item.qty, 0)
}

/** Gross profit as a percentage of revenue; 0 when there is no revenue. */
export function marginPercent(profit: number, revenue: number): number {
  if (revenue <= 0) return 0
  return Math.round((profit / revenue) * 100)
}