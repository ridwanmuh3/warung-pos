import { createServerOnlyFn } from '@tanstack/react-start'
import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm'
import { getDb } from '../db/client.server'
import {
  cartItems,
  carts,
  counters,
  orderItems,
  orders,
  products,
  shifts,
  stockMovements,
} from '../db/schema'
import type {
  Cart,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  Product,
  ProductCategory,
  SalesChannel,
  Shift,
  StockMovement,
  StockMovementReason,
} from '../types'

/**
 * Server-side persistence. Replaces the localStorage stores.
 *
 * Multi-tenancy contract (Phase 8C): **every exported query takes a `tenantId`
 * and filters by it.** A query without that filter would leak one shop's data
 * into another, so `scripts/check-tenant-scoping.mjs` fails the build if a new
 * tenant-scoped table is read without its tenant predicate.
 */

const ORDER_SEQUENCE_KEY = 'order_number'

/* ------------------------------- mapping ------------------------------ */

type ProductRow = typeof products.$inferSelect

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    cost: row.cost,
    category: row.category,
    emoji: row.emoji,
    stock: row.stock,
    lowStockThreshold: row.lowStockThreshold,
    ...(row.sku ? { sku: row.sku } : {}),
    ...(row.barcode ? { barcode: row.barcode } : {}),
  }
}

type OrderRow = typeof orders.$inferSelect
type OrderItemRow = typeof orderItems.$inferSelect

function toOrderItem(row: OrderItemRow): OrderItem {
  return {
    productId: row.productId,
    name: row.name,
    emoji: row.emoji,
    price: row.price,
    qty: row.qty,
    cost: row.cost,
  }
}

function toOrder(row: OrderRow, items: OrderItemRow[]): Order {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    createdAt: row.createdAt,
    items: items.map(toOrderItem),
    subtotal: row.subtotal,
    discount: row.discount,
    total: row.total,
    costTotal: row.costTotal,
    profit: row.profit,
    paymentMethod: row.paymentMethod,
    amountPaid: row.amountPaid,
    change: row.change,
    status: row.status,
    channel: row.channel,
    ...(row.cashier ? { cashier: row.cashier } : {}),
    ...(row.shiftId ? { shiftId: row.shiftId } : {}),
    ...(row.voidedAt ? { voidedAt: row.voidedAt } : {}),
    ...(row.voidReason ? { voidReason: row.voidReason } : {}),
  }
}

type ShiftRow = typeof shifts.$inferSelect

function toShift(row: ShiftRow): Shift {
  return {
    id: row.id,
    openedAt: row.openedAt,
    openingCash: row.openingCash,
    ...(row.closedAt ? { closedAt: row.closedAt } : {}),
    ...(row.closingCash !== null ? { closingCash: row.closingCash } : {}),
    ...(row.expectedCash !== null ? { expectedCash: row.expectedCash } : {}),
    ...(row.variance !== null ? { variance: row.variance } : {}),
    ...(row.note ? { note: row.note } : {}),
  }
}

type CartRow = typeof carts.$inferSelect
type CartItemRow = typeof cartItems.$inferSelect

function toCartItem(row: CartItemRow): OrderItem {
  return {
    productId: row.productId,
    name: row.name,
    emoji: row.emoji,
    price: row.price,
    qty: row.qty,
    cost: row.cost,
  }
}

function toCart(row: CartRow, items: CartItemRow[]): Cart {
  return {
    id: row.id,
    status: row.status,
    ...(row.label ? { label: row.label } : {}),
    items: items.map(toCartItem),
    updatedAt: row.updatedAt,
  }
}

