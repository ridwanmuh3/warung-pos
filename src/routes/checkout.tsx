import { createFileRoute } from '@tanstack/react-router'
import { CheckoutPage } from '~/features/checkout/CheckoutPage'
import { checkoutCapabilitiesFn } from '~/features/checkout/checkout.functions'
import { listProductsFn } from '~/features/catalog/catalog.functions'
import { currentShiftFn, listDrawerOrdersFn, listShiftsFn } from '~/features/shifts/shifts.functions'

export const Route = createFileRoute('/checkout')({
  component: CheckoutPage,
  loader: async () => {
    const [products, currentShift, shifts, capabilities] = await Promise.all([
      listProductsFn(),
      currentShiftFn(),
      listShiftsFn(),
      checkoutCapabilitiesFn(),
    ])
    const drawerOrders = currentShift ? await listDrawerOrdersFn({ data: { shiftId: currentShift.id } }) : []
    return { products, currentShift, shifts, drawerOrders, qrisEnabled: capabilities.qrisEnabled }
  },
  // Depends on the in-memory cart.
  ssr: false,
})
