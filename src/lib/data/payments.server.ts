/**
 * Payments: QRIS attempts, cancellation, regeneration, and reconciliation.
 *
 * Every read and write is tenant-scoped except `findPaymentByReference`, the
 * one deliberate exception documented in `scripts/check-tenant-scoping.mjs`:
 * a Xendit webhook has no session, so it resolves the row by our globally
 * unique reference id and then uses that row's `tenantId` for every write.
 */

import { and, desc, eq, inArray } from 'drizzle-orm'
import { createServerOnlyFn } from '@tanstack/react-start'
import { getDb } from '../../db/client.server'
import { cartItems, carts, orderItems, orders, payments } from '../../db/schema'
import type { Order, PaymentAttempt } from '../../types'
import { AppError } from '../../shared/lib/app-error'
import {
  amountMatches,
  nextPaymentStatus,
  qrExpiryFrom,
} from '../../domain/sales/payment-lifecycle'
import type { PaymentSignal } from '../../domain/sales/payment-lifecycle'
import { createQrisPayment, getPaymentRequest, simulatePayment } from '../../server/payments/xendit.server'
import type { XenditPaymentRequest } from '../../server/payments/xendit.server'
import { isXenditConfigured, isXenditTestMode } from '../env.server'
import { checkoutCart, getOrderById } from './orders.server'
import type { CheckoutCartInput } from './orders.server'
import { applyStockDeltaOn } from './stock.server'
import { toPayment } from './mappers.server'
import type { DbOrTx, PaymentRow } from './mappers.server'

/* ------------------------------ lookups ------------------------------- */

/** Latest attempt for one order, tenant-scoped. */
export async function findLatestPaymentOn(
  db: DbOrTx,
  tenantId: string,
  orderId: string,
): Promise<PaymentRow | undefined> {
  const rows = await db
    .select()
    .from(payments)
    .where(and(eq(payments.tenantId, tenantId), eq(payments.orderId, orderId)))
    .orderBy(desc(payments.createdAt))
    .limit(1)
  return rows[0]
}

export const getLatestPayment = createServerOnlyFn(
  async (tenantId: string, orderId: string): Promise<PaymentAttempt | undefined> => {
    const row = await findLatestPaymentOn(getDb(), tenantId, orderId)
    return row ? toPayment(row) : undefined
  },
)

/**
 * THE documented unscoped read.
 *
 * Called only by the webhook, before it knows which tenant the event belongs
 * to. Never use this from a screen or an RPC handler.
 */
export async function findPaymentByReference(
  referenceId: string,
): Promise<PaymentRow | undefined> {
  const rows = await getDb()
    .select()
    .from(payments)
    .where(eq(payments.referenceId, referenceId))
    .limit(1)
  return rows[0]
}

/* ------------------------------- writes ------------------------------- */

/** Persists the gateway identifiers once the create call succeeds. */
export async function recordPaymentCreated(
  tenantId: string,
  paymentId: string,
  created: XenditPaymentRequest,
): Promise<PaymentAttempt> {
  const now = new Date().toISOString()
  const db = getDb()
  await db
    .update(payments)
    .set({
      providerRef: created.id || null,
      qrString: created.qrString,
      status: 'pending',
      expiresAt: created.expiresAt,
      rawPayload: JSON.stringify(created),
      updatedAt: now,
    })
    .where(
      and(
        eq(payments.id, paymentId),
        eq(payments.tenantId, tenantId),
        // Only a `creating` attempt may become payable. If the cashier
        // cancelled while the create call was in flight, the QR exists at
        // Xendit but must not resurrect the voided order; a late capture is
        // recorded as `paid_after_cancel` for a manual refund instead.
        eq(payments.status, 'creating'),
      ),
    )
  return toPayment(await requirePaymentRow(tenantId, paymentId))
}

/** Marks a create call that never produced a usable QR. */
export async function recordPaymentFailure(
  tenantId: string,
  paymentId: string,
  failureCode: string,
  detail: string,
): Promise<PaymentAttempt> {
  const db = getDb()
  await db
    .update(payments)
    .set({
      status: 'failed',
      failureCode,
      rawPayload: detail.slice(0, 4000),
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(payments.id, paymentId),
        eq(payments.tenantId, tenantId),
        // A failure report must never overwrite a terminal state. `paid` and
        // `cancelled` are final; only a live attempt can fail.
        inArray(payments.status, ['creating', 'pending']),
      ),
    )
  return toPayment(await requirePaymentRow(tenantId, paymentId))
}

