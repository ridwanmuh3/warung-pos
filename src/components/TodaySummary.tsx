import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { IconArrowRight, IconChartBar, IconChevronDown, IconShoppingCart } from '@tabler/icons-react'
import { CATEGORY_LABELS, CHANNEL_LABELS, PAYMENT_LABELS } from '../content/labels'
import { formatDayLabel, formatIDR } from '../lib/format'
import {
  buildSalesSummary,
  busiestHour,
  channelBreakdown,
  hourHistogram,
  revenueTrend,
  summarizeCategories,
  topProducts,
} from '../lib/reporting'
import { marginPercent } from '../lib/totals'
import { EmptyState } from './EmptyState'
import { ProductImage } from './ProductImage'
import { ShareBar } from './ui/ShareBar'
import { StatCard } from './ui/StatCard'
import { buttonStyles } from './ui/buttonStyles'
import type { Order, OrderItem, Product, ProductCategory } from '../types'

/** Y-axis ticks for the trend: at 10px, "3,5 jt" beats a seven-digit rupiah. */
const compactIDR = new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 })

/**
 * The owner's "how was today?" answer, in five blocks.
 *
 * The previous screen stacked sixteen equally-weighted panels on top of each
 * other, so nothing led. Here the four numbers that decide the day's course
 * sit first, the payment mix follows, and every deeper cut (category, best
 * sellers, hours, channels, trend) waits behind one disclosure.
 */
