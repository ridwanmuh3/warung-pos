/**
 * Typed checkout outcomes and the cashier-facing copy for rejections.
 *
 * The RPC returns these shapes so the screen branches on `kind`, never on
 * message text. Copy lives here so the UI test and the page stay in sync.
 *
 * `ordered` is the synchronous cash/credit sale. `payment-required` is a
 * pending QRIS order whose QR is ready; `payment-setup-failed` is the same
 * order when Xendit could not issue a QR, so the screen can retry without
 * re-ringing the sale.
 */

import type { Order, PaymentAttempt } from '~/types'

export type CheckoutOutcome =
  | { kind: 'ordered'; order: Order }
  | { kind: 'payment-required'; order: Order; payment: PaymentAttempt }
  | { kind: 'payment-setup-failed'; order: Order; message: string }
  | { kind: 'empty-cart' }
  | { kind: 'product-missing'; message: string }
  | { kind: 'payment-invalid'; message: string }

export type CheckoutRejection = Extract<
  CheckoutOutcome,
  { kind: 'empty-cart' | 'product-missing' | 'payment-invalid' }
>

export function checkoutRejectionMessage(outcome: CheckoutRejection): string {
  switch (outcome.kind) {
    case 'empty-cart':
      return 'Keranjang masih kosong. Tambah produk terlebih dahulu.'
    case 'product-missing':
    case 'payment-invalid':
      return outcome.message
  }
}