/** Attaches line items to a batch of orders with a single follow-up query. */
async function hydrateOrders(rows: OrderRow[]): Promise<Order[]> {
  if (rows.length === 0) return []
  const items = await getDb()
    .select()
    .from(orderItems)
    .where(inArray(orderItems.orderId, rows.map((row) => row.id)))
  const byOrder = new Map<string, OrderItemRow[]>()
  for (const item of items) {
    const bucket = byOrder.get(item.orderId)
    if (bucket) bucket.push(item)
    else byOrder.set(item.orderId, [item])
  }
  return rows.map((row) => toOrder(row, byOrder.get(row.id) ?? []))
}

async function hydrateCart(row: CartRow | undefined): Promise<Cart | undefined> {
  if (!row) return undefined
  const items = await getDb().select().from(cartItems).where(eq(cartItems.cartId, row.id))
  return toCart(row, items)
}

/* ------------------------------- products ----------------------------- */

export const listProducts = createServerOnlyFn(async (tenantId: string): Promise<Product[]> => {
  const db = getDb()
  const rows = await db.select().from(products).where(eq(products.tenantId, tenantId))
  if (rows.length > 0) return rows.map(toProduct)

  // Fresh shop: install the seed catalog so the cashier is usable immediately.
  // Only ever runs while this tenant's catalog is empty.
  const { DEFAULT_PRODUCTS } = await import('../data/products')
  await seedProductsIfEmpty(tenantId, DEFAULT_PRODUCTS)
  const seeded = await db.select().from(products).where(eq(products.tenantId, tenantId))
  return seeded.map(toProduct)
})

export const createProduct = createServerOnlyFn(
  async (tenantId: string, input: Omit<Product, 'id'>): Promise<Product> => {
    const now = new Date().toISOString()
    const product: Product = { ...input, id: crypto.randomUUID() }
    await getDb()
      .insert(products)
      .values({
        id: product.id,
        tenantId,
        name: product.name,
        price: product.price,
        cost: product.cost,
        category: product.category,
        emoji: product.emoji,
        stock: product.stock,
        lowStockThreshold: product.lowStockThreshold,
        sku: product.sku ?? null,
        barcode: product.barcode ?? null,
        createdAt: now,
        updatedAt: now,
      })
    return product
  },
)

export const updateProduct = createServerOnlyFn(
  async (tenantId: string, id: string, changes: Partial<Omit<Product, 'id'>>): Promise<void> => {
    const values: Partial<typeof products.$inferInsert> = { updatedAt: new Date().toISOString() }
    if (changes.name !== undefined) values.name = changes.name
    if (changes.price !== undefined) values.price = changes.price
    if (changes.cost !== undefined) values.cost = changes.cost
    if (changes.category !== undefined) values.category = changes.category
    if (changes.emoji !== undefined) values.emoji = changes.emoji
    if (changes.stock !== undefined) values.stock = changes.stock
    if (changes.lowStockThreshold !== undefined) values.lowStockThreshold = changes.lowStockThreshold
    if (changes.sku !== undefined) values.sku = changes.sku === '' ? null : changes.sku
    if (changes.barcode !== undefined) values.barcode = changes.barcode === '' ? null : changes.barcode
    await getDb()
      .update(products)
      .set(values)
      .where(and(eq(products.id, id), eq(products.tenantId, tenantId)))
  },
)

export const removeProduct = createServerOnlyFn(
  async (tenantId: string, id: string): Promise<void> => {
    await getDb()
      .delete(products)
      .where(and(eq(products.id, id), eq(products.tenantId, tenantId)))
  },
)

/** Seeds a tenant's catalog only when that tenant has no products yet. */
export const seedProductsIfEmpty = createServerOnlyFn(
  async (
    tenantId: string,
    seed: Array<Omit<Product, 'id'> & { id: string }>,
  ): Promise<number> => {
    const db = getDb()
    const existing = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.tenantId, tenantId))
      .limit(1)
    if (existing.length > 0) return 0
    const now = new Date().toISOString()
    await db.insert(products).values(
      seed.map((item) => ({
        id: item.id,
        tenantId,
        name: item.name,
        price: item.price,
        cost: item.cost,
        category: item.category,
        emoji: item.emoji,
        stock: item.stock,
        lowStockThreshold: item.lowStockThreshold,
        sku: item.sku ?? null,
        barcode: item.barcode ?? null,
        createdAt: now,
        updatedAt: now,
      })),
    )
    return seed.length
  },
)

