import type { OrderItem } from '../../types'

/**
 * Cart pricing — the ONE definition of what a sale costs.
 *
 * ADR-0003: the server prices a sale from the live catalog, never from the
 * client's numbers. The checkout screen calls the same function for its
 * preview, so the amount the cashier sees can never drift from the amount
 * that gets charged.
 *
 * Pure: no React, no SQL, no clock. The interface is the test surface.
 */

export interface DiscountInput {
  /** Absolute rupiah amount. Ignored when `percent` is set. */
  amount: number
  /** Percentage of subtotal (0-100). Takes precedence over `amount`. */
  percent: number | null
}

/** The catalog fields pricing needs; a Product or a database row satisfies it. */
export interface CatalogProduct {
  id: string
  name: string
  price: number
  cost: number
  imageKey: string | null
}

export interface PriceCartInput {
  /** Cart (or order-draft) lines, used as snapshots when the product is gone. */
  items: readonly OrderItem[]
  catalog: readonly CatalogProduct[]
  discount: DiscountInput
}

export interface CartPricing {
  /** Lines re-priced from the live catalog; snapshots only for missing products. */
  items: OrderItem[]
  subtotal: number
  discount: number
  total: number
  costTotal: number
  profit: number
  /** Snapshot lines whose product no longer exists in the catalog. */
  missing: OrderItem[]
}

export function lineSubtotal(item: Pick<OrderItem, 'price' | 'qty'>): number {
  return item.price * item.qty
}

export function itemsTotal(items: readonly Pick<OrderItem, 'price' | 'qty'>[]): number {
  return items.reduce((sum, item) => sum + lineSubtotal(item), 0)
}

export function itemsCount(items: readonly Pick<OrderItem, 'qty'>[]): number {
  return items.reduce((sum, item) => sum + item.qty, 0)
}

/** Discount in rupiah, clamped to the subtotal so a total never goes negative. */
export function discountValue(subtotal: number, input: DiscountInput): number {
  const raw =
    input.percent === null
      ? input.amount
      : Math.round((subtotal * Math.min(Math.max(input.percent, 0), 100)) / 100)
  return Math.min(Math.max(0, Math.round(raw)), subtotal)
}

/** Gross profit as a percentage of revenue; 0 when there is no revenue. */
export function marginPercent(profit: number, revenue: number): number {
  if (revenue <= 0) return 0
  return Math.round((profit / revenue) * 100)
}

/**
 * Prices a cart against the live catalog.
 *
 * Missing products are reported rather than thrown: the checkout screen can
 * still show the snapshot, while the server decides that settlement must fail.
 * Keeping that decision with the caller is what lets both use one function.
 */
export function priceCart({ items, catalog, discount }: PriceCartInput): CartPricing {
  const byId = new Map(catalog.map((product) => [product.id, product]))
  const priced: OrderItem[] = []
  const missing: OrderItem[] = []

  for (const item of items) {
    const live = byId.get(item.productId)
    if (!live) {
      missing.push(item)
      priced.push({ ...item })
      continue
    }
    priced.push({
      productId: live.id,
      name: live.name,
      imageKey: live.imageKey,
      price: live.price,
      cost: live.cost,
      qty: item.qty,
    })
  }

  const subtotal = itemsTotal(priced)
  const discountAmount = discountValue(subtotal, discount)
  const total = subtotal - discountAmount
  const costTotal = priced.reduce((sum, line) => sum + line.cost * line.qty, 0)

  return {
    items: priced,
    subtotal,
    discount: discountAmount,
    total,
    costTotal,
    profit: total - costTotal,
    missing,
  }
}
