import { z } from 'zod'
import type {
  ImportOrder,
  ImportProduct,
  ImportShift,
  ImportStockMovement,
} from './data.server'

/**
 * Reader for the pre-database `localStorage` keys (Phase 8B).
 *
 * Client-only and pure: `localStorage` does not exist on the server, so the
 * `/pulihkan` route that uses this is `ssr: false`. Every record is re-validated
 * with Zod because storage is user-editable; a row that fails is *skipped and
 * reported*, never allowed to abort the whole import.
 */

export const LEGACY_KEYS = {
  users: 'warung-pos.users.v1',
  session: 'warung-pos.session.v1',
  ordersV2: 'warung-pos.orders.v2',
  ordersV1: 'warung-pos.orders.v1',
  orderSequence: 'warung-pos.order-seq.v1',
  products: 'warung-pos.products.v1',
  shifts: 'warung-pos.shifts.v1',
  stockMovements: 'warung-pos.stock-movements.v1',
  cart: 'warung-pos.cart.v1',
} as const

const legacyItemSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1),
  /** Pre-image era rows carried an emoji; imports land with no image. */
  imageKey: z.string().nullable().catch(null),
  price: z.number(),
  qty: z.number().int().min(1),
  cost: z.number().min(0).catch(0),
})

const legacyProductSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  price: z.number(),
  category: z.enum(['makanan', 'minuman', 'snack']),
  imageKey: z.string().nullable().catch(null),
  cost: z.number().min(0).catch(0),
  stock: z.number().nullable().catch(null),
  lowStockThreshold: z.number().catch(5),
  sku: z.string().optional(),
  barcode: z.string().optional(),
})

const legacyOrderSchema = z.object({
  id: z.string().min(1),
  orderNumber: z.string().min(1),
  createdAt: z.string(),
  items: z.array(legacyItemSchema),
  subtotal: z.number().optional(),
  discount: z.number().optional(),
  total: z.number(),
  costTotal: z.number().optional(),
  profit: z.number().optional(),
  paymentMethod: z.enum(['tunai', 'qris', 'transfer']),
  amountPaid: z.number().nullable().catch(null),
  change: z.number().nullable().catch(null),
  status: z.enum(['paid', 'void', 'refunded']).catch('paid'),
  channel: z.enum(['dine-in', 'bungkus', 'ojol']).catch('dine-in'),
  cashier: z.string().optional(),
  shiftId: z.string().optional(),
  voidedAt: z.string().optional(),
  voidReason: z.string().optional(),
})

const legacyShiftSchema = z.object({
  id: z.string().min(1),
  openedAt: z.string(),
  openingCash: z.number(),
  closedAt: z.string().optional(),
  closingCash: z.number().optional(),
  expectedCash: z.number().optional(),
  variance: z.number().optional(),
  note: z.string().optional(),
})

const legacyMovementSchema = z.object({
  id: z.string().min(1),
  productId: z.string().min(1),
  delta: z.number(),
  reason: z.enum(['sale', 'restock', 'adjust', 'void', 'refund']),
  at: z.string(),
  orderId: z.string().optional(),
})

export interface LegacyCounts {
  users: number
  products: number
  orders: number
  shifts: number
  stockMovements: number
  cartItems: number
}

export interface LegacySnapshot {
  /** True when at least one recognised key exists. */
  present: boolean
  counts: LegacyCounts
  products: ImportProduct[]
  orders: ImportOrder[]
  shifts: ImportShift[]
  stockMovements: ImportStockMovement[]
  orderNumberCounter: number
  /** Number of records that failed validation and will not be imported. */
  skipped: number
}

function readRaw(key: string): unknown {
  if (typeof localStorage === 'undefined') return undefined
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? undefined : JSON.parse(raw)
  } catch {
    return undefined
  }
}

