import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

/**
 * Database schema (SQLite / libSQL).
 *
 * Conventions:
 * - Timestamps are ISO-8601 strings: they sort lexicographically, which is
 *   exactly how the reporting code already compares them.
 * - Money is integer rupiah, never floats.
 * - Order line items are denormalised snapshots (`price`, `cost`, `name`) so a
 *   later catalog edit cannot rewrite history.
 *
 * Multi-tenancy (Phase 8):
 * - `users` stay global: email is the login identity.
 * - A user joins one or more `tenants` through `memberships`, each carrying a
 *   role. Every business table adds a `tenant_id` and every read filters by it.
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

export const tenants = sqliteTable('tenants', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull(),
})

export const memberships = sqliteTable(
  'memberships',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['owner', 'manager', 'cashier'] })
      .notNull()
      .default('cashier'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('memberships_tenant_user_unique').on(table.tenantId, table.userId),
    index('memberships_user_idx').on(table.userId),
  ],
)

export const products = sqliteTable(
  'products',
  {
    id: text('id').primaryKey(),
    /**
     * Nullable only so the Phase 8 migration can backfill existing rows; every
     * write goes through `data.server.ts`, which always sets it.
     */
    tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
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
    /** Set when the row arrived through the legacy importer; used by Undo. */
    importBatchId: text('import_batch_id'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('products_tenant_idx').on(table.tenantId),
    index('products_category_idx').on(table.category),
    // Unique per tenant: two shops may both use SKU "MKN-001".
    uniqueIndex('products_tenant_sku_unique').on(table.tenantId, table.sku),
    uniqueIndex('products_tenant_barcode_unique').on(table.tenantId, table.barcode),
  ],
)

export const orders = sqliteTable(
  'orders',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
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
    status: text('status', { enum: ['paid', 'void', 'refunded'] })
      .notNull()
      .default('paid'),
    channel: text('channel', { enum: ['dine-in', 'bungkus', 'ojol'] })
      .notNull()
      .default('dine-in'),
    cashier: text('cashier'),
    shiftId: text('shift_id'),
    voidedAt: text('voided_at'),
    voidReason: text('void_reason'),
    /**
     * Refund (ADR-0006): money returned after the original shift closed.
     * `refundedInShiftId` is the shift whose drawer actually paid out.
     */
    refundedAt: text('refunded_at'),
    refundReason: text('refund_reason'),
    refundedInShiftId: text('refunded_in_shift_id'),
    /** Owning user, when the order was placed while signed in. */
    userId: text('user_id').references(() => users.id),
    /**
     * The cart this order was checked out from (ADR-0004). Unique: one cart
     * settles at most once, so a checkout retry can find its original order.
     */
    cartId: text('cart_id'),
    importBatchId: text('import_batch_id'),
  },
  (table) => [
    // Unique per tenant: each shop numbers its own orders from ORD-001.
    uniqueIndex('orders_tenant_number_unique').on(table.tenantId, table.orderNumber),
    uniqueIndex('orders_cart_unique').on(table.cartId),
    index('orders_tenant_idx').on(table.tenantId),
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

export const shifts = sqliteTable(
  'shifts',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
    openedAt: text('opened_at').notNull(),
    closedAt: text('closed_at'),
    openingCash: integer('opening_cash').notNull(),
    closingCash: integer('closing_cash'),
    expectedCash: integer('expected_cash'),
    variance: integer('variance'),
    note: text('note'),
    userId: text('user_id').references(() => users.id),
    importBatchId: text('import_batch_id'),
  },
  (table) => [index('shifts_tenant_idx').on(table.tenantId)],
)

/**
 * Monotonic counters, currently only the order sequence.
 *
 * Keyed by `(tenant_id, key)` so each shop runs its own sequence. Kept separate
 * from `orders` so voiding or deleting an order can never hand its number to a
 * later sale.
 */
export const counters = sqliteTable(
  'counters',
  {
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    value: integer('value').notNull(),
  },
  (table) => [primaryKey({ columns: [table.tenantId, table.key] })],
)

export const stockMovements = sqliteTable(
  'stock_movements',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    delta: integer('delta').notNull(),
    reason: text('reason', { enum: ['sale', 'restock', 'adjust', 'void', 'refund'] }).notNull(),
    at: text('at').notNull(),
    orderId: text('order_id'),
    importBatchId: text('import_batch_id'),
  },
  (table) => [
    index('stock_movements_tenant_idx').on(table.tenantId),
    index('stock_movements_product_idx').on(table.productId),
  ],
)

/**
 * Server-side cart. A user's open cart is the one being rung up; parked carts
 * are held aside and can be resumed. Line items are snapshots, exactly like
 * `order_items`, so a parked cart never changes price under the cashier.
 */
export const carts = sqliteTable(
  'carts',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: text('status', { enum: ['open', 'parked', 'checked_out'] })
      .notNull()
      .default('open'),
    /** Shown for parked carts, e.g. a customer name. */
    label: text('label'),
    /** Set when checkout converted this cart into an order (ADR-0004). */
    checkedOutAt: text('checked_out_at'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('carts_tenant_user_idx').on(table.tenantId, table.userId),
    index('carts_status_idx').on(table.status),
  ],
)

export const cartItems = sqliteTable(
  'cart_items',
  {
    id: text('id').primaryKey(),
    cartId: text('cart_id')
      .notNull()
      .references(() => carts.id, { onDelete: 'cascade' }),
    productId: text('product_id').notNull(),
    name: text('name').notNull(),
    emoji: text('emoji').notNull().default('📦'),
    price: integer('price').notNull(),
    cost: integer('cost').notNull().default(0),
    qty: integer('qty').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('cart_items_cart_idx').on(table.cartId)],
)