/* -------------------------------- stock ------------------------------- */

export const listStockMovements = createServerOnlyFn(
  async (tenantId: string, limit = 200): Promise<StockMovement[]> => {
    const rows = await getDb()
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.tenantId, tenantId))
      .orderBy(desc(stockMovements.at))
      .limit(limit)
    return rows.map((row) => ({
      id: row.id,
      productId: row.productId,
      delta: row.delta,
      reason: row.reason,
      at: row.at,
      ...(row.orderId ? { orderId: row.orderId } : {}),
    }))
  },
)

/**
 * Applies a delta to one product and records the movement.
 * Tracked products never go below zero. Scoped by tenant.
 */
export const applyStockDelta = createServerOnlyFn(
  async (
    tenantId: string,
    input: {
      productId: string
      delta: number
      reason: StockMovementReason
      orderId?: string
    },
  ): Promise<void> => {
    const db = getDb()
    const rows = await db
      .select({ stock: products.stock })
      .from(products)
      .where(and(eq(products.id, input.productId), eq(products.tenantId, tenantId)))
      .limit(1)
    const current = rows[0]
    if (!current || current.stock === null) return

    await db
      .update(products)
      .set({
        stock: Math.max(0, current.stock + input.delta),
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(products.id, input.productId), eq(products.tenantId, tenantId)))

    await db.insert(stockMovements).values({
      id: crypto.randomUUID(),
      tenantId,
      productId: input.productId,
      delta: input.delta,
      reason: input.reason,
      at: new Date().toISOString(),
      orderId: input.orderId ?? null,
    })
  },
)

/* -------------------------------- orders ------------------------------ */

/** Atomically increments and returns this tenant's next order number. */
async function nextOrderNumber(tenantId: string): Promise<string> {
  const db = getDb()
  const rows = await db
    .select()
    .from(counters)
    .where(and(eq(counters.tenantId, tenantId), eq(counters.key, ORDER_SEQUENCE_KEY)))
    .limit(1)
  const next = (rows[0]?.value ?? 0) + 1
  if (rows.length === 0) {
    await db.insert(counters).values({ tenantId, key: ORDER_SEQUENCE_KEY, value: next })
  } else {
    await db
      .update(counters)
      .set({ value: next })
      .where(and(eq(counters.tenantId, tenantId), eq(counters.key, ORDER_SEQUENCE_KEY)))
  }
  return `ORD-${String(next).padStart(3, '0')}`
}

export interface CreateOrderInput {
  items: OrderItem[]
  discount: number
  paymentMethod: PaymentMethod
  amountPaid: number | null
  change: number | null
  channel: SalesChannel
  cashier?: string
  userId?: string
}

