import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

/**
 * Database schema (SQLite / libSQL).
 *
 * Conventions:
 * - Timestamps are ISO-8601 strings: they sort lexicographically, which is
 *   exactly how the reporting code already compares them.
 * - Money is integer rupiah, never floats.
 * - Order line items are denormalised snapshots (`price`, `cost`, `name`) so a
 *   later catalog edit cannot rewrite history.
 */

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    /** Always stored lower-cased; see `normaliseEmail`. */
    email: text('email').notNull(),
    /** PBKDF2-SHA-256, base64. Never a plaintext password. */
    passwordHash: text('password_hash').notNull(),
    /** Base64 per-user salt. */
    salt: text('salt').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [uniqueIndex('users_email_unique').on(table.email)],
)

export const products = sqliteTable(
  'products',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    price: integer('price').notNull(),
    /** Purchase price (HPP). */
    cost: integer('cost').notNull().default(0),
    category: text('category', { enum: ['makanan', 'minuman', 'snack'] }).notNull(),
    emoji: text('emoji').notNull().default('📦'),
    /** NULL means "not stock-tracked". */
    stock: integer('stock'),
    lowStockThreshold: integer('low_stock_threshold').notNull().default(5),
    sku: text('sku'),
    barcode: text('barcode'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('products_category_idx').on(table.category),
    uniqueIndex('products_sku_unique').on(table.sku),
    uniqueIndex('products_barcode_unique').on(table.barcode),
  ],
)

export const orders = sqliteTable(
  'orders',
  {
    id: text('id').primaryKey(),
    orderNumber: text('order_number').notNull(),
    createdAt: text('created_at').notNull(),
    subtotal: integer('subtotal').notNull(),
    discount: integer('discount').notNull().default(0),
    total: integer('total').notNull(),
    costTotal: integer('cost_total').notNull().default(0),
    profit: integer('profit').notNull().default(0),
    paymentMethod: text('payment_method', { enum: ['tunai', 'qris', 'transfer'] }).notNull(),
    amountPaid: integer('amount_paid'),
    change: integer('change'),
    status: text('status', { enum: ['paid', 'void'] })
      .notNull()
      .default('paid'),
    channel: text('channel', { enum: ['dine-in', 'bungkus', 'ojol'] })
      .notNull()
      .default('dine-in'),
    cashier: text('cashier'),
    shiftId: text('shift_id'),
    voidedAt: text('voided_at'),
    voidReason: text('void_reason'),
    /** Owning user, when the order was placed while signed in. */
    userId: text('user_id').references(() => users.id),
  },
  (table) => [
    uniqueIndex('orders_number_unique').on(table.orderNumber),
    index('orders_created_at_idx').on(table.createdAt),
    index('orders_status_idx').on(table.status),
    index('orders_user_idx').on(table.userId),
  ],
)

export const orderItems = sqliteTable(
  'order_items',
  {
    id: text('id').primaryKey(),
    orderId: text('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: text('product_id').notNull(),
    /** Snapshots taken at sale time. */
    name: text('name').notNull(),
    emoji: text('emoji').notNull().default('📦'),
    price: integer('price').notNull(),
    cost: integer('cost').notNull().default(0),
    qty: integer('qty').notNull(),
  },
  (table) => [index('order_items_order_idx').on(table.orderId)],
)

export const shifts = sqliteTable('shifts', {
  id: text('id').primaryKey(),
  openedAt: text('opened_at').notNull(),
  closedAt: text('closed_at'),
  openingCash: integer('opening_cash').notNull(),
  closingCash: integer('closing_cash'),
  expectedCash: integer('expected_cash'),
  variance: integer('variance'),
  note: text('note'),
  userId: text('user_id').references(() => users.id),
})

/**
 * Monotonic counters, currently only the order sequence.
 *
 * Kept separate from `orders` so voiding or deleting an order can never hand its
 * number to a later sale.
 */
export const counters = sqliteTable('counters', {
  key: text('key').primaryKey(),
  value: integer('value').notNull(),
})

export const stockMovements = sqliteTable(
  'stock_movements',
  {
    id: text('id').primaryKey(),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    delta: integer('delta').notNull(),
    reason: text('reason', { enum: ['sale', 'restock', 'adjust', 'void'] }).notNull(),
    at: text('at').notNull(),
    orderId: text('order_id'),
  },
  (table) => [index('stock_movements_product_idx').on(table.productId)],
)
