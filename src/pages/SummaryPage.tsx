import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { IconArrowRight, IconShoppingCart } from '@tabler/icons-react'
import { PAYMENT_LABELS } from '../data/products'
import { dayKey, formatIDR } from '../lib/format'
import { useOrders } from '../lib/useOrders'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import type { PaymentMethod } from '../types'

const todayFormatter = new Intl.DateTimeFormat('id-ID', { dateStyle: 'full' })

function StatCard({
  testId,
  label,
  value,
  hint,
}: {
  testId: string
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p data-testid={testId} className="tabular mt-1 text-2xl font-bold text-slate-900">
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

export function SummaryPage() {
  const orders = useOrders()
  // Read the clock once on mount: a pure render must not depend on the current time.
  const [today] = useState(() => dayKey(new Date().toISOString()))
  const [todayLabel] = useState(() => todayFormatter.format(new Date()))

  const stats = useMemo(() => {
    const todayOrders = orders.filter((order) => dayKey(order.createdAt) === today)
    const revenue = todayOrders.reduce((sum, order) => sum + order.total, 0)
    const itemCount = todayOrders.reduce(
      (sum, order) => sum + order.items.reduce((s, item) => s + item.qty, 0),
      0,
    )
    const average = todayOrders.length > 0 ? Math.round(revenue / todayOrders.length) : 0

    const byPayment = new Map<PaymentMethod, { count: number; total: number }>()
    for (const order of todayOrders) {
      const entry = byPayment.get(order.paymentMethod) ?? { count: 0, total: 0 }
      byPayment.set(order.paymentMethod, {
        count: entry.count + 1,
        total: entry.total + order.total,
      })
    }

    const best = [...todayOrders].sort((a, b) => b.total - a.total)[0]
    return { todayOrders, revenue, itemCount, average, byPayment, best }
  }, [orders, today])

  if (orders.length === 0) {
    return (
      <div>
        <PageHeader title="Ringkasan Penjualan" />
        <EmptyState
          emoji="📊"
          title="Belum ada data penjualan"
          description="Ringkasan hari ini akan muncul setelah ada transaksi pertama."
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
      <PageHeader title="Ringkasan Penjualan" subtitle={todayLabel} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          testId="stat-omzet"
          label="Omzet Hari Ini"
          value={formatIDR(stats.revenue)}
          hint={`${stats.todayOrders.length} transaksi`}
        />
        <StatCard testId="stat-transaksi" label="Transaksi" value={String(stats.todayOrders.length)} hint="Pesanan selesai" />
        <StatCard testId="stat-item" label="Item Terjual" value={String(stats.itemCount)} hint="Total pcs" />
        <StatCard testId="stat-rata" label="Rata-rata" value={formatIDR(stats.average)} hint="Per transaksi" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Penjualan per Metode</h2>
          {stats.byPayment.size === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Belum ada transaksi hari ini.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {[...stats.byPayment.entries()].map(([method, value]) => {
                const share = stats.revenue > 0 ? Math.round((value.total / stats.revenue) * 100) : 0
                return (
                  <li key={method}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-medium text-slate-700">
                        {PAYMENT_LABELS[method]}{' '}
                        <span className="text-xs text-slate-400">({value.count}×)</span>
                      </span>
                      <span className="tabular font-semibold text-slate-900">{formatIDR(value.total)}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${share}%` }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Transaksi Terbesar</h2>
          {stats.best ? (
            <div className="mt-3">
              <p className="tabular text-sm font-bold text-slate-900">{stats.best.orderNumber}</p>
              <p className="tabular mt-1 text-2xl font-bold text-brand-600">{formatIDR(stats.best.total)}</p>
              <ul className="mt-3 space-y-1 text-sm text-slate-600">
                {stats.best.items.map((item) => (
                  <li key={item.productId} className="flex justify-between gap-2">
                    <span className="truncate">
                      {item.name} <span className="tabular text-xs text-slate-400">×{item.qty}</span>
                    </span>
                    <span className="tabular">{formatIDR(item.price * item.qty)}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/riwayat/$orderId"
                params={{ orderId: stats.best.id }}
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"
              >
                Lihat struk
                <IconArrowRight size={14} stroke={2.5} />
              </Link>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">Belum ada transaksi hari ini.</p>
          )}
        </section>
      </div>
    </div>
  )
}