async function requirePaymentRow(tenantId: string, paymentId: string): Promise<PaymentRow> {
  const rows = await getDb()
    .select()
    .from(payments)
    .where(and(eq(payments.id, paymentId), eq(payments.tenantId, tenantId)))
    .limit(1)
  const row = rows[0]
  if (!row) throw new AppError('not-found', 'Pembayaran tidak ditemukan')
  return row
}

/** Records a suspicious event without changing the attempt's status. */
export async function recordPaymentAnomaly(
  tenantId: string,
  paymentId: string,
  failureCode: string,
  detail: string,
): Promise<PaymentAttempt> {
  const db = getDb()
  await db
    .update(payments)
    .set({
      failureCode,
      rawPayload: detail.slice(0, 4000),
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(payments.id, paymentId), eq(payments.tenantId, tenantId)))
  return toPayment(await requirePaymentRow(tenantId, paymentId))
}

/**
 * Applies one gateway signal idempotently and, when it confirms money, flips
 * the order from `pending` to `paid` in the same transaction.
 *
 * Late payments after the display window still count. A payment arriving
 * after the cashier cancelled is recorded but cannot resurrect a voided
 * order: the owner refunds it from the Xendit dashboard.
 */
export async function applyPaymentSignal(
  payment: PaymentRow,
  signal: PaymentSignal,
  detail: { rawPayload?: string; providerRef?: string | null } = {},
): Promise<PaymentAttempt> {
  const db = getDb()
  return db.transaction(async (tx) => {
    const currentRows = await tx
      .select()
      .from(payments)
      .where(and(eq(payments.id, payment.id), eq(payments.tenantId, payment.tenantId)))
      .limit(1)
    const current = currentRows[0]
    if (!current) throw new AppError('not-found', 'Pembayaran tidak ditemukan')

    const next = nextPaymentStatus(current.status, signal)
    if (next === null) {
      // Duplicate or out-of-order event. Keep it for reconciliation, but a
      // payment that lands after a cancel must be visible to the owner.
      await tx
        .update(payments)
        .set({
          failureCode: signal === 'succeeded' && current.status === 'cancelled' ? 'paid_after_cancel' : current.failureCode,
          rawPayload: detail.rawPayload ?? current.rawPayload,
          updatedAt: new Date().toISOString(),
        })
        .where(and(eq(payments.id, current.id), eq(payments.tenantId, current.tenantId)))
      const unchanged = await tx
        .select()
        .from(payments)
        .where(and(eq(payments.id, current.id), eq(payments.tenantId, current.tenantId)))
        .limit(1)
      return toPayment(unchanged[0] ?? current)
    }

    const now = new Date().toISOString()
    await tx
      .update(payments)
      .set({
        status: next,
        ...(next === 'paid' ? { paidAt: now } : {}),
        providerRef: detail.providerRef ?? current.providerRef,
        rawPayload: detail.rawPayload ?? current.rawPayload,
        updatedAt: now,
      })
      .where(and(eq(payments.id, current.id), eq(payments.tenantId, current.tenantId)))

    if (next === 'paid') {
      await tx
        .update(orders)
        .set({ status: 'paid' })
        .where(
          and(
            eq(orders.id, current.orderId),
            eq(orders.tenantId, current.tenantId),
            eq(orders.status, 'pending'),
          ),
        )
    }

    const updated = await tx
      .select()
      .from(payments)
      .where(and(eq(payments.id, current.id), eq(payments.tenantId, current.tenantId)))
      .limit(1)
    return toPayment(updated[0] ?? current)
  })
}

/* ------------------------------ QRIS flow ----------------------------- */

/** True when a key is configured; the checkout screen hides QRIS otherwise. */
export const isQrisAvailable = createServerOnlyFn((): boolean => isXenditConfigured())

/**
 * Whether the sandbox "Simulasikan Pembayaran" action may be offered.
 *
 * Keyed off the credential, not the build: a deployed sandbox still runs a
 * production build, and that is exactly where the button is useful.
 */
export const isPaymentSimulationAvailable = createServerOnlyFn((): boolean =>
  isXenditTestMode(),
)

export interface BeginQrisInput {
  discount: { amount: number; percent: number | null }
  channel: CheckoutCartInput['channel']
  cashier?: string
}

interface QrisAttempt {
  order: Order
  payment: PaymentAttempt
}

