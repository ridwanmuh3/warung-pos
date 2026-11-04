import { createFileRoute } from '@tanstack/react-router'
import { ReceiptPage } from '~/features/sales/ReceiptPage'
import { getOrderFn } from '~/features/sales/sales.functions'

export const Route = createFileRoute('/orders/$orderId')({
  component: ReceiptPage,
  // The order is fetched from the database on the server and streamed with the HTML.
  loader: async ({ params }) => ({ order: await getOrderFn({ data: { id: params.orderId } }) }),
})
