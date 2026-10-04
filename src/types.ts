export type ProductCategory = 'makanan' | 'minuman' | 'snack'

export interface Product {
  id: string
  name: string
  price: number
  category: ProductCategory
  emoji: string
}

export type PaymentMethod = 'tunai' | 'qris' | 'transfer'

export interface OrderItem {
  productId: string
  name: string
  emoji: string
  price: number
  qty: number
}

export interface Order {
  id: string
  orderNumber: string
  createdAt: string
  items: OrderItem[]
  subtotal: number
  total: number
  paymentMethod: PaymentMethod
  amountPaid: number | null
  change: number | null
}