async function requestQr(
  tenantId: string,
  order: Order,
  paymentId: string,
  referenceId: string,
  expiresAt: string,
): Promise<PaymentAttempt> {
  try {
    const created = await createQrisPayment({
      referenceId,
      amount: order.total,
      description: `Pesanan ${order.orderNumber}`,
      expiresAt,
      metadata: { order_id: order.id },
    })
    if (!created.qrString) {
      return recordPaymentFailure(
        tenantId,
        paymentId,
        'qr_missing',
        'Xendit response had no QR_STRING action',
      )
    }
    return recordPaymentCreated(tenantId, paymentId, created)
  } catch (cause) {
    return recordPaymentFailure(
      tenantId,
      paymentId,
      'create_failed',
      cause instanceof Error ? cause.message : 'Unknown Xendit error',
    )
  }
}

/**
 * Order-first QRIS checkout: reserve the cart as a `pending` order, then ask
 * Xendit for a fixed-amount QR. If the gateway call fails the order stays
 * pending and the payment attempt is `failed`, so the cashier can retry from
 * the payment screen without re-ringing the sale.
 */
export const beginQrisCheckout = createServerOnlyFn(
  async (
    tenantId: string,
    userId: string,
    cartId: string,
    input: BeginQrisInput,
  ): Promise<QrisAttempt> => {
    if (!isXenditConfigured()) {
      throw new AppError('payment-invalid', 'QRIS belum dikonfigurasi di server ini')
    }
    const paymentId = crypto.randomUUID()
    const referenceId = `qris-${crypto.randomUUID()}`
    const expiresAt = qrExpiryFrom(new Date())

    const order = await checkoutCart(
      tenantId,
      userId,
      cartId,
      {
        discount: input.discount,
        paymentMethod: 'qris',
        amountPaid: null,
        channel: input.channel,
        cashier: input.cashier ?? '',
      },
      { status: 'pending', payment: { id: paymentId, referenceId, expiresAt } },
    )

    // A double-submit finds the checked-out cart's original order. Reuse its
    // latest attempt instead of creating a second payable QR.
    const existing = await findLatestPaymentOn(getDb(), tenantId, order.id)
    if (existing && existing.id !== paymentId) return { order, payment: toPayment(existing) }

    const payment = await requestQr(tenantId, order, paymentId, referenceId, expiresAt)
    return { order, payment }
  },
)

/** Creates a new attempt for a still-pending order; old attempts are expired. */
export const regenerateQrisPayment = createServerOnlyFn(
  async (tenantId: string, orderId: string): Promise<QrisAttempt | undefined> => {
    const order = await getOrderById(tenantId, orderId)
    if (!order) return undefined
    if (order.status !== 'pending') {
      throw new AppError('payment-invalid', 'Hanya pesanan yang menunggu pembayaran bisa dibuatkan QR baru')
    }

    const db = getDb()
    const now = new Date().toISOString()
    const paymentId = crypto.randomUUID()
    const referenceId = `qris-${crypto.randomUUID()}`
    const expiresAt = qrExpiryFrom(new Date())

    await db.transaction(async (tx) => {
      await tx
        .update(payments)
        .set({ status: 'expired', updatedAt: now })
        .where(
          and(
            eq(payments.tenantId, tenantId),
            eq(payments.orderId, orderId),
            inArray(payments.status, ['creating', 'pending']),
          ),
        )
      await tx.insert(payments).values({
        id: paymentId,
        tenantId,
        orderId,
        provider: 'xendit',
        referenceId,
        status: 'creating',
        amount: order.total,
        expiresAt,
        createdAt: now,
        updatedAt: now,
      })
    })

    const payment = await requestQr(tenantId, order, paymentId, referenceId, expiresAt)
    return { order, payment }
  },
)

/**
 * Cancels a pending order: restock, void, cancel the attempt, and restore the
 * items as a parked cart so the cashier can resume without re-ringing.
 */
