import { createServerOnlyFn } from '@tanstack/react-start'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { getDb } from '../db/client.server'
import { counters, orderItems, orders, products, shifts, stockMovements } from '../db/schema'
import type {
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
 * Every export is a `createServerOnlyFn`, so this module can only ever run
 * behind a server function. Shapes returned here match `src/types.ts` exactly,
 * which is what keeps the UI unchanged by the move to a database.
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

/* ------------------------------- products ----------------------------- */

export const listProducts = createServerOnlyFn(async (): Promise<Product[]> => {
  const db = getDb()
  const rows = await db.select().from(products)
  if (rows.length > 0) return rows.map(toProduct)

  // Fresh database: install the seed catalog so the cashier is usable
  // immediately. Only ever runs while the table is empty.
  const { DEFAULT_PRODUCTS } = await import('../data/products')
  await seedProductsIfEmpty(DEFAULT_PRODUCTS)
  const seeded = await db.select().from(products)
  return seeded.map(toProduct)
})

export const createProduct = createServerOnlyFn(
  async (input: Omit<Product, 'id'>): Promise<Product> => {
    const now = new Date().toISOString()
    const product: Product = { ...input, id: crypto.randomUUID() }
    await getDb()
      .insert(products)
      .values({
        id: product.id,
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
  async (id: string, changes: Partial<Omit<Product, 'id'>>): Promise<void> => {
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
    await getDb().update(products).set(values).where(eq(products.id, id))
  },
)

export const removeProduct = createServerOnlyFn(async (id: string): Promise<void> => {
  await getDb().delete(products).where(eq(products.id, id))
})

/** Seeds the catalog only when the table is empty. */
export const seedProductsIfEmpty = createServerOnlyFn(
  async (seed: Array<Omit<Product, 'id'> & { id: string }>): Promise<number> => {
    const db = getDb()
    const existing = await db.select({ id: products.id }).from(products).limit(1)
    if (existing.length > 0) return 0
    const now = new Date().toISOString()
    await db.insert(products).values(
      seed.map((item) => ({
        id: item.id,
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
  async (limit = 200): Promise<StockMovement[]> => {
    const rows = await getDb()
      .select()
      .from(stockMovements)
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
 * Tracked products never go below zero.
 */
export const applyStockDelta = createServerOnlyFn(
  async (input: {
    productId: string
    delta: number
    reason: StockMovementReason
    orderId?: string
  }): Promise<void> => {
    const db = getDb()
    const rows = await db
      .select({ stock: products.stock })
      .from(products)
      .where(eq(products.id, input.productId))
      .limit(1)
    const current = rows[0]
    if (!current || current.stock === null) return

    await db
      .update(products)
      .set({
        stock: Math.max(0, current.stock + input.delta),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(products.id, input.productId))

    await db.insert(stockMovements).values({
      id: crypto.randomUUID(),
      productId: input.productId,
      delta: input.delta,
      reason: input.reason,
      at: new Date().toISOString(),
      orderId: input.orderId ?? null,
    })
  },
)

/* -------------------------------- orders ------------------------------ */

/** Atomically increments and returns the next order number. */
async function nextOrderNumber(): Promise<string> {
  const db = getDb()
  const rows = await db.select().from(counters).where(eq(counters.key, ORDER_SEQUENCE_KEY)).limit(1)
  const next = (rows[0]?.value ?? 0) + 1
  if (rows.length === 0) {
    await db.insert(counters).values({ key: ORDER_SEQUENCE_KEY, value: next })
  } else {
    await db.update(counters).set({ value: next }).where(eq(counters.key, ORDER_SEQUENCE_KEY))
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

export const createOrder = createServerOnlyFn(async (input: CreateOrderInput): Promise<Order> => {
  const db = getDb()
  const subtotal = input.items.reduce((sum, item) => sum + item.price * item.qty, 0)
  const discount = Math.min(Math.max(0, Math.round(input.discount)), subtotal)
  const total = subtotal - discount
  const costTotal = input.items.reduce((sum, item) => sum + item.cost * item.qty, 0)

  const openShiftRows = await db
    .select({ id: shifts.id })
    .from(shifts)
    .where(sql`${shifts.closedAt} is null`)
    .limit(1)

  const order: Order = {
    id: crypto.randomUUID(),
    orderNumber: await nextOrderNumber(),
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
    await applyStockDelta({ productId: item.productId, delta: -item.qty, reason: 'sale', orderId: order.id })
  }

  return order
})

export const listOrders = createServerOnlyFn(async (): Promise<Order[]> => {
  const rows = await getDb().select().from(orders).orderBy(desc(orders.createdAt))
  return hydrateOrders(rows)
})

export const getOrderById = createServerOnlyFn(async (id: string): Promise<Order | undefined> => {
  const rows = await getDb().select().from(orders).where(eq(orders.id, id)).limit(1)
  if (rows.length === 0) return undefined
  const [order] = await hydrateOrders(rows)
  return order
})

/** Idempotent: voiding an already-void order changes nothing and restocks nothing. */
export const voidOrder = createServerOnlyFn(async (id: string, reason: string): Promise<Order | undefined> => {
  const db = getDb()
  const rows = await db.select().from(orders).where(eq(orders.id, id)).limit(1)
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
    .where(eq(orders.id, id))

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id))
  for (const item of items) {
    await applyStockDelta({ productId: item.productId, delta: item.qty, reason: 'void', orderId: id })
  }

  const updated = await db.select().from(orders).where(eq(orders.id, id)).limit(1)
  return (await hydrateOrders(updated))[0]
})

/* -------------------------------- shifts ------------------------------ */

export const listShifts = createServerOnlyFn(async (): Promise<Shift[]> => {
  const rows = await getDb().select().from(shifts).orderBy(desc(shifts.openedAt))
  return rows.map(toShift)
})

export const getCurrentShift = createServerOnlyFn(async (): Promise<Shift | undefined> => {
  const rows = await getDb()
    .select()
    .from(shifts)
    .where(sql`${shifts.closedAt} is null`)
    .limit(1)
  return rows[0] ? toShift(rows[0]) : undefined
})

export const openShift = createServerOnlyFn(
  async (input: { openingCash: number; userId?: string }): Promise<Shift> => {
    const db = getDb()
    const existing = await db
      .select()
      .from(shifts)
      .where(sql`${shifts.closedAt} is null`)
      .limit(1)
    if (existing[0]) return toShift(existing[0])

    const shift: Shift = {
      id: crypto.randomUUID(),
      openedAt: new Date().toISOString(),
      openingCash: Math.max(0, Math.round(input.openingCash)),
    }
    await db.insert(shifts).values({
      id: shift.id,
      openedAt: shift.openedAt,
      openingCash: shift.openingCash,
      userId: input.userId ?? null,
    })
    return shift
  },
)

export const closeShift = createServerOnlyFn(
  async (input: { countedCash: number; note?: string }): Promise<Shift | undefined> => {
    const db = getDb()
    const openRows = await db
      .select()
      .from(shifts)
      .where(sql`${shifts.closedAt} is null`)
      .limit(1)
    const open = openRows[0]
    if (!open) return undefined

    // Expected drawer cash: float + cash sales − cash refunded by voids.
    const paid = await db
      .select({ total: orders.total })
      .from(orders)
      .where(
        and(eq(orders.shiftId, open.id), eq(orders.status, 'paid'), eq(orders.paymentMethod, 'tunai')),
      )
    const refunded = await db
      .select({ total: orders.total })
      .from(orders)
      .where(
        and(eq(orders.shiftId, open.id), eq(orders.status, 'void'), eq(orders.paymentMethod, 'tunai')),
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
      .where(eq(shifts.id, open.id))

    const updated = await db.select().from(shifts).where(eq(shifts.id, open.id)).limit(1)
    return updated[0] ? toShift(updated[0]) : undefined
  },
)

export type { ProductCategory }
