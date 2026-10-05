import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { resolveReportingDay, summarizeCategories } from './reporting.server'
import type { CategoryReportRow } from '../types'

/**
 * Typed server functions. Safe to import from any route: the bundler swaps the
 * implementation for an RPC stub in the client build.
 */

const itemSchema = z.object({
  productId: z.string(),
  name: z.string(),
  emoji: z.string(),
  price: z.number(),
  qty: z.number(),
  cost: z.number(),
})

const streamInputSchema = z.object({
  items: z.array(itemSchema),
  categoryOf: z.record(z.string(), z.enum(['makanan', 'minuman', 'snack'])),
})

/** Authoritative reporting day. Called from the `/ringkasan` route loader. */
export const fetchReportingDay = createServerFn({ method: 'GET' })
  .validator(z.object({ iso: z.string().optional() }))
  .handler(({ data }): string => resolveReportingDay(data.iso))

export type CategoryBreakdownChunk =
  | { kind: 'row'; row: CategoryReportRow }
  | { kind: 'done'; revenue: number; itemsSold: number }

/**
 * Streams the category breakdown one row at a time, so the report paints
 * progressively instead of blocking on the whole aggregate.
 */
export const streamCategoryBreakdown = createServerFn({ method: 'POST' })
  .validator(streamInputSchema)
  .handler(async function* ({ data }): AsyncGenerator<CategoryBreakdownChunk> {
    const rows = summarizeCategories(data.items, data.categoryOf)
    let revenue = 0
    let itemsSold = 0
    for (const row of rows) {
      // Yield to the event loop so chunks are flushed individually.
      const { promise, resolve } = Promise.withResolvers<void>()
      setTimeout(resolve, 120)
      await promise
      revenue += row.revenue
      itemsSold += row.itemsSold
      yield { kind: 'row', row }
    }
    yield { kind: 'done', revenue, itemsSold }
  })
