import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import * as repo from '~/lib/data.server'
import { checkoutFormSchema, parseCheckoutForm } from '~/lib/validation'
import type { CheckoutInput } from '~/lib/validation'
import { appValidator, withAppHandler } from '~/lib/app-server-fn'
import { AppError, isAppError } from '~/shared/lib/app-error'
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
 * Expected failures are returned as typed outcomes so the client branches on
 * `kind` instead of matching error messages.
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
