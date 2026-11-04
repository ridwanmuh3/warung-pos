import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ProductsPage } from '~/features/catalog/ProductsPage'
import { listProductsFn } from '~/features/catalog/catalog.functions'

/** Validated search params: the category filter is shareable and refresh-safe. */
const productSearchSchema = z.object({
  category: z.enum(['all', 'food', 'drink', 'snack']).optional().catch(undefined),
  lowStock: z.boolean().optional().catch(undefined),
})

export const Route = createFileRoute('/products')({
  component: ProductsPage,
  validateSearch: productSearchSchema,
  // The catalog now lives in the database, so the list is fetched on the server.
  loader: async () => ({ products: await listProductsFn() }),
})
