export type ProductCategory = 'makanan' | 'minuman' | 'snack'

export interface Product {
  id: string
  name: string
  price: number
  category: ProductCategory
  emoji: string
  /** Purchase price (HPP). 0 means unknown. */
  cost: number
  /** On-hand quantity. `null` means the product is not stock-tracked. */
  stock: number | null
  /** Stock at or below this value is flagged for restock. */
  lowStockThreshold: number
  sku?: string
  barcode?: string
}

export type StockMovementReason = 'sale' | 'restock' | 'adjust' | 'void'

/** Append-only audit trail of every stock change. */
export interface StockMovement {
  id: string
  productId: string
  delta: number
  reason: StockMovementReason
  at: string
  orderId?: string
}

export type PaymentMethod = 'tunai' | 'qris' | 'transfer'

/** Where the order was consumed. */
export type SalesChannel = 'dine-in' | 'bungkus' | 'ojol'

/** One aggregated row of the per-category sales breakdown. */
export interface CategoryReportRow {
  category: ProductCategory
  revenue: number
  itemsSold: number
}

/** One aggregated row of a top-seller ranking. */
export interface ProductSalesRow {
  productId: string
  name: string
  emoji: string
  qty: number
  revenue: number
}

/** One aggregated row of the hourly sales histogram. */
export interface HourBucket {
  hour: number
  orders: number
  revenue: number
}

export interface OrderItem {
  productId: string
  name: string
  emoji: string
  price: number
  qty: number
  /** HPP snapshot at sale time, so historical margin never shifts when cost is edited. */
  cost: number
}

export type OrderStatus = 'paid' | 'void'

export interface Order {
  id: string
  orderNumber: string
  createdAt: string
  items: OrderItem[]
  subtotal: number
  discount: number
  total: number
  paymentMethod: PaymentMethod
  amountPaid: number | null
  change: number | null
  status: OrderStatus
  /** Sum of item cost snapshots. */
  costTotal: number
  /** `total − costTotal`, i.e. gross profit after discount. */
  profit: number
  /** How the customer took the order. Defaults to dine-in for pre-existing data. */
  channel: SalesChannel
  /** Who rang it up, when a name was set. */
  cashier?: string
  /** Cash shift this order belongs to, when one was open. */
  shiftId?: string
  voidedAt?: string
  voidReason?: string
}

export type CartStatus = 'open' | 'parked'

/** A server-side cart. Line items are price/HPP snapshots, like order items. */
export interface Cart {
  id: string
  status: CartStatus
  label?: string
  items: OrderItem[]
  updatedAt: string
}

export interface Shift {
  id: string
  openedAt: string
  closedAt?: string
  /** Cash in the drawer at open. */
  openingCash: number
  /** Cash counted at close, once closed. */
  closingCash?: number
  /** Expected drawer cash at close: opening + cash sales − cash refunds. */
  expectedCash?: number
  /** `closingCash − expectedCash`; positive means surplus. */
  variance?: number
  note?: string
}
