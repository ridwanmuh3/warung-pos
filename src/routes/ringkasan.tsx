import { useEffect, useMemo, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { IconArrowRight, IconShoppingCart } from '@tabler/icons-react'
import { z } from 'zod'
import { CATEGORY_LABELS, CHANNEL_LABELS, PAYMENT_LABELS } from '../data/products'
import { dayKey, formatDayLabel, formatIDR } from '../lib/format'
import { busiestHour, channelBreakdown, hourHistogram, revenueTrend, topProducts } from '../lib/analytics'
import { fetchReportingDay, streamCategoryBreakdown } from '../lib/reporting.functions'
import { marginPercent } from '../lib/totals'
import { useOrders, useProducts } from '../lib/useServerData'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { ShiftPanel } from '../components/ShiftPanel'
import type { CategoryReportRow, OrderItem, PaymentMethod, ProductCategory } from '../types'

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

export const Route = createFileRoute('/ringkasan')({
  component: SummaryPage,
  validateSearch: z.object({ day: z.string().optional().catch(undefined) }),
  // Loader runs on the server and returns the authoritative reporting day; the
  // per-route component is client-only because order data lives in localStorage.
  ssr: 'data-only',
  loaderDeps: ({ search }) => ({ day: search.day }),
  loader: async ({ deps }) => {
    const reportingDay = await fetchReportingDay({ data: { iso: undefined } })
    return { reportingDay: deps.day ?? reportingDay }
  },
})

function SummaryPage() {
  const { reportingDay } = Route.useLoaderData()
  const { data: orders } = useOrders()
  const { data: products } = useProducts()

  const today = reportingDay
  const todayLabel = formatDayLabel(reportingDay)

  const stats = useMemo(() => {
    // Void orders are excluded: their money was never kept and their stock returned.
    const todayOrders = orders.filter(
      (order) => order.status === 'paid' && dayKey(order.createdAt) === today,
    )
    const voidCount = orders.filter(
      (order) => order.status === 'void' && dayKey(order.createdAt) === today,
    ).length
    const revenue = todayOrders.reduce((sum, order) => sum + order.total, 0)
    const itemCount = todayOrders.reduce(
      (sum, order) => sum + order.items.reduce((s, item) => s + item.qty, 0),
      0,
    )
    const average = todayOrders.length > 0 ? Math.round(revenue / todayOrders.length) : 0

    const byPayment: Partial<Record<PaymentMethod, { count: number; total: number }>> = {}
    for (const order of todayOrders) {
      const entry = byPayment[order.paymentMethod] ?? { count: 0, total: 0 }
      byPayment[order.paymentMethod] = { count: entry.count + 1, total: entry.total + order.total }
    }

    const best = [...todayOrders].sort((a, b) => b.total - a.total)[0]
    const costTotal = todayOrders.reduce((sum, order) => sum + order.costTotal, 0)
    const profit = todayOrders.reduce((sum, order) => sum + order.profit, 0)
    const discountTotal = todayOrders.reduce((sum, order) => sum + order.discount, 0)
    return {
      todayOrders,
      voidCount,
      revenue,
      itemCount,
      average,
      byPayment,
      best,
      costTotal,
      profit,
      discountTotal,
    }
  }, [orders, today])

  const categoryOf = useMemo(
    () => Object.fromEntries(products.map((product) => [product.id, product.category])),
    [products],
  )
  const todayItems = useMemo(
    () => stats.todayOrders.flatMap((order) => order.items),
    [stats.todayOrders],
  )

  // Sales patterns: best sellers, busiest hour, channel split, 7-day trend.
  const patterns = useMemo(
    () => ({
      top: topProducts(stats.todayOrders, 5),
      hours: hourHistogram(stats.todayOrders),
      busiest: busiestHour(stats.todayOrders),
      channels: channelBreakdown(stats.todayOrders),
      trend: revenueTrend(orders, 7, reportingDay),
    }),
    [stats.todayOrders, orders, reportingDay],
  )

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
        {/* The drawer must be openable before the first sale, so the panel is not
            hidden behind the empty state. */}
        <div className="mt-4">
          <ShiftPanel />
        </div>
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
          hint={
            stats.voidCount > 0
              ? `${stats.todayOrders.length} transaksi · ${stats.voidCount} void`
              : `${stats.todayOrders.length} transaksi`
          }
        />
        <StatCard testId="stat-transaksi" label="Transaksi" value={String(stats.todayOrders.length)} hint="Pesanan selesai" />
        <StatCard testId="stat-item" label="Item Terjual" value={String(stats.itemCount)} hint="Total pcs" />
        <StatCard testId="stat-rata" label="Rata-rata" value={formatIDR(stats.average)} hint="Per transaksi" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard testId="stat-laba" label="Laba Kotor" value={formatIDR(stats.profit)} hint="Omzet − HPP" />
        <StatCard testId="stat-hpp" label="HPP Terjual" value={formatIDR(stats.costTotal)} hint="Modal barang" />
        <StatCard
          testId="stat-margin"
          label="Margin"
          value={`${marginPercent(stats.profit, stats.revenue)}%`}
          hint={
            stats.discountTotal > 0
              ? `Diskon ${formatIDR(stats.discountTotal)}`
              : 'Tanpa diskon'
          }
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Penjualan per Metode</h2>
          {Object.keys(stats.byPayment).length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Belum ada transaksi hari ini.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {Object.entries(stats.byPayment).map(([method, value]) => {
                if (!value) return null
                const share = stats.revenue > 0 ? Math.round((value.total / stats.revenue) * 100) : 0
                return (
                  <li key={method}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-medium text-slate-700">
                        {PAYMENT_LABELS[method as PaymentMethod]}{' '}
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

      <div className="mt-4">
        <ShiftPanel />
      </div>

      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Rincian per Kategori</h2>
        <p className="mt-0.5 text-xs text-slate-400">
          Dihitung di server dan dialirkan baris per baris.
        </p>
        <CategoryBreakdown
          key={`${reportingDay}:${todayItems.map((item) => `${item.productId}x${item.qty}`).join(',')}`}
          items={todayItems}
          categoryOf={categoryOf}
        />
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Produk Terlaris</h2>
          {patterns.top.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Belum ada penjualan hari ini.</p>
          ) : (
            <ul className="mt-3 space-y-2" data-testid="top-products">
              {patterns.top.map((row, index) => (
                <li key={row.productId} className="flex items-center gap-3 text-sm">
                  <span className="tabular w-4 text-xs font-semibold text-slate-400">{index + 1}</span>
                  <span aria-hidden>{row.emoji}</span>
                  <span className="min-w-0 flex-1 truncate font-medium text-slate-700">{row.name}</span>
                  <span className="tabular text-xs text-slate-400">{row.qty} pcs</span>
                  <span className="tabular font-semibold text-slate-900">{formatIDR(row.revenue)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Pola Jam</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            {patterns.busiest
              ? `Paling ramai sekitar pukul ${String(patterns.busiest.hour).padStart(2, '0')}:00 (${patterns.busiest.orders} transaksi)`
              : 'Belum ada transaksi hari ini.'}
          </p>
          {patterns.hours.length > 0 && (
            <ul className="mt-3 space-y-1.5" data-testid="hour-histogram">
              {patterns.hours.map((bucket) => {
                const peak = Math.max(...patterns.hours.map((b) => b.orders))
                const width = peak > 0 ? Math.round((bucket.orders / peak) * 100) : 0
                return (
                  <li key={bucket.hour} className="flex items-center gap-2 text-xs">
                    <span className="tabular w-10 shrink-0 text-slate-500">
                      {String(bucket.hour).padStart(2, '0')}:00
                    </span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <span className="block h-full rounded-full bg-brand-500" style={{ width: `${width}%` }} />
                    </span>
                    <span className="tabular w-6 shrink-0 text-right font-semibold text-slate-700">
                      {bucket.orders}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Jenis Pesanan</h2>
          {patterns.channels.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Belum ada transaksi hari ini.</p>
          ) : (
            <ul className="mt-3 space-y-2" data-testid="channel-breakdown">
              {patterns.channels.map((row) => {
                const share = stats.revenue > 0 ? Math.round((row.revenue / stats.revenue) * 100) : 0
                return (
                  <li key={row.channel}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-medium text-slate-700">
                        {CHANNEL_LABELS[row.channel]}{' '}
                        <span className="text-xs text-slate-400">({row.orders}×)</span>
                      </span>
                      <span className="tabular font-semibold text-slate-900">{formatIDR(row.revenue)}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-slate-900" style={{ width: `${share}%` }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Tren 7 Hari</h2>
          <ul className="mt-3 flex items-end justify-between gap-1.5" data-testid="revenue-trend">
            {patterns.trend.map((point) => {
              const peak = Math.max(...patterns.trend.map((p) => p.revenue), 1)
              const height = Math.max(4, Math.round((point.revenue / peak) * 72))
              return (
                <li key={point.day} className="flex flex-1 flex-col items-center gap-1">
                  <span className="tabular text-[10px] text-slate-400">
                    {point.revenue > 0 ? Math.round(point.revenue / 1000) : ''}
                  </span>
                  <span
                    className={`w-full rounded-t ${point.day === reportingDay ? 'bg-brand-600' : 'bg-brand-300'}`}
                    style={{ height: `${height}px` }}
                    title={`${formatDayLabel(point.day)}: ${formatIDR(point.revenue)}`}
                  />
                  <span className="tabular text-[10px] text-slate-400">
                    {point.day.split('-')[2]}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </div>
  )
}

function BreakdownSkeleton() {
  return <p className="mt-3 text-sm text-slate-500">Menghitung rincian kategori…</p>
}

/**
 * Consumes the streaming server function progressively: each category row is
 * rendered as soon as its chunk arrives instead of waiting for the whole report.
 */
function CategoryBreakdown({
  items,
  categoryOf,
}: {
  items: OrderItem[]
  categoryOf: Record<string, ProductCategory>
}) {
  const [rows, setRows] = useState<CategoryReportRow[]>([])
  const [totals, setTotals] = useState<{ revenue: number; itemsSold: number } | null>(null)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const stream = await streamCategoryBreakdown({ data: { items, categoryOf } })
      for await (const chunk of stream) {
        if (cancelled) return
        if (chunk.kind === 'row') setRows((prev) => [...prev, chunk.row])
        else setTotals({ revenue: chunk.revenue, itemsSold: chunk.itemsSold })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [items, categoryOf])

  if (rows.length === 0 && totals === null) {
    return <BreakdownSkeleton />
  }

  return (
    <ul className="mt-3 space-y-2" data-testid="category-breakdown">
      {rows.map((row) => (
        <li key={row.category} className="flex items-baseline justify-between text-sm">
          <span className="font-medium text-slate-700">
            {CATEGORY_LABELS[row.category]}{' '}
            <span className="text-xs text-slate-400">({row.itemsSold} pcs)</span>
          </span>
          <span className="tabular font-semibold text-slate-900">{formatIDR(row.revenue)}</span>
        </li>
      ))}
      {totals && (
        <li className="flex items-baseline justify-between border-t border-dashed border-slate-200 pt-2 text-sm">
          <span className="font-semibold text-slate-900">Total</span>
          <span className="tabular font-bold text-brand-600">
            {formatIDR(totals.revenue)} · {totals.itemsSold} pcs
          </span>
        </li>
      )}
    </ul>
  )
}
