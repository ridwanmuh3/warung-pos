import { createFileRoute } from '@tanstack/react-router'
import { OrderSuccessPage, SuccessPending } from '~/features/sales/OrderSuccessPage'
import { PendingPayment } from '~/features/checkout/PendingPayment'
import { getOrderFn } from '~/features/sales/sales.functions'
import { getPaymentStatusFn } from '~/features/checkout/checkout.functions'
import type { Order, PaymentAttempt } from '~/types'

interface SuccessState {
  order?: Order
  payment?: PaymentAttempt
}

export const Route = createFileRoute('/order-success/$orderId')({
  component: OrderSuccessRoute,
  pendingComponent: SuccessPending,
  pendingMs: 120,
  pendingMinMs: 300,
  // The freshly created order is fetched from the database during SSR. A
  // client-side checkout hands the order over in history state, so the receipt
  // appears immediately instead of waiting for a second round-trip.
  loader: async ({ params, location }) => {
    const state = location.state as SuccessState
    const cached = state.order
    const order =
      cached?.id === params.orderId
        ? cached
        : await getOrderFn({ data: { id: params.orderId } })

    if (!order || order.status !== 'pending') return { order, payment: undefined }

    const cachedPayment = state.payment
    if (cachedPayment?.orderId === order.id && cachedPayment.status === 'pending') {
      return { order, payment: cachedPayment }
    }
    const result = await getPaymentStatusFn({ data: { orderId: order.id } })
    return { order, payment: result.payment }
  },
})

function OrderSuccessRoute() {
  const { order, payment } = Route.useLoaderData()
  if (order?.status === 'pending') return <PendingPayment order={order} payment={payment} />
  return <OrderSuccessPage />
}