export const createOrder = createServerOnlyFn(
  async (tenantId: string, input: CreateOrderInput): Promise<Order> => {
    const db = getDb()
    const subtotal = input.items.reduce((sum, item) => sum + item.price * item.qty, 0)
    const discount = Math.min(Math.max(0, Math.round(input.discount)), subtotal)
    const total = subtotal - discount
    const costTotal = input.items.reduce((sum, item) => sum + item.cost * item.qty, 0)

    const openShiftRows = await db
      .select({ id: shifts.id })
      .from(shifts)
      .where(and(eq(shifts.tenantId, tenantId), sql`${shifts.closedAt} is null`))
      .limit(1)

    const order: Order = {
      id: crypto.randomUUID(),
      orderNumber: await nextOrderNumber(tenantId),
      createdAt: new Date().toISOString(),
      items: input.items,
      subtotal,
      discount,
      total,
      costTotal,
      profit: total - costTotal,
      paymentMethod: input.paymentMethod,
      amountPaid: input.amountPaid,
      change: input.change,
      status: 'paid',
      channel: input.channel,
      ...(input.cashier ? { cashier: input.cashier } : {}),
      ...(openShiftRows[0] ? { shiftId: openShiftRows[0].id } : {}),
    }

    await db.insert(orders).values({
      id: order.id,
      tenantId,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      subtotal,
      discount,
      total,
      costTotal,
      profit: order.profit,
      paymentMethod: order.paymentMethod,
      amountPaid: order.amountPaid,
      change: order.change,
      status: order.status,
      channel: order.channel,
      cashier: order.cashier ?? null,
      shiftId: order.shiftId ?? null,
      userId: input.userId ?? null,
    })

    await db.insert(orderItems).values(
      input.items.map((item) => ({
        id: crypto.randomUUID(),
        orderId: order.id,
        productId: item.productId,
        name: item.name,
        emoji: item.emoji,
        price: item.price,
        cost: item.cost,
        qty: item.qty,
      })),
    )

    // Stock moves only after the order is persisted, so a failure cannot leave
    // inventory deducted for an order that does not exist.
    for (const item of input.items) {
      await applyStockDelta(tenantId, {
        productId: item.productId,
        delta: -item.qty,
        reason: 'sale',
        orderId: order.id,
      })
    }

    return order
  },
)

export interface ListOrdersOptions {
  /** Inclusive lower bound on `created_at` (ISO string). */
  fromIso?: string
}

export const listOrders = createServerOnlyFn(
  async (tenantId: string, options: ListOrdersOptions = {}): Promise<Order[]> => {
    const rows = await getDb()
      .select()
      .from(orders)
      .where(
        options.fromIso
          ? and(eq(orders.tenantId, tenantId), gte(orders.createdAt, options.fromIso))
          : eq(orders.tenantId, tenantId),
      )
      .orderBy(desc(orders.createdAt))
    return hydrateOrders(rows)
  },
)

export const getOrderById = createServerOnlyFn(
  async (tenantId: string, id: string): Promise<Order | undefined> => {
    const rows = await getDb()
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)))
      .limit(1)
    if (rows.length === 0) return undefined
    const [order] = await hydrateOrders(rows)
    return order
  },
)

/** Idempotent: voiding an already-void order changes nothing and restocks nothing. */
export const voidOrder = createServerOnlyFn(
  async (tenantId: string, id: string, reason: string): Promise<Order | undefined> => {
    const db = getDb()
    const rows = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)))
      .limit(1)
    const existing = rows[0]
    if (!existing) return undefined
    if (existing.status === 'void') return (await hydrateOrders(rows))[0]

    await db
      .update(orders)
      .set({
        status: 'void' satisfies OrderStatus,
        voidedAt: new Date().toISOString(),
        voidReason: reason.trim() === '' ? null : reason.trim(),
      })
      .where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)))

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id))
    for (const item of items) {
      await applyStockDelta(tenantId, {
        productId: item.productId,
        delta: item.qty,
        reason: 'void',
        orderId: id,
      })
    }

    const updated = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)))
      .limit(1)
    return (await hydrateOrders(updated))[0]
  },
)

/* -------------------------------- shifts ------------------------------ */

export const listShifts = createServerOnlyFn(async (tenantId: string): Promise<Shift[]> => {
  const rows = await getDb()
    .select()
    .from(shifts)
    .where(eq(shifts.tenantId, tenantId))
    .orderBy(desc(shifts.openedAt))
  return rows.map(toShift)
})

export const getCurrentShift = createServerOnlyFn(
  async (tenantId: string): Promise<Shift | undefined> => {
    const rows = await getDb()
      .select()
      .from(shifts)
      .where(and(eq(shifts.tenantId, tenantId), sql`${shifts.closedAt} is null`))
      .limit(1)
    return rows[0] ? toShift(rows[0]) : undefined
  },
)

