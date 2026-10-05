import { createServerOnlyFn } from '@tanstack/react-start'
import type { CategoryReportRow, OrderItem, ProductCategory } from '../types'

/**
 * Server-only reporting helpers.
 *
 * `.server.ts` keeps this module out of the client bundle; `createServerOnlyFn`
 * turns any accidental client-side call into a loud runtime error instead of a
 * silent cross-environment import. Only server functions may import this file.
 */

/** Authoritative reporting day, resolved from the server clock. */
export const resolveReportingDay = createServerOnlyFn((iso?: string): string => {
  const date = iso ? new Date(iso) : new Date()
  const safe = Number.isNaN(date.getTime()) ? new Date() : date
  return `${safe.getFullYear()}-${safe.getMonth()}-${safe.getDate()}`
})

/** Aggregates line items into per-category rows. Pure, but server-owned. */
export const summarizeCategories = createServerOnlyFn(
  (items: OrderItem[], categoryOf: Record<string, ProductCategory>): CategoryReportRow[] => {
    const rows: Partial<Record<ProductCategory, CategoryReportRow>> = {}
    for (const item of items) {
      const category = categoryOf[item.productId]
      if (!category) continue
      const row = rows[category] ?? { category, revenue: 0, itemsSold: 0 }
      row.revenue += item.price * item.qty
      row.itemsSold += item.qty
      rows[category] = row
    }
    return Object.values(rows)
      .filter((row): row is CategoryReportRow => row !== undefined)
      .sort((a, b) => b.revenue - a.revenue)
  },
)
