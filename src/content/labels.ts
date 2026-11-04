import type { PaymentMethod, ProductCategory, SalesChannel } from '../types'

/**
 * Human-readable Indonesian labels for machine values.
 *
 * Labels live in `content`, not in `domain`: a rule must never branch on copy,
 * and domain modules must not import UI text. Presentations (screens, receipts,
 * CSV, Z-report) pass these maps in when they need to print a value.
 */

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  food: 'Makanan',
  drink: 'Minuman',
  snack: 'Snack',
}

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: 'Tunai',
  qris: 'QRIS',
  transfer: 'Transfer Bank',
  credit: 'Ngutang',
}

export const CHANNEL_LABELS: Record<SalesChannel, string> = {
  'dine-in': 'Makan di Sini',
  takeaway: 'Bungkus',
  delivery: 'Ojol / Online',
}
