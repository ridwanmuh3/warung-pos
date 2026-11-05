import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import * as repo from '~/lib/data.server'
import { checkoutFormSchema, entityId, parseCheckoutForm } from '~/lib/validation'
import type { CheckoutInput } from '~/lib/validation'
import { appValidator, withAppHandler } from '~/lib/app-server-fn'
import { AppError, isAppError } from '~/shared/lib/app-error'
import type { PaymentAttempt } from '~/types'
import type { CheckoutOutcome } from './checkout.outcome'

export type { CheckoutOutcome } from './checkout.outcome'

/**
 * Checkout RPC.
 *
 * Settles the caller's open server cart (ADR-0003/0004). The client sends no
 * cart id, no items, and no prices: the server finds the open cart, prices it
 * from the live catalog, computes totals and change itself, and settles the
 * cart exactly once. The form payload is still re-validated here so a crafted
 * request cannot bypass the input rules the UI applies.
 *
 * Cash and credit settle synchronously (`ordered`). QRIS reserves the sale as
 * a pending order and returns the dynamic QR (`payment-required`); the order
 * becomes paid only when Xendit confirms it. Expected failures are returned
 * as typed outcomes so the client branches on `kind` instead of matching
 * error messages.
 */

export const checkoutFn = createServerFn({ method: 'POST' })
  .validator(appValidator(z.object({ checkout: checkoutFormSchema })))
  .handler(async ({ data: input }): Promise<CheckoutOutcome> => {
    return withAppHandler('cashier', async (ctx) => {
      const cart = await repo.getOpenCart(ctx.tenantId, ctx.userId)
      if (!cart || cart.items.length === 0) {
        return { kind: 'empty-cart' }
      }
      let checkout: CheckoutInput
      try {
        checkout = parseCheckoutForm(input.checkout)
      } catch (cause) {
        // The same schema the screen uses; a crafted payload must not reach the
        // client as a serialized Zod blob.
        if (cause instanceof z.ZodError) {
          throw new AppError(
            'validation',
            cause.issues[0]?.message ?? 'Input pembayaran tidak valid',
          )
        }
        throw cause
      }
      // The validated discount intent travels; the rupiah value is computed
      // server-side against the server's own subtotal (ADR-0003).
      try {
        if (checkout.paymentMethod === 'qris') {
          const { order, payment } = await repo.beginQrisCheckout(
            ctx.tenantId,
            ctx.userId,
            cart.id,
            {
              discount: { amount: checkout.discountAmount, percent: checkout.discountPercent },
              channel: checkout.channel,
              cashier: checkout.cashier ?? '',
            },
          )
          if (payment.status === 'pending' && payment.qrString) {
            return { kind: 'payment-required', order, payment }
          }
          return {
            kind: 'payment-setup-failed',
            order,
            message: 'Gagal membuat QR pembayaran. Coba buat ulang dari layar pembayaran.',
          }
        }

        const order = await repo.checkoutCart(ctx.tenantId, ctx.userId, cart.id, {
          discount: { amount: checkout.discountAmount, percent: checkout.discountPercent },
          paymentMethod: checkout.paymentMethod,
          amountPaid: checkout.paymentMethod === 'cash' ? checkout.cashTendered : null,
          channel: checkout.channel,
          cashier: checkout.cashier ?? '',
          customerName: checkout.customerName ?? '',
        })
        return { kind: 'ordered', order }
      } catch (cause) {
        if (isAppError(cause) && cause.code === 'product-missing') {
          return { kind: 'product-missing', message: cause.message }
        }
        if (isAppError(cause) && cause.code === 'payment-invalid') {
          return { kind: 'payment-invalid', message: cause.message }
        }
        throw cause
      }
    })
  })

/** Whether the checkout screen may offer QRIS at all. */
export const checkoutCapabilitiesFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<{ qrisEnabled: boolean }> =>
    withAppHandler('cashier', async () => ({ qrisEnabled: repo.isQrisAvailable() })),
)

export interface PaymentStatusResult {
  orderStatus?: string
  payment?: PaymentAttempt
}

/** Lightweight poll used by the pending screen; never calls Xendit. */
export const getPaymentStatusFn = createServerFn({ method: 'GET' })
  .validator(z.object({ orderId: entityId }))
  .handler(async ({ data }): Promise<PaymentStatusResult> => {
    return withAppHandler('cashier', async (ctx) => {
      const { order, payment } = await repo.getPendingPaymentForOrder(ctx.tenantId, data.orderId)
      return { orderStatus: order?.status, payment }
    })
  })

/** Manual "Cek status": asks Xendit directly and applies the result. */
export const reconcilePaymentFn = createServerFn({ method: 'POST' })
  .validator(z.object({ orderId: entityId }))
  .handler(async ({ data }): Promise<PaymentStatusResult> => {
    return withAppHandler('cashier', async (ctx) => {
      const payment = await repo.reconcilePayment(ctx.tenantId, data.orderId)
      const order = await repo.getOrderById(ctx.tenantId, data.orderId)
      return { orderStatus: order?.status, payment }
    })
  })

/** Issues a fresh QR for the same pending order. */
export const regeneratePaymentFn = createServerFn({ method: 'POST' })
  .validator(z.object({ orderId: entityId }))
  .handler(
    async ({
      data,
    }): Promise<{ kind: 'ready'; payment: PaymentAttempt } | { kind: 'not-found' }> => {
      return withAppHandler('cashier', async (ctx) => {
        const result = await repo.regenerateQrisPayment(ctx.tenantId, data.orderId)
        if (!result) return { kind: 'not-found' as const }
        return { kind: 'ready' as const, payment: result.payment }
      })
    },
  )

/** Cancels a pending sale: restock, void, and park the items as a cart. */
export const cancelPendingOrderFn = createServerFn({ method: 'POST' })
  .validator(z.object({ orderId: entityId }))
  .handler(async ({ data }): Promise<{ kind: 'cancelled' } | { kind: 'not-found' }> => {
    return withAppHandler('cashier', async (ctx) => {
      const order = await repo.cancelPendingOrder(ctx.tenantId, ctx.userId, data.orderId, 'QRIS dibatalkan')
      return order ? { kind: 'cancelled' as const } : { kind: 'not-found' as const }
    })
  })

/**
 * Test-mode helper: asks Xendit to complete the newest attempt. Hard-gated to
 * a non-production runtime; the adapter also refuses a live key.
 */
export const simulatePaymentFn = createServerFn({ method: 'POST' })
  .validator(z.object({ orderId: entityId }))
  .handler(async ({ data }): Promise<{ kind: 'simulated' }> => {
    if (process.env.NODE_ENV === 'production') {
      throw new AppError('payment-invalid', 'Simulasi hanya tersedia di lingkungan pengembangan')
    }
    return withAppHandler('cashier', async (ctx) => {
      await repo.simulateOrderPayment(ctx.tenantId, data.orderId)
      return { kind: 'simulated' as const }
    })
  })
