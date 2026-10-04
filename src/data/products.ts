import type { PaymentMethod, Product, ProductCategory } from '../types'

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

/** Seed catalog. Copied into localStorage on first run; editable thereafter. */
export const DEFAULT_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Indomie Goreng', price: 3500, category: 'makanan', emoji: '🍜' },
  { id: 'p2', name: 'Nasi Goreng', price: 18000, category: 'makanan', emoji: '🍚' },
  { id: 'p3', name: 'Ayam Bakal', price: 25000, category: 'makanan', emoji: '🍗' },
  { id: 'p4', name: 'Mie Ayam Bakso', price: 16000, category: 'makanan', emoji: '🍲' },
  { id: 'p5', name: 'Roti Bakar Cokelat', price: 12000, category: 'makanan', emoji: '🥖' },
  { id: 'p6', name: 'Es Teh Manis', price: 4000, category: 'minuman', emoji: '🧋' },
  { id: 'p7', name: 'Kopi Kapal Api', price: 5000, category: 'minuman', emoji: '☕' },
  { id: 'p8', name: 'Air Mineral 600ml', price: 4000, category: 'minuman', emoji: '💧' },
  { id: 'p9', name: 'Jus Alpukat', price: 15000, category: 'minuman', emoji: '🥑' },
  { id: 'p10', name: 'Susu Ultra 250ml', price: 6000, category: 'minuman', emoji: '🥛' },
  { id: 'p11', name: 'Chitato 68g', price: 11000, category: 'snack', emoji: '🍟' },
  { id: 'p12', name: 'Oreo Sandwich', price: 8000, category: 'snack', emoji: '🍪' },
  { id: 'p13', name: 'Telur Gulung', price: 3000, category: 'snack', emoji: '🍥' },
  { id: 'p14', name: 'Keripik Kentang', price: 9000, category: 'snack', emoji: '🥔' },
]