import { createFileRoute } from '@tanstack/react-router'
import {
  OrderSuccessPage,
  SuccessPending,
} from '~/features/sales/OrderSuccessPage'
import { getOrderFn } from '~/features/sales/sales.functions'
import type { Order } from '~/types'

export const Route = createFileRoute('/order-success/$orderId')({
  component: OrderSuccessPage,
  pendingComponent: SuccessPending,
  pendingMs: 120,
  pendingMinMs: 300,
  // The freshly created order is fetched from the database during SSR. A
  // client-side checkout hands the order over in history state, so the receipt
  // appears immediately instead of waiting for a second round-trip.
  loader: async ({ params, location }) => {
    const cached = (location.state as { order?: Order }).order
    if (cached?.id === params.orderId) return { order: cached }
    return { order: await getOrderFn({ data: { id: params.orderId } }) }
  },
})
