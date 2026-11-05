export type ProductCategory = 'food' | 'drink' | 'snack'

export interface Product {
  id: string
  name: string
  price: number
  category: ProductCategory
  /** R2 object key for the product image; `null` shows a placeholder. */
  imageKey: string | null
  /** Purchase price (HPP). 0 means unknown. */
  cost: number
  /** On-hand quantity. `null` means the product is not stock-tracked. */
  stock: number | null
  /** Stock at or below this value is flagged for restock. */
  lowStockThreshold: number
  sku?: string
  barcode?: string
}

export type StockMovementReason = 'sale' | 'restock' | 'adjust' | 'void' | 'refund'

/** Append-only audit trail of every stock change. */
export interface StockMovement {
  id: string
  productId: string
  delta: number
  reason: StockMovementReason
  at: string
  orderId?: string
}

export type PaymentMethod = 'cash' | 'qris' | 'transfer' | 'credit'

/** How a credit sale was eventually settled. */
export type SettlementPaymentMethod = 'cash' | 'qris' | 'transfer'

/** Separate from `OrderStatus`: a credit order is a valid sale, paid or not. */
export type SettlementStatus = 'settled' | 'unsettled'

/** Where the order was consumed. */
export type SalesChannel = 'dine-in' | 'takeaway' | 'delivery'

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
  imageKey: string | null
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
  imageKey: string | null
  price: number
  qty: number
  /** HPP snapshot at sale time, so historical margin never shifts when cost is edited. */
  cost: number
}

/**
 * `pending` is an order whose stock is reserved but whose money has not
 * arrived yet (Xendit QRIS). Every money rule gates on `status === 'paid'`, so
 * a pending order is excluded from revenue, receivables, and the drawer.
 */
export type OrderStatus = 'pending' | 'paid' | 'void' | 'refunded'

/** Payment gateways this app can talk to. Only Xendit ships today. */
export type PaymentProvider = 'xendit'

/**
 * One attempt to collect money for a pending order.
 *
 * `expired` is not terminal: a customer can still complete a QR after the
 * display window, so a late `payment.capture` still moves it to `paid`.
 * `cancelled` is terminal — money arriving afterwards must be refunded by
 * hand (recorded with `failureCode: 'paid_after_cancel'`).
 */
export type PaymentAttemptStatus =
  | 'creating'
  | 'pending'
  | 'paid'
  | 'expired'
  | 'failed'
  | 'cancelled'

export interface PaymentAttempt {
  id: string
  orderId: string
  provider: PaymentProvider
  /** Our globally unique idempotency key, sent to Xendit as `reference_id`. */
  referenceId: string
  /** Xendit's `payment_request_id`. */
  providerRef?: string
  status: PaymentAttemptStatus
  amount: number
  /** The `QR_STRING` action returned by Xendit, rendered client-side. */
  qrString?: string
  expiresAt?: string
  paidAt?: string
  failureCode?: string
  createdAt: string
}

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
  /** Customer who owes, for a `credit` sale. */
  customerName?: string
  /** `unsettled` only for credit orders that have not been paid yet. */
  settlementStatus: SettlementStatus
  settledAt?: string
  /** How the credit was paid off; absent until settled. */
  settledPaymentMethod?: SettlementPaymentMethod
  /** The drawer that received a cash settlement. */
  settledInShiftId?: string
  settledByUserId?: string
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
  /** Money returned after the original shift closed (ADR-0006). */
  refundedAt?: string
  refundReason?: string
  /** The shift whose drawer actually paid the refund out. */
  refundedInShiftId?: string
}

export type CartStatus = 'open' | 'parked' | 'checked_out'

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
