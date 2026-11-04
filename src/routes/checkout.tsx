import { createFileRoute } from '@tanstack/react-router'
import { CheckoutPage } from '~/features/checkout/CheckoutPage'

export const Route = createFileRoute('/checkout')({
  component: CheckoutPage,
  // Depends on the in-memory cart.
  ssr: false,
})
