import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import * as data from './data.server'
import { requireMembership } from './tenant.server'
import type { Cart } from '../types'

/**
 * Cart RPC.
 *
 * The cart is now server-side so two devices signed into the same account see
 * the same items. Writes are last-write-wins per cart, which is enough for the
 * one-cashier-per-account reality of a warung.
 */

const cartItemSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1),
  emoji: z.string(),
  price: z.number().int().min(0),
  qty: z.number().int().min(1),
  cost: z.number().int().min(0),
})

export const getOpenCartFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Cart | undefined> => {
    const ctx = await requireMembership('cashier')
    return data.getOpenCart(ctx.tenantId, ctx.userId)
  },
)

export const saveCartFn = createServerFn({ method: 'POST' })
  .validator(z.object({ items: z.array(cartItemSchema) }))
  .handler(async ({ data: input }): Promise<Cart> => {
    const ctx = await requireMembership('cashier')
    return data.saveCart(ctx.tenantId, ctx.userId, input.items)
  })

export const parkCartFn = createServerFn({ method: 'POST' })
  .validator(z.object({ label: z.string().max(60).optional() }))
  .handler(async ({ data: input }): Promise<void> => {
    const ctx = await requireMembership('cashier')
    await data.parkCart(ctx.tenantId, ctx.userId, input.label)
  })

export const listParkedCartsFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Cart[]> => {
    const ctx = await requireMembership('cashier')
    return data.listParkedCarts(ctx.tenantId, ctx.userId)
  },
)

export const resumeCartFn = createServerFn({ method: 'POST' })
  .validator(z.object({ cartId: z.string().min(1) }))
  .handler(async ({ data: input }): Promise<Cart | undefined> => {
    const ctx = await requireMembership('cashier')
    return data.resumeCart(ctx.tenantId, ctx.userId, input.cartId)
  })

export const deleteCartFn = createServerFn({ method: 'POST' })
  .validator(z.object({ cartId: z.string().min(1) }))
  .handler(async ({ data: input }): Promise<void> => {
    const ctx = await requireMembership('cashier')
    await data.deleteCart(ctx.tenantId, ctx.userId, input.cartId)
  })
