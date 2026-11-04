import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import * as repo from '~/lib/data.server'
import { requireMembership } from '~/lib/tenant.server'
import { checkoutFormSchema, parseCheckoutForm } from '~/lib/validation'
import type { Order } from '~/types'

/**
 * Checkout RPC.
 *
 * Settles the caller's open server cart (ADR-0003/0004). The client sends no
 * cart id, no items, and no prices: the server finds the open cart, prices it
 * from the live catalog, computes totals and change itself, and settles the
 * cart exactly once. The form payload is still re-validated here so a crafted
 * request cannot bypass the input rules the UI applies.
 */
export const checkoutFn = createServerFn({ method: 'POST' })
  .validator(z.object({ checkout: checkoutFormSchema }))
  .handler(async ({ data: input }): Promise<Order> => {
    const ctx = await requireMembership('cashier')
    const cart = await repo.getOpenCart(ctx.tenantId, ctx.userId)
    if (!cart || cart.items.length === 0) {
      throw new Error('Keranjang masih kosong')
    }
    const checkout = parseCheckoutForm(input.checkout)
    // The validated discount intent travels; the rupiah value is computed
    // server-side against the server's own subtotal (ADR-0003).
    return repo.checkoutCart(ctx.tenantId, ctx.userId, cart.id, {
      discount: { amount: checkout.discountAmount, percent: checkout.discountPercent },
      paymentMethod: checkout.paymentMethod,
      amountPaid: checkout.paymentMethod === 'cash' ? checkout.cashTendered : null,
      channel: checkout.channel,
      cashier: checkout.cashier ?? '',
      customerName: checkout.customerName ?? '',
    })
  })
