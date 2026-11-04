import { z } from 'zod'
import { isDayKey } from '~/lib/format'

/**
 * Validated search params for order history. Malformed values fall back
 * instead of throwing, so a shared or hand-edited URL never breaks the screen.
 */
export const orderSearchSchema = z.object({
  q: z.string().optional().catch(undefined),
  method: z.enum(['cash', 'qris', 'transfer', 'credit']).optional().catch(undefined),
  channel: z.enum(['dine-in', 'takeaway', 'delivery']).optional().catch(undefined),
  // Same guard as the report screens: a malformed `?day=` falls back to "all
  // days" instead of throwing inside the day formatter.
  day: z.string().refine(isDayKey, 'Tanggal tidak valid').optional().catch(undefined),
})

export type OrderSearch = z.infer<typeof orderSearchSchema>