function parseArray<T>(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

/** Highest `ORD-NNN` value across a set of legacy order numbers. */
function highestOrderNumber(orders: ImportOrder[]): number {
  return orders.reduce((max, order) => {
    const match = /^ORD-(\d+)$/.exec(order.orderNumber)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)
}

function readSequence(): number {
  const raw = readRaw(LEGACY_KEYS.orderSequence)
  const value = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : Number.NaN
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
}

export function readLegacySnapshot(): LegacySnapshot {
  const usersRaw = parseArray(readRaw(LEGACY_KEYS.users))
  const productsRaw = parseArray(readRaw(LEGACY_KEYS.products))
  const shiftsRaw = parseArray(readRaw(LEGACY_KEYS.shifts))
  const movementsRaw = parseArray(readRaw(LEGACY_KEYS.stockMovements))
  const cartRaw = parseArray(readRaw(LEGACY_KEYS.cart))

  // v2 wins when present; v1 is only read when v2 is missing.
  const ordersRawV2 = readRaw(LEGACY_KEYS.ordersV2)
  const ordersRaw = ordersRawV2 !== undefined ? parseArray(ordersRawV2) : parseArray(readRaw(LEGACY_KEYS.ordersV1))

  let skipped = 0

  const products: ImportProduct[] = []
  for (const entry of productsRaw) {
    const parsed = legacyProductSchema.safeParse(entry)
    if (parsed.success) products.push(parsed.data)
    else skipped += 1
  }

  const orders: ImportOrder[] = []
  for (const entry of ordersRaw) {
    const parsed = legacyOrderSchema.safeParse(entry)
    if (!parsed.success) {
      skipped += 1
      continue
    }
    const o = parsed.data
    const items = o.items
    const subtotal = o.subtotal ?? items.reduce((sum, item) => sum + item.price * item.qty, 0)
    const discount = o.discount ?? Math.max(0, subtotal - o.total)
    const costTotal = o.costTotal ?? items.reduce((sum, item) => sum + item.cost * item.qty, 0)
    orders.push({
      id: o.id,
      orderNumber: o.orderNumber,
      createdAt: o.createdAt,
      items,
      subtotal,
      discount,
      total: o.total,
      costTotal,
      profit: o.profit ?? o.total - costTotal,
      paymentMethod: o.paymentMethod,
      amountPaid: o.amountPaid,
      change: o.change,
      status: o.status,
      channel: o.channel,
      ...(o.cashier ? { cashier: o.cashier } : {}),
      ...(o.shiftId ? { shiftId: o.shiftId } : {}),
      ...(o.voidedAt ? { voidedAt: o.voidedAt } : {}),
      ...(o.voidReason ? { voidReason: o.voidReason } : {}),
    })
  }

  const shifts: ImportShift[] = []
  for (const entry of shiftsRaw) {
    const parsed = legacyShiftSchema.safeParse(entry)
    if (parsed.success) shifts.push(parsed.data)
    else skipped += 1
  }

  const stockMovements: ImportStockMovement[] = []
  for (const entry of movementsRaw) {
    const parsed = legacyMovementSchema.safeParse(entry)
    if (parsed.success) stockMovements.push(parsed.data)
    else skipped += 1
  }

  const cartItems = cartRaw.length

  const present =
    productsRaw.length > 0 ||
    ordersRaw.length > 0 ||
    shiftsRaw.length > 0 ||
    movementsRaw.length > 0 ||
    usersRaw.length > 0 ||
    cartRaw.length > 0

  return {
    present,
    counts: {
      users: usersRaw.length,
      products: productsRaw.length,
      orders: ordersRaw.length,
      shifts: shiftsRaw.length,
      stockMovements: movementsRaw.length,
      cartItems,
    },
    products,
    orders,
    shifts,
    stockMovements,
    orderNumberCounter: Math.max(readSequence(), highestOrderNumber(orders)),
    skipped,
  }
}

export function hasLegacyData(): boolean {
  return readLegacySnapshot().present
}

/** Removes the legacy keys once the user confirms the import is done. */
export function clearLegacyStorage(): void {
  if (typeof localStorage === 'undefined') return
  for (const key of Object.values(LEGACY_KEYS)) {
    try {
      localStorage.removeItem(key)
    } catch {
      // Storage unavailable: nothing to clean up.
    }
  }
}
