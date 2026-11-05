import { createFileRoute } from '@tanstack/react-router'
import { OrderSuccessPage, SuccessPending } from '~/features/sales/OrderSuccessPage'
import { PendingPayment } from '~/features/checkout/PendingPayment'
import { getOrderFn } from '~/features/sales/sales.functions'
import {
  checkoutCapabilitiesFn,
  getPaymentStatusFn,
} from '~/features/checkout/checkout.functions'
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

    if (!order || order.status !== 'pending') {
      return { order, payment: undefined, simulationEnabled: false }
    }

    // The capability comes from the server's key type, so a deployed sandbox
    // still offers simulation while a live key removes it automatically.
    const cachedPayment = state.payment
    const [status, capabilities] = await Promise.all([
      cachedPayment?.orderId === order.id && cachedPayment.status === 'pending'
        ? Promise.resolve({ payment: cachedPayment })
        : getPaymentStatusFn({ data: { orderId: order.id } }),
      checkoutCapabilitiesFn(),
    ])
    return {
      order,
      payment: status.payment,
      simulationEnabled: capabilities.simulationEnabled,
    }
  },
})

function OrderSuccessRoute() {
  const { order, payment, simulationEnabled } = Route.useLoaderData()
  if (order?.status === 'pending') {
    return <PendingPayment order={order} payment={payment} simulationEnabled={simulationEnabled} />
  }
  return <OrderSuccessPage />
}