export const openShift = createServerOnlyFn(
  async (tenantId: string, input: { openingCash: number; userId?: string }): Promise<Shift> => {
    const db = getDb()
    const existing = await db
      .select()
      .from(shifts)
      .where(and(eq(shifts.tenantId, tenantId), sql`${shifts.closedAt} is null`))
      .limit(1)
    if (existing[0]) return toShift(existing[0])

    const shift: Shift = {
      id: crypto.randomUUID(),
      openedAt: new Date().toISOString(),
      openingCash: Math.max(0, Math.round(input.openingCash)),
    }
    await db.insert(shifts).values({
      id: shift.id,
      tenantId,
      openedAt: shift.openedAt,
      openingCash: shift.openingCash,
      userId: input.userId ?? null,
    })
    return shift
  },
)

export const closeShift = createServerOnlyFn(
  async (
    tenantId: string,
    input: { countedCash: number; note?: string },
  ): Promise<Shift | undefined> => {
    const db = getDb()
    const openRows = await db
      .select()
      .from(shifts)
      .where(and(eq(shifts.tenantId, tenantId), sql`${shifts.closedAt} is null`))
      .limit(1)
    const open = openRows[0]
    if (!open) return undefined

    // Expected drawer cash: float + cash sales − cash refunded by voids.
    const paid = await db
      .select({ total: orders.total })
      .from(orders)
      .where(
        and(
          eq(orders.tenantId, tenantId),
          eq(orders.shiftId, open.id),
          eq(orders.status, 'paid'),
          eq(orders.paymentMethod, 'tunai'),
        ),
      )
    const refunded = await db
      .select({ total: orders.total })
      .from(orders)
      .where(
        and(
          eq(orders.tenantId, tenantId),
          eq(orders.shiftId, open.id),
          eq(orders.status, 'void'),
          eq(orders.paymentMethod, 'tunai'),
        ),
      )
    const expectedCash =
      open.openingCash +
      paid.reduce((sum, row) => sum + row.total, 0) -
      refunded.reduce((sum, row) => sum + row.total, 0)
    const counted = Math.max(0, Math.round(input.countedCash))

    await db
      .update(shifts)
      .set({
        closedAt: new Date().toISOString(),
        closingCash: counted,
        expectedCash,
        variance: counted - expectedCash,
        note: input.note?.trim() ? input.note.trim() : null,
      })
      .where(and(eq(shifts.id, open.id), eq(shifts.tenantId, tenantId)))

    const updated = await db
      .select()
      .from(shifts)
      .where(and(eq(shifts.id, open.id), eq(shifts.tenantId, tenantId)))
      .limit(1)
    return updated[0] ? toShift(updated[0]) : undefined
  },
)

/* --------------------------------- carts ------------------------------ */

async function findOpenCart(tenantId: string, userId: string): Promise<CartRow | undefined> {
  const rows = await getDb()
    .select()
    .from(carts)
    .where(
      and(eq(carts.tenantId, tenantId), eq(carts.userId, userId), eq(carts.status, 'open')),
    )
    .limit(1)
  return rows[0]
}

export const getOpenCart = createServerOnlyFn(
  async (tenantId: string, userId: string): Promise<Cart | undefined> => {
    return hydrateCart(await findOpenCart(tenantId, userId))
  },
)

