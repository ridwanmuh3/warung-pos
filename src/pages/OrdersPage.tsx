import { Link } from '@tanstack/react-router'
import { IconShoppingCart } from '@tabler/icons-react'
import { PAYMENT_LABELS } from '../data/products'
import { dayKey, formatIDR, formatTime } from '../lib/format'
import { useOrders } from '../lib/useOrders'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import type { Order } from '../types'

const dayFormatter = new Intl.DateTimeFormat('id-ID', { dateStyle: 'full' })

function groupByDay(orders: Order[]): Array<[string, Order[]]> {
  const groups = new Map<string, Order[]>()
  for (const order of orders) {
    const key = dayKey(order.createdAt)
    const bucket = groups.get(key)
    if (bucket) bucket.push(order)
    else groups.set(key, [order])
  }
  return [...groups.entries()]
}

export function OrdersPage() {
  const orders = useOrders()

  if (orders.length === 0) {
    return (
      <div>
        <PageHeader title="Riwayat Pesanan" />
        <EmptyState
          emoji="🧾"
          title="Belum ada transaksi"
          description="Pesanan yang sudah dibayar akan muncul di sini."
          action={
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              <IconShoppingCart size={16} />
              Buka Kasir
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Riwayat Pesanan"
        subtitle={`${orders.length} transaksi tersimpan di perangkat ini`}
      />

      <div className="space-y-6">
        {groupByDay(orders).map(([key, dayOrders]) => {
          const dayTotal = dayOrders.reduce((sum, order) => sum + order.total, 0)
          return (
            <section key={key}>
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold text-slate-700">
                  {dayFormatter.format(new Date(dayOrders[0].createdAt))}
                </h2>
                <span className="tabular text-sm font-semibold text-brand-600">{formatIDR(dayTotal)}</span>
              </div>
              <ul className="space-y-2">
                {dayOrders.map((order) => (
                  <li key={order.id}>
                    <Link
                      to="/riwayat/$orderId"
                      params={{ orderId: order.id }}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-colors hover:border-brand-500"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="tabular text-sm font-bold text-slate-900">{order.orderNumber}</span>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                            {PAYMENT_LABELS[order.paymentMethod]}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {order.items.map((item) => item.name).join(', ')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="tabular text-sm font-bold text-slate-900">{formatIDR(order.total)}</p>
                        <p className="tabular text-xs text-slate-400">{formatTime(order.createdAt)}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}
