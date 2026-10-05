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

/** Seed catalog. Copied into localStorage on first run; editable thereafter. */
export const DEFAULT_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Indomie Goreng', price: 3500, category: 'makanan', emoji: '🍜', cost: 2500, stock: 40, lowStockThreshold: 10, sku: 'MKN-001', barcode: '8991002101010' },
  { id: 'p2', name: 'Nasi Goreng', price: 18000, category: 'makanan', emoji: '🍚', cost: 11000, stock: 15, lowStockThreshold: 5, sku: 'MKN-002' },
  { id: 'p3', name: 'Ayam Bakal', price: 25000, category: 'makanan', emoji: '🍗', cost: 17000, stock: 12, lowStockThreshold: 4, sku: 'MKN-003' },
  { id: 'p4', name: 'Mie Ayam Bakso', price: 16000, category: 'makanan', emoji: '🍲', cost: 10000, stock: 20, lowStockThreshold: 5, sku: 'MKN-004' },
  { id: 'p5', name: 'Roti Bakar Cokelat', price: 12000, category: 'makanan', emoji: '🥖', cost: 7000, stock: 18, lowStockThreshold: 6, sku: 'MKN-005' },
  { id: 'p6', name: 'Es Teh Manis', price: 4000, category: 'minuman', emoji: '🧋', cost: 1200, stock: 60, lowStockThreshold: 15, sku: 'MNM-001', barcode: '8991002101027' },
  { id: 'p7', name: 'Kopi Kapal Api', price: 5000, category: 'minuman', emoji: '☕', cost: 3000, stock: 50, lowStockThreshold: 12, sku: 'MNM-002' },
  { id: 'p8', name: 'Air Mineral 600ml', price: 4000, category: 'minuman', emoji: '💧', cost: 2500, stock: 48, lowStockThreshold: 12, sku: 'MNM-003', barcode: '8991002101034' },
  { id: 'p9', name: 'Jus Alpukat', price: 15000, category: 'minuman', emoji: '🥑', cost: 9000, stock: 10, lowStockThreshold: 4, sku: 'MNM-004' },
  { id: 'p10', name: 'Susu Ultra 250ml', price: 6000, category: 'minuman', emoji: '🥛', cost: 4500, stock: 24, lowStockThreshold: 8, sku: 'MNM-005' },
  { id: 'p11', name: 'Chitato 68g', price: 11000, category: 'snack', emoji: '🍟', cost: 8000, stock: 30, lowStockThreshold: 8, sku: 'SNK-001', barcode: '8991002101041' },
  { id: 'p12', name: 'Oreo Sandwich', price: 8000, category: 'snack', emoji: '🍪', cost: 6000, stock: 36, lowStockThreshold: 10, sku: 'SNK-002', barcode: '8991002101058' },
  { id: 'p13', name: 'Telur Gulung', price: 3000, category: 'snack', emoji: '🍥', cost: 1500, stock: 25, lowStockThreshold: 8, sku: 'SNK-003' },
  { id: 'p14', name: 'Keripik Kentang', price: 9000, category: 'snack', emoji: '🥔', cost: 6500, stock: 8, lowStockThreshold: 10, sku: 'SNK-004' },
]