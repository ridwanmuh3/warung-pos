import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { DebtsPage } from '~/features/sales/DebtsPage'
import { listCreditOrdersFn } from '~/features/sales/sales.functions'

const debtSearchSchema = z.object({
  q: z.string().optional().catch(undefined),
  status: z.enum(['unsettled', 'settled']).optional().catch(undefined),
})

export const Route = createFileRoute('/debts')({
  component: DebtsPage,
  validateSearch: debtSearchSchema,
  loader: async () => ({ orders: await listCreditOrdersFn() }),
})