/** Replaces the open cart's items wholesale. Last write wins. */
export const saveCart = createServerOnlyFn(
  async (tenantId: string, userId: string, items: OrderItem[]): Promise<Cart> => {
    const db = getDb()
    const now = new Date().toISOString()
    const existing = await findOpenCart(tenantId, userId)
    const cartId = existing?.id ?? crypto.randomUUID()

    if (!existing) {
      await db.insert(carts).values({
        id: cartId,
        tenantId,
        userId,
        status: 'open',
        createdAt: now,
        updatedAt: now,
      })
    }

    await db.delete(cartItems).where(eq(cartItems.cartId, cartId))
    if (items.length > 0) {
      await db.insert(cartItems).values(
        items.map((item) => ({
          id: crypto.randomUUID(),
          cartId,
          productId: item.productId,
          name: item.name,
          emoji: item.emoji,
          price: item.price,
          cost: item.cost,
          qty: item.qty,
          updatedAt: now,
        })),
      )
    }
    await db
      .update(carts)
      .set({ updatedAt: now })
      .where(and(eq(carts.id, cartId), eq(carts.tenantId, tenantId)))

    const rows = await db
      .select()
      .from(carts)
      .where(and(eq(carts.id, cartId), eq(carts.tenantId, tenantId)))
      .limit(1)
    const saved = await hydrateCart(rows[0])
    return saved ?? { id: cartId, status: 'open', items: [...items], updatedAt: now }
  },
)

export const listParkedCarts = createServerOnlyFn(
  async (tenantId: string, userId: string): Promise<Cart[]> => {
    const db = getDb()
    const rows = await db
      .select()
      .from(carts)
      .where(
        and(eq(carts.tenantId, tenantId), eq(carts.userId, userId), eq(carts.status, 'parked')),
      )
      .orderBy(desc(carts.updatedAt))
    if (rows.length === 0) return []
    const items = await db
      .select()
      .from(cartItems)
      .where(inArray(cartItems.cartId, rows.map((row) => row.id)))
    const byCart = new Map<string, CartItemRow[]>()
    for (const item of items) {
      const bucket = byCart.get(item.cartId)
      if (bucket) bucket.push(item)
      else byCart.set(item.cartId, [item])
    }
    return rows.map((row) => toCart(row, byCart.get(row.id) ?? []))
  },
)

/** Parks the open cart under a label so the cashier can start a new one. */
export const parkCart = createServerOnlyFn(
  async (tenantId: string, userId: string, label?: string): Promise<void> => {
    const db = getDb()
    const open = await findOpenCart(tenantId, userId)
    if (!open) return
    const hasItems = await db
      .select({ id: cartItems.id })
      .from(cartItems)
      .where(eq(cartItems.cartId, open.id))
      .limit(1)
    if (hasItems.length === 0) {
      // An empty cart is not worth parking.
      await db
        .delete(carts)
        .where(and(eq(carts.id, open.id), eq(carts.tenantId, tenantId)))
      return
    }
    await db
      .update(carts)
      .set({
        status: 'parked',
        label: label?.trim() ? label.trim() : null,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(carts.id, open.id), eq(carts.tenantId, tenantId)))
  },
)

/** Brings a parked cart back as the open one, parking the current open cart. */
export const resumeCart = createServerOnlyFn(
  async (tenantId: string, userId: string, cartId: string): Promise<Cart | undefined> => {
    const db = getDb()
    const rows = await db
      .select()
      .from(carts)
      .where(
        and(eq(carts.id, cartId), eq(carts.tenantId, tenantId), eq(carts.userId, userId)),
      )
      .limit(1)
    const target = rows[0]
    if (!target) return undefined

    const open = await findOpenCart(tenantId, userId)
    if (open && open.id !== target.id) {
      const openItems = await db
        .select({ id: cartItems.id })
        .from(cartItems)
        .where(eq(cartItems.cartId, open.id))
        .limit(1)
      if (openItems.length === 0) {
        // Drop an empty open cart instead of leaving clutter behind.
        await db
          .delete(carts)
          .where(and(eq(carts.id, open.id), eq(carts.tenantId, tenantId)))
      } else {
        await db
          .update(carts)
          .set({ status: 'parked', updatedAt: new Date().toISOString() })
          .where(and(eq(carts.id, open.id), eq(carts.tenantId, tenantId)))
      }
    }
    await db
      .update(carts)
      .set({ status: 'open', label: null, updatedAt: new Date().toISOString() })
      .where(and(eq(carts.id, target.id), eq(carts.tenantId, tenantId)))
    return hydrateCart(target)
  },
)

