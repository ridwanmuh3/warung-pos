/**
 * Typed checkout outcomes and the cashier-facing copy for rejections.
 *
 * The RPC returns these shapes so the screen branches on `kind`, never on
 * message text. Copy lives here so the UI test and the page stay in sync.
 */

import type { Order } from '~/types'

export type CheckoutOutcome =
  | { kind: 'ordered'; order: Order }
  | { kind: 'empty-cart' }
  | { kind: 'product-missing'; message: string }
  | { kind: 'payment-invalid'; message: string }

export type CheckoutRejection = Exclude<CheckoutOutcome, { kind: 'ordered' }>

export function checkoutRejectionMessage(outcome: CheckoutRejection): string {
  switch (outcome.kind) {
    case 'empty-cart':
      return 'Keranjang masih kosong. Tambah produk terlebih dahulu.'
    case 'product-missing':
    case 'payment-invalid':
      return outcome.message
  }
}
