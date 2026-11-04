import { createFileRoute } from '@tanstack/react-router'
import { CheckoutPage } from '~/features/checkout/CheckoutPage'
import { listProductsFn } from '~/features/catalog/catalog.functions'
import { currentShiftFn, listDrawerOrdersFn, listShiftsFn } from '~/features/shifts/shifts.functions'

export const Route = createFileRoute('/checkout')({
  component: CheckoutPage,
  loader: async () => {
    const [products, currentShift, shifts] = await Promise.all([listProductsFn(), currentShiftFn(), listShiftsFn()])
    const drawerOrders = currentShift ? await listDrawerOrdersFn({ data: { shiftId: currentShift.id } }) : []
    return { products, currentShift, shifts, drawerOrders }
  },
  // Depends on the in-memory cart.
  ssr: false,
})