export const deleteCart = createServerOnlyFn(
  async (tenantId: string, userId: string, cartId: string): Promise<void> => {
    await getDb()
      .delete(carts)
      .where(
        and(eq(carts.id, cartId), eq(carts.tenantId, tenantId), eq(carts.userId, userId)),
      )
  },
)

/* ----------------------------- legacy import -------------------------- */

export interface ImportProduct {
  id: string
  name: string
  price: number
  cost: number
  category: ProductCategory
  emoji: string
  stock: number | null
  lowStockThreshold: number
  sku?: string
  barcode?: string
}

export interface ImportOrder {
  id: string
  orderNumber: string
  createdAt: string
  items: OrderItem[]
  subtotal: number
  discount: number
  total: number
  costTotal: number
  profit: number
  paymentMethod: PaymentMethod
  amountPaid: number | null
  change: number | null
  status: OrderStatus
  channel: SalesChannel
  cashier?: string
  shiftId?: string
  voidedAt?: string
  voidReason?: string
}

export interface ImportShift {
  id: string
  openedAt: string
  closedAt?: string
  openingCash: number
  closingCash?: number
  expectedCash?: number
  variance?: number
  note?: string
}

export interface ImportStockMovement {
  id: string
  productId: string
  delta: number
  reason: StockMovementReason
  at: string
  orderId?: string
}

export interface LegacyImportInput {
  batchId: string
  products: ImportProduct[]
  orders: ImportOrder[]
  shifts: ImportShift[]
  stockMovements: ImportStockMovement[]
  /** Highest order number seen in the legacy data, as a bare integer. */
  orderNumberCounter: number
}

export interface ImportBatchResult {
  batchId: string
  products: number
  orders: number
  shifts: number
  stockMovements: number
}

/** Parses the numeric part of `ORD-###`; 0 when it does not match. */
export function orderNumberValue(orderNumber: string): number {
  const match = /(\d+)\s*$/.exec(orderNumber)
  return match ? Number(match[1]) : 0
}

/**
 * Imports a legacy localStorage snapshot into one tenant, in a single
 * transaction. Idempotent: original ids are reused as primary keys with
 * `on conflict do nothing`, so running twice changes nothing. Every row is
 * tagged with `importBatchId` so `undoImport` can remove exactly this batch.
 */
