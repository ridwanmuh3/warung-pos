import { createFileRoute } from '@tanstack/react-router'
import { OrdersPage } from '~/features/sales/OrdersPage'
import { orderSearchSchema } from '~/features/sales/order-search'
import { listOrdersFn } from '~/features/sales/sales.functions'
import { dayKey } from '~/lib/format'

export const Route = createFileRoute('/orders/')({
  component: OrdersPage,
  validateSearch: orderSearchSchema,
  // Orders now live in the database, so the server can filter and count them.
  loaderDeps: ({ search }) => ({ q: search.q, method: search.method, channel: search.channel, day: search.day }),
  loader: async ({ deps }) => {
    const all = await listOrdersFn()
    const orders = all.filter((order) => {
      if (deps.day && dayKey(order.createdAt) !== deps.day) return false
      if (deps.method && order.paymentMethod !== deps.method) return false
      if (deps.channel && order.channel !== deps.channel) return false
      if (deps.q) {
        const needle = deps.q.toLowerCase()
        const haystack = `${order.orderNumber} ${order.customerName ?? ''} ${order.items.map((item) => item.name).join(' ')}`
        if (!haystack.toLowerCase().includes(needle)) return false
      }
      return true
    })
    // Void orders never count toward the day's takings.
    const netTotal = orders
      .filter((order) => order.status === 'paid')
      .reduce((sum, order) => sum + order.total, 0)
    return { orders, storedCount: all.length, netTotal }
  },
})
