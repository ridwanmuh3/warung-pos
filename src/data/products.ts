import type { PaymentMethod, Product, ProductCategory, SalesChannel } from '../types'

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  makanan: 'Makanan',
  minuman: 'Minuman',
  snack: 'Snack',
}

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  tunai: 'Tunai',
  qris: 'QRIS',
  transfer: 'Transfer Bank',
}

export const CHANNEL_LABELS: Record<SalesChannel, string> = {
  'dine-in': 'Makan di Sini',
  bungkus: 'Bungkus',
  ojol: 'Ojol / Online',
}

/**
 * Seed catalog, one product per mockup image in `src/assets/`. The matching
 * image must exist in R2 under `seed/<filename>` — run `pnpm seed:images` to
 * upload it. Seeded into a tenant on first use; editable thereafter.
 */
export const DEFAULT_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Indomie Goreng', price: 3500, category: 'makanan', imageKey: 'seed/indomie-goreng.png', cost: 2500, stock: 40, lowStockThreshold: 10, sku: 'MKN-001', barcode: '8991002101010' },
  { id: 'p2', name: 'Aqua 600ml', price: 4000, category: 'minuman', imageKey: 'seed/aqua.jpg', cost: 2500, stock: 48, lowStockThreshold: 12, sku: 'MNM-003', barcode: '8991002101034' },
  { id: 'p3', name: 'Chitato 68g', price: 11000, category: 'snack', imageKey: 'seed/chitato.jpg', cost: 8000, stock: 30, lowStockThreshold: 8, sku: 'SNK-001', barcode: '8991002101041' },
  { id: 'p4', name: 'Cadbury Dairy Milk', price: 15000, category: 'snack', imageKey: 'seed/diary-milk.jpeg', cost: 11000, stock: 24, lowStockThreshold: 8, sku: 'SNK-005', barcode: '8991002101065' },
  { id: 'p5', name: 'Oat Milk 1L', price: 32000, category: 'minuman', imageKey: 'seed/oatmilk.jpeg', cost: 24000, stock: 15, lowStockThreshold: 5, sku: 'MNM-006', barcode: '8991002101072' },
]