export const importBatch = createServerOnlyFn(
  async (
    tenantId: string,
    userId: string,
    input: LegacyImportInput,
  ): Promise<ImportBatchResult> => {
    const db = getDb()
    const now = new Date().toISOString()

    return db.transaction(async (tx) => {
      let productCount = 0
      if (input.products.length > 0) {
        const inserted = await tx
          .insert(products)
          .values(
            input.products.map((item) => ({
              id: item.id,
              tenantId,
              name: item.name,
              price: item.price,
              cost: item.cost,
              category: item.category,
              emoji: item.emoji,
              stock: item.stock,
              lowStockThreshold: item.lowStockThreshold,
              sku: item.sku ?? null,
              barcode: item.barcode ?? null,
              importBatchId: input.batchId,
              createdAt: now,
              updatedAt: now,
            })),
          )
          .onConflictDoNothing()
          .returning({ id: products.id })
        productCount = inserted.length
      }

      let orderCount = 0
      for (const order of input.orders) {
        const inserted = await tx
          .insert(orders)
          .values({
            id: order.id,
            tenantId,
            orderNumber: order.orderNumber,
            createdAt: order.createdAt,
            subtotal: order.subtotal,
            discount: order.discount,
            total: order.total,
            costTotal: order.costTotal,
            profit: order.profit,
            paymentMethod: order.paymentMethod,
            amountPaid: order.amountPaid,
            change: order.change,
            status: order.status,
            channel: order.channel,
            cashier: order.cashier ?? null,
            shiftId: order.shiftId ?? null,
            voidedAt: order.voidedAt ?? null,
            voidReason: order.voidReason ?? null,
            userId,
            importBatchId: input.batchId,
          })
          .onConflictDoNothing()
          .returning({ id: orders.id })
        if (inserted.length === 0) continue
        orderCount += 1
        if (order.items.length > 0) {
          await tx.insert(orderItems).values(
            order.items.map((item) => ({
              id: crypto.randomUUID(),
              orderId: order.id,
              productId: item.productId,
              name: item.name,
              emoji: item.emoji,
              price: item.price,
              cost: item.cost,
              qty: item.qty,
            })),
          )
        }
      }

      let shiftCount = 0
      if (input.shifts.length > 0) {
        const inserted = await tx
          .insert(shifts)
          .values(
            input.shifts.map((shift) => ({
              id: shift.id,
              tenantId,
              openedAt: shift.openedAt,
              closedAt: shift.closedAt ?? null,
              openingCash: shift.openingCash,
              closingCash: shift.closingCash ?? null,
              expectedCash: shift.expectedCash ?? null,
              variance: shift.variance ?? null,
              note: shift.note ?? null,
              userId,
              importBatchId: input.batchId,
            })),
          )
          .onConflictDoNothing()
          .returning({ id: shifts.id })
        shiftCount = inserted.length
      }

      let movementCount = 0
      if (input.stockMovements.length > 0) {
        const inserted = await tx
          .insert(stockMovements)
          .values(
            input.stockMovements.map((movement) => ({
              id: movement.id,
              tenantId,
              productId: movement.productId,
              delta: movement.delta,
              reason: movement.reason,
              at: movement.at,
              orderId: movement.orderId ?? null,
              importBatchId: input.batchId,
            })),
          )
          .onConflictDoNothing()
          .returning({ id: stockMovements.id })
        movementCount = inserted.length
      }

      // Never reuse a number: keep the counter at the highest legacy value.
      const orderNumberCounter = Math.max(
        input.orderNumberCounter,
        ...input.orders.map((order) => orderNumberValue(order.orderNumber)),
        0,
      )
      const counterRows = await tx
        .select()
        .from(counters)
        .where(and(eq(counters.tenantId, tenantId), eq(counters.key, ORDER_SEQUENCE_KEY)))
        .limit(1)
      const nextCounter = Math.max(counterRows[0]?.value ?? 0, orderNumberCounter)
      if (counterRows.length === 0) {
        await tx.insert(counters).values({
          tenantId,
          key: ORDER_SEQUENCE_KEY,
          value: nextCounter,
        })
      } else {
        await tx
          .update(counters)
          .set({ value: nextCounter })
          .where(and(eq(counters.tenantId, tenantId), eq(counters.key, ORDER_SEQUENCE_KEY)))
      }

      return {
        batchId: input.batchId,
        products: productCount,
        orders: orderCount,
        shifts: shiftCount,
        stockMovements: movementCount,
      }
    })
  },
)

/** Removes every row that came from one import batch. */
export const undoImport = createServerOnlyFn(
  async (tenantId: string, batchId: string): Promise<void> => {
    const db = getDb()
    await db.transaction(async (tx) => {
      await tx.delete(orders).where(and(eq(orders.tenantId, tenantId), eq(orders.importBatchId, batchId)))
      await tx.delete(shifts).where(and(eq(shifts.tenantId, tenantId), eq(shifts.importBatchId, batchId)))
      await tx
        .delete(stockMovements)
        .where(and(eq(stockMovements.tenantId, tenantId), eq(stockMovements.importBatchId, batchId)))
      await tx
        .delete(products)
        .where(and(eq(products.tenantId, tenantId), eq(products.importBatchId, batchId)))
    })
  },
)

export type { ProductCategory }