export function TodaySummary({ day, orders, products }: { day: string; orders: Order[]; products: Product[] }) {

  const stats = useMemo(() => buildSalesSummary(day, orders), [orders, day])

  const categoryOf = useMemo(
    () => Object.fromEntries(products.map((product) => [product.id, product.category])),
    [products],
  )
  const todayItems = useMemo(() => stats.paid.flatMap((order) => order.items), [stats.paid])

  const patterns = useMemo(
    () => ({
      top: topProducts(stats.paid, 5),
      hours: hourHistogram(stats.paid),
      busiest: busiestHour(stats.paid),
      channels: channelBreakdown(stats.paid),
      trend: revenueTrend(orders, 7, day),
    }),
    [stats.paid, orders, day],
  )

  const paymentRows = useMemo(
    () => [...stats.byPayment].sort((a, b) => b.total - a.total),
    [stats.byPayment],
  )

  const hourPeak = Math.max(...patterns.hours.map((bucket) => bucket.orders), 1)
  const trendPeak = Math.max(...patterns.trend.map((point) => point.revenue), 1)
  const margin = marginPercent(stats.profit, stats.revenue)

  if (stats.paid.length === 0) {
    return (
      <EmptyState
        icon={IconChartBar}
        title="Belum ada penjualan hari ini"
        description="Ringkasan muncul setelah transaksi pertama hari ini."
        action={
          <Link to="/cashier" className={buttonStyles({ size: 'md' })}>
            <IconShoppingCart size={18} />
            Buka Kasir
          </Link>
        }
      />
    )
  }

  return (
    <div>
      <p className="mb-3 text-xs text-mute">{formatDayLabel(day)}</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          testId="stat-omzet"
          label="Omzet Hari Ini"
          value={formatIDR(stats.revenue)}
          hint={
            stats.voided.length > 0
              ? `${stats.paid.length} transaksi · ${stats.voided.length} dibatalkan`
              : `${stats.paid.length} transaksi`
          }
          emphasis
        />
        <StatCard
          testId="stat-laba"
          label="Laba Kotor"
          value={formatIDR(stats.profit)}
          hint={stats.discountTotal > 0 ? `Diskon ${formatIDR(stats.discountTotal)}` : 'Tanpa diskon'}
          tone={stats.profit > 0 ? 'positive' : stats.profit < 0 ? 'danger' : 'neutral'}
        />
        <StatCard
          testId="stat-transaksi"
          label="Transaksi"
          value={String(stats.paid.length)}
          hint={`${stats.itemCount} pcs terjual`}
        />
        <StatCard
          testId="stat-rata"
          label="Rata-rata"
          value={formatIDR(stats.average)}
          hint={`Margin ${margin}%`}
        />
      </div>

      <section className="mt-4 rounded-2xl border border-border-subtle bg-surface p-4 shadow-level1 sm:p-5">
        <h2 className="text-sm font-semibold text-slate-900">Penjualan per Metode</h2>
        <ul className="mt-3 space-y-2.5" data-testid="payment-mix">
          {paymentRows.map((row) => (
            <li key={row.method}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-medium text-slate-700">
                  {PAYMENT_LABELS[row.method] ?? row.method}{' '}
                  <span className="tabular text-xs text-slate-400">({row.count}×)</span>
                </span>
                <span className="tabular shrink-0 font-semibold text-slate-900">
                  {formatIDR(row.total)}
                </span>
              </div>
              <ShareBar share={stats.revenue > 0 ? Math.round((row.total / stats.revenue) * 100) : 0} />
            </li>
          ))}
        </ul>
      </section>

      {stats.receivableTotal > 0 && (
        <Link
          to="/debts"
          className="no-print mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 hover:bg-amber-100"
        >
          <span>
            {stats.receivables.length} transaksi ngutang hari ini ·{' '}
            <span className="tabular">{formatIDR(stats.receivableTotal)}</span>
          </span>
          <span className="text-xs font-medium">Lihat utang</span>
        </Link>
      )}

      <Link
        to="/orders"
        className="no-print mt-4 flex items-center justify-between rounded-2xl border border-border-subtle bg-surface px-4 py-3 text-sm font-semibold text-slate-900 shadow-level1 hover:bg-surface-muted"
      >
        Lihat semua transaksi hari ini
        <IconArrowRight size={16} stroke={2.5} className="text-slate-400" />
      </Link>

      {/* Everything else is real but secondary. One disclosure keeps it
          available without making the owner read it every day. */}
      <details className="group mt-4 rounded-2xl border border-border-subtle bg-surface shadow-level1">
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
          <span className="text-sm font-semibold text-slate-900">Rincian lengkap</span>
          <span className="flex min-w-0 items-center gap-2 text-xs text-mute">
            Kategori · terlaris · jam · tren
            <IconChevronDown size={16} stroke={2} className="shrink-0 transition-transform group-open:rotate-180" />
          </span>
        </summary>

        <div className="space-y-4 border-t border-slate-100 p-4 sm:p-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Rincian per Kategori</h3>
            <CategoryBreakdown items={todayItems} categoryOf={categoryOf} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Produk Terlaris</h3>
              <ul className="mt-2 space-y-2" data-testid="top-products">
                {patterns.top.map((row, index) => (
                  <li key={row.productId} className="flex items-center gap-3 text-sm">
                    <span className="tabular w-4 text-xs font-semibold text-slate-400">{index + 1}</span>
                    <ProductImage imageKey={row.imageKey} alt={row.name} className="size-7" iconSize={14} />
                    <span className="min-w-0 flex-1 truncate font-medium text-slate-700">{row.name}</span>
                    <span className="tabular text-xs text-slate-400">{row.qty} pcs</span>
                    <span className="tabular font-semibold text-slate-900">{formatIDR(row.revenue)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">Jam Ramai</h3>
              <p className="mt-0.5 text-xs text-mute">
                {patterns.busiest
                  ? `Paling ramai sekitar ${String(patterns.busiest.hour).padStart(2, '0')}:00 (${patterns.busiest.orders} transaksi)`
                  : 'Belum ada transaksi.'}
              </p>
              <ul className="mt-2 space-y-1.5" data-testid="hour-histogram">
                {patterns.hours.map((bucket) => (
                  <li key={bucket.hour} className="flex items-center gap-2 text-xs">
                    <span className="tabular w-10 shrink-0 text-slate-500">
                      {String(bucket.hour).padStart(2, '0')}:00
                    </span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-data-track">
                      <span
                        className="block h-full rounded-full bg-data"
                        style={{ width: `${Math.round((bucket.orders / hourPeak) * 100)}%` }}
                      />
                    </span>
                    <span className="tabular w-6 shrink-0 text-right font-semibold text-slate-700">
                      {bucket.orders}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Jenis Pesanan</h3>
              <ul className="mt-2 space-y-2.5" data-testid="channel-breakdown">
                {patterns.channels.map((row) => (
                  <li key={row.channel}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate font-medium text-slate-700">
                        {CHANNEL_LABELS[row.channel] ?? row.channel}{' '}
                        <span className="tabular text-xs text-slate-400">({row.orders}×)</span>
                      </span>
                      <span className="tabular shrink-0 font-semibold text-slate-900">
                        {formatIDR(row.revenue)}
                      </span>
                    </div>
                    <ShareBar share={stats.revenue > 0 ? Math.round((row.revenue / stats.revenue) * 100) : 0} />
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">Tren 7 Hari</h3>
              <ul
                className="mt-2 flex items-end justify-between gap-1.5"
                data-testid="revenue-trend"
                aria-label="Omzet tujuh hari terakhir"
              >
                {patterns.trend.map((point) => {
                  const height =
                    point.revenue > 0 ? Math.max(6, Math.round((point.revenue / trendPeak) * 72)) : 4
                  return (
                    <li key={point.day} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                      <span className="tabular w-full truncate text-center text-[10px] text-slate-500">
                        {point.revenue > 0 ? compactIDR.format(point.revenue) : ''}
                      </span>
                      <span
                        className={`w-full rounded-t ${
                          point.revenue <= 0
                            ? 'bg-data-zero'
                            : point.day === day
                              ? 'bg-data-emphasis'
                              : 'bg-data'
                        }`}
                        style={{ height: `${height}px` }}
                        title={`${formatDayLabel(point.day)}: ${formatIDR(point.revenue)}`}
                      />
                      <span className="tabular w-full text-center text-[10px] text-slate-500">
                        {point.day.split('-')[2]}
                      </span>
                      <span className="sr-only">
                        {formatDayLabel(point.day)}: {formatIDR(point.revenue)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </div>
      </details>
    </div>
  )
}

function CategoryBreakdown({
  items,
  categoryOf,
}: {
  items: OrderItem[]
  categoryOf: Record<string, ProductCategory>
}) {
  const rows = useMemo(() => summarizeCategories(items, categoryOf), [items, categoryOf])

  if (rows.length === 0) {
    return <p className="mt-2 text-sm text-slate-500">Belum ada penjualan hari ini.</p>
  }

  const revenue = rows.reduce((sum, row) => sum + row.revenue, 0)
  const itemsSold = rows.reduce((sum, row) => sum + row.itemsSold, 0)

  return (
    <ul className="mt-2 space-y-2.5" data-testid="category-breakdown">
      {rows.map((row) => (
        <li key={row.category}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium text-slate-700">
              {CATEGORY_LABELS[row.category] ?? row.category}{' '}
              <span className="tabular text-xs text-slate-400">({row.itemsSold} pcs)</span>
            </span>
            <span className="tabular shrink-0 font-semibold text-slate-900">{formatIDR(row.revenue)}</span>
          </div>
          <ShareBar share={revenue > 0 ? Math.round((row.revenue / revenue) * 100) : 0} />
        </li>
      ))}
      <li className="flex items-baseline justify-between border-t border-dashed border-slate-200 pt-2 text-sm">
        <span className="font-semibold text-slate-900">Total</span>
        <span className="tabular font-bold text-brand-600">
          {formatIDR(revenue)} · {itemsSold} pcs
        </span>
      </li>
    </ul>
  )
}