export const cancelPendingOrder = createServerOnlyFn(
  async (
    tenantId: string,
    userId: string,
    orderId: string,
    reason: string,
  ): Promise<Order | undefined> => {
    const db = getDb()
    const rows = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)))
      .limit(1)
    const existing = rows[0]
    if (!existing) return undefined
    if (existing.status === 'void') return (await getOrderById(tenantId, orderId)) ?? undefined
    if (existing.status !== 'pending') {
      throw new AppError('payment-invalid', 'Hanya pesanan yang menunggu pembayaran bisa dibatalkan')
    }

    await db.transaction(async (tx) => {
      const now = new Date().toISOString()
      await tx
        .update(orders)
        .set({
          status: 'void',
          voidedAt: now,
          voidReason: reason.trim() === '' ? null : reason.trim(),
        })
        .where(and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)))

      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId))
      for (const item of items) {
        await applyStockDeltaOn(tx, tenantId, {
          productId: item.productId,
          delta: item.qty,
          reason: 'void',
          orderId,
        })
      }

      await tx
        .update(payments)
        .set({ status: 'cancelled', updatedAt: now })
        .where(
          and(
            eq(payments.tenantId, tenantId),
            eq(payments.orderId, orderId),
            inArray(payments.status, ['creating', 'pending', 'expired', 'failed']),
          ),
        )

      // Parked cart, not the open one: an open cart may already be in use.
      const cartId = crypto.randomUUID()
      await tx.insert(carts).values({
        id: cartId,
        tenantId,
        userId,
        status: 'parked',
        label: `Lanjutkan ${existing.orderNumber}`,
        createdAt: now,
        updatedAt: now,
      })
      if (items.length > 0) {
        await tx.insert(cartItems).values(
          items.map((item) => ({
            id: crypto.randomUUID(),
            cartId,
            productId: item.productId,
            name: item.name,
            imageKey: item.imageKey,
            price: item.price,
            cost: item.cost,
            qty: item.qty,
            updatedAt: now,
          })),
        )
      }
    })

    return getOrderById(tenantId, orderId)
  },
)

/* --------------------------- reconciliation --------------------------- */

function signalFromXendit(status: string): PaymentSignal | null {
  switch (status) {
    case 'SUCCEEDED':
    case 'PAID':
      return 'succeeded'
    case 'FAILED':
      return 'failed'
    case 'EXPIRED':
      return 'expired'
    case 'CANCELED':
    case 'CANCELLED':
      return 'cancelled'
    default:
      return null
  }
}

/**
 * Manual "Cek status" / poll fallback for a dropped webhook.
 *
 * Reads Xendit's authoritative state and applies the same transactional rule
 * the webhook uses. An amount mismatch is recorded but never marks the order
 * paid.
 */
export const reconcilePayment = createServerOnlyFn(
  async (tenantId: string, orderId: string): Promise<PaymentAttempt | undefined> => {
    const row = await findLatestPaymentOn(getDb(), tenantId, orderId)
    if (!row) return undefined
    if (!row.providerRef) return toPayment(row)

    const remote = await getPaymentRequest(row.providerRef)
    const signal = signalFromXendit(remote.status)
    if (!signal) return toPayment(row)

    if (signal === 'succeeded' && !amountMatches(row.amount, remote.amount)) {
      return recordPaymentAnomaly(
        tenantId,
        row.id,
        'amount_mismatch',
        `Expected ${row.amount}, Xendit reported ${remote.amount}`,
      )
    }

    return applyPaymentSignal(row, signal, {
      rawPayload: JSON.stringify(remote),
      providerRef: remote.id || row.providerRef,
    })
  },
)

/** Test-mode only: asks Xendit to complete the newest attempt. */
export const simulateOrderPayment = createServerOnlyFn(
  async (tenantId: string, orderId: string): Promise<void> => {
    const row = await findLatestPaymentOn(getDb(), tenantId, orderId)
    if (!row?.providerRef) throw new AppError('payment-invalid', 'Belum ada QR yang bisa disimulasikan')
    // Only a live attempt can be completed. Replaying a settled one would
    // teach the cashier a flow that cannot happen in production.
    if (row.status === 'paid') {
      throw new AppError('payment-invalid', 'Pembayaran ini sudah lunas')
    }
    if (row.status === 'cancelled') {
      throw new AppError('payment-invalid', 'Pembayaran ini sudah dibatalkan')
    }
    await simulatePayment(row.providerRef, row.amount)
  },
)

/** Convenience for the success screen: order plus its newest attempt. */
export const getPendingPaymentForOrder = createServerOnlyFn(
  async (
    tenantId: string,
    orderId: string,
  ): Promise<{ order: Order | undefined; payment: PaymentAttempt | undefined }> => {
    const order = await getOrderById(tenantId, orderId)
    if (!order) return { order: undefined, payment: undefined }
    const payment = await getLatestPayment(tenantId, orderId)
    return { order, payment }
  },
)
