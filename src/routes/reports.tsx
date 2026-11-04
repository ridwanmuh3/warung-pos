import { useMemo } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  IconArrowRight,
  IconDownload,
  IconFileText,
  IconPrinter,
  IconShoppingCart,
} from '@tabler/icons-react'
import { z } from 'zod'
import { CHANNEL_LABELS, PAYMENT_LABELS } from '../content/labels'
import { dayKeyOf, resolveReportingDay } from '../domain/time/business-day'
import {
  dayKeyToInputValue,
  formatDayLabel,
  formatIDR,
  formatTime,
  isDayKey,
} from '../lib/format'
import {
  buildSalesSummary,
  dailyOrdersCsv,
  downloadTextFile,
  zReportText,
  type ReportLabels,
} from '../lib/reporting'
import { marginPercent } from '../lib/totals'
import { listOrdersFn } from '~/features/sales/sales.functions'
import { listShiftsFn } from '~/features/shifts/shifts.functions'
import { listProductsFn } from '~/features/catalog/catalog.functions'
import { useTenant } from '../lib/useTenant'
import { ShareBar } from '../components/ui/ShareBar'
import { StatCard as Summary, type StatTone } from '../components/ui/StatCard'
import { Tab, TabList } from '../components/ui/Tabs'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { buttonStyles } from '../components/ui/buttonStyles'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { TodaySummary } from '../components/TodaySummary'

const REPORT_LABELS: ReportLabels = {
  payment: PAYMENT_LABELS,
  channel: CHANNEL_LABELS,
}

export const Route = createFileRoute('/reports')({
  component: ReportPage,
  // A hand-edited `?day=` must fall back to today instead of reaching the
  // day formatters with an Invalid Date.
  validateSearch: z.object({
    tab: z.enum(['today', 'daily']).optional().catch(undefined),
    day: z.string().refine(isDayKey, 'Tanggal tidak valid').optional().catch(undefined),
  }),
  ssr: 'data-only',
  loaderDeps: ({ search }) => ({ day: search.day }),
  loader: async ({ deps }) => {
    const [orders, shifts, products] = await Promise.all([listOrdersFn(), listShiftsFn(), listProductsFn()])
    return { day: deps.day ?? resolveReportingDay(), orders, shifts, products }
  },
})

function ReportPage() {
  const { day, orders, shifts, products } = Route.useLoaderData()
  const { tab: activeTab } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const tenant = useTenant()
  const tab = activeTab ?? 'today'

  return (
    <div>
      <PageHeader
        title="Laporan"
        subtitle={
          tab === 'today'
            ? 'Ringkasan penjualan hari ini'
            : `Rekap harian · ${formatDayLabel(day)}`
        }
      />

      <TabList className="no-print mb-4" aria-label="Jenis laporan">
        <Tab
          active={tab === 'today'}
          onClick={() => navigate({ search: (prev) => ({ ...prev, tab: 'today' }), replace: true })}
          data-testid="tab-today"
          className="flex-1"
        >
          Hari ini
        </Tab>
        <Tab
          active={tab === 'daily'}
          onClick={() => navigate({ search: (prev) => ({ ...prev, tab: 'daily' }), replace: true })}
          data-testid="tab-daily"
          className="flex-1"
        >
          Per hari
        </Tab>
      </TabList>

      {tab === 'today' ? (
        <TodaySummary day={day} orders={orders} products={products} />
      ) : (
        <DailyReport
          day={day}
          orders={orders}
          shifts={shifts}
          isCashier={tenant.context?.role === 'cashier'}
          onPickDay={(value) =>
            navigate({
              search: (prev) => ({ ...prev, day: value }),
              replace: true,
            })
          }
        />
      )}
    </div>
  )
}

function DailyReport({
  day,
  orders,
  shifts,
  isCashier,
  onPickDay,
}: {
  day: string
  orders: Awaited<ReturnType<typeof listOrdersFn>>
  shifts: Awaited<ReturnType<typeof listShiftsFn>>
  isCashier: boolean
  onPickDay: (day: string) => void
}) {
  const report = useMemo(() => buildSalesSummary(day, orders, shifts), [day, orders, shifts])

  // Every day that has data, so the picker can offer real choices.
  const availableDays = useMemo(() => {
    const days = new Set(orders.map((order) => dayKeyOf(order.createdAt)))
    days.add(day)
    return [...days].sort((a, b) => b.localeCompare(a))
  }, [orders, day])

  const dayLabel = formatDayLabel(day)
  const hasData = report.orders.length > 0
  const margin = marginPercent(report.profit, report.revenue)

  const paymentRows = useMemo(() => [...report.byPayment].sort((a, b) => b.total - a.total), [report.byPayment])
  const channelRows = useMemo(() => [...report.byChannel].sort((a, b) => b.total - a.total), [report.byChannel])
  const notCounted = report.voided.length + report.refunded.length
  const closedShiftCount = report.shifts.filter((shift) => shift.closedAt !== undefined).length
  const cashState = report.cashVariance === 0 ? 'pas' : report.cashVariance > 0 ? 'lebih' : 'kurang'
  const cashTone: StatTone =
    closedShiftCount === 0
      ? 'neutral'
      : report.cashVariance === 0
        ? 'positive'
        : report.cashVariance > 0
          ? 'warning'
          : 'danger'

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center gap-2">
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          {availableDays.slice(0, 5).map((value) => (
            <button
              key={value}
              onClick={() => onPickDay(value)}
              data-testid={`day-${value}`}
              aria-pressed={value === day}
              className={`flex min-h-11 items-center rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                value === day
                  ? 'bg-primary text-on-primary'
                  : 'border border-divider bg-surface text-body hover:bg-surface-muted'
              }`}
            >
              {formatDayLabel(value)}
            </button>
          ))}
        </div>
        <label className="inline-flex min-h-11 items-center gap-2 rounded-full border border-divider bg-surface px-3.5 py-2 text-sm text-body">
          <span className="text-xs font-semibold tracking-wide text-slate-500">Tanggal</span>
          <input
            type="date"
            value={dayKeyToInputValue(day)}
            onChange={(event) => {
              // Clearing the picker fires with an empty value; navigating on it
              // would write a day key no formatter can read.
              const value = event.target.value
              if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return
              const [year, month, dayOfMonth] = value.split('-').map(Number)
              onPickDay(`${year}-${month - 1}-${dayOfMonth}`)
            }}
            data-testid="day-picker"
            className="min-h-6 bg-transparent text-sm outline-none"
          />
        </label>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              downloadTextFile(`warung-pos-${day}.csv`, dailyOrdersCsv(report, REPORT_LABELS), 'text/csv')
            }
            disabled={!hasData}
            data-testid="export-csv"
          >
            <IconDownload size={16} />
            CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => window.print()} disabled={!hasData}>
            <IconPrinter size={16} />
            Cetak
          </Button>
        </div>
      </div>

      {isCashier && (
        <p className="mb-4 rounded-lg border border-divider bg-surface-muted px-3 py-2 text-xs text-slate-600">
          Sebagai kasir, Anda hanya melihat transaksi hari ini. Pemilik dan manajer dapat membuka
          tanggal lain.
        </p>
      )}

      {!hasData ? (
        <EmptyState
          icon={IconFileText}
          title="Tidak ada transaksi pada hari ini"
          description="Pilih tanggal lain atau buat transaksi baru di kasir."
          action={
            <Link to="/cashier" className={buttonStyles({ size: 'md' })}>
              <IconShoppingCart size={18} />
              Buka Kasir
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Summary
              label="Omzet"
              value={formatIDR(report.revenue)}
              hint={`${report.paid.length} transaksi lunas`}
              testId="report-revenue"
              emphasis
            />
            <Summary
              label="Laba Kotor"
              value={formatIDR(report.profit)}
              hint={`Modal ${formatIDR(report.costTotal)}`}
              testId="report-profit"
            />
            <Summary
              label="Margin"
              value={`${margin}%`}
              hint={`Diskon ${formatIDR(report.discountTotal)}`}
              tone={margin < 0 ? 'danger' : 'neutral'}
              testId="report-margin"
            />
            <Summary
              label="Selisih Kas"
              // A missing cash figure must read as unknown, never as a real Rp0.
              value={`${report.cashVariance > 0 ? '+' : ''}${formatIDR(report.cashVariance)}`}
              hint={
                closedShiftCount > 0
                    ? `${report.shifts.length} shift · ${cashState}`
                    : report.shifts.length > 0
                      ? `${report.shifts.length} shift · belum tutup`
                      : 'Kas belum dibuka'
              }
              tone={cashTone}
              testId="report-variance"
            />
          </div>

          {report.receivableTotal > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <span>
                {report.receivables.length} transaksi ngutang hari ini belum dibayar ·{' '}
                <span className="tabular font-semibold">{formatIDR(report.receivableTotal)}</span>
              </span>
              <Link to="/debts" className="font-semibold underline underline-offset-2 hover:text-amber-950">
                Lihat Utang
              </Link>
            </div>
          )}

          <div className="mt-4 grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
            <section className="rounded-2xl border border-border-subtle bg-surface p-4 shadow-level1 sm:p-5">
              <h2 className="text-sm font-semibold text-slate-900">Pembayaran</h2>
              <ul className="mt-3 space-y-2.5" data-testid="report-payments">
                {paymentRows.map((row) => (
                  <li key={row.method}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate text-slate-600">
                        {PAYMENT_LABELS[row.method] ?? row.method}{' '}
                        <span className="tabular text-xs text-slate-400">({row.count}×)</span>
                      </span>
                      <span className="tabular shrink-0 font-semibold text-slate-900">{formatIDR(row.total)}</span>
                    </div>
                    <ShareBar share={report.revenue > 0 ? Math.round((row.total / report.revenue) * 100) : 0} />
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-border-subtle bg-surface p-4 shadow-level1 sm:p-5">
              <h2 className="text-sm font-semibold text-slate-900">Jenis Pesanan</h2>
              <ul className="mt-3 space-y-2.5" data-testid="report-channels">
                {channelRows.map((row) => (
                  <li key={row.channel}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate text-slate-600">
                        {CHANNEL_LABELS[row.channel] ?? row.channel}{' '}
                        <span className="tabular text-xs text-slate-400">({row.count}×)</span>
                      </span>
                      <span className="tabular shrink-0 font-semibold text-slate-900">{formatIDR(row.total)}</span>
                    </div>
                    <ShareBar share={report.revenue > 0 ? Math.round((row.total / report.revenue) * 100) : 0} />
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {report.shifts.length > 0 && (
            <section className="mt-4 rounded-2xl border border-border-subtle bg-surface p-4 shadow-level1 sm:p-5">
              <h2 className="text-sm font-semibold text-slate-900">Rekonsiliasi Kas</h2>
              <ul className="mt-3 space-y-2" data-testid="report-shifts">
                {report.shifts.map((shift) => (
                  <li key={shift.id} className="flex flex-wrap justify-between gap-2 text-sm">
                    <span className="text-slate-600">
                      {formatTime(shift.openedAt)} → {shift.closedAt ? formatTime(shift.closedAt) : 'belum tutup'}
                    </span>
                    <span className="tabular text-slate-700">
                      seharusnya {formatIDR(shift.expectedCash ?? 0)} · dihitung {formatIDR(shift.closingCash ?? 0)}
                    </span>
                    <span
                      className={`tabular font-semibold ${
                        (shift.variance ?? 0) === 0
                          ? 'text-brand-700'
                          : (shift.variance ?? 0) > 0
                            ? 'text-amber-700'
                            : 'text-red-600'
                      }`}
                    >
                      {(shift.variance ?? 0) > 0 ? '+' : ''}
                      {formatIDR(shift.variance ?? 0)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-4 rounded-2xl border border-border-subtle bg-surface p-4 shadow-level1 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900">Transaksi ({report.orders.length})</h2>
              {report.voided.length > 0 && (
                <Badge variant="danger" className="px-1.5 py-0.5 text-[10px]">
                  {report.voided.length} batal
                </Badge>
              )}
              {report.refunded.length > 0 && (
                <Badge variant="warning" className="px-1.5 py-0.5 text-[10px]">
                  {report.refunded.length} refund
                </Badge>
              )}
            </div>
            <ul className="mt-3 divide-y divide-slate-100" data-testid="report-orders">
              {report.orders.map((order) => (
                <li key={order.id} className="flex items-center gap-3 py-2.5">
                  <Link to="/orders/$orderId" params={{ orderId: order.id }} className="min-w-0 flex-1">
                    <span className="tabular text-sm font-semibold text-slate-900">{order.orderNumber}</span>
                    <span className="tabular ml-2 text-xs text-slate-400">{formatTime(order.createdAt)}</span>
                    {order.status === 'void' && (
                      <Badge variant="danger" className="ml-2 px-1.5 py-0.5 text-[10px]">
                        BATAL
                      </Badge>
                    )}
                    {order.status === 'refunded' && (
                      <Badge variant="warning" className="ml-2 px-1.5 py-0.5 text-[10px]">
                        REFUND
                      </Badge>
                    )}
                    <p className="truncate text-xs text-slate-500">
                      {order.items.map((item) => `${item.name} ×${item.qty}`).join(', ')}
                    </p>
                  </Link>
                  <span
                    className={`tabular text-sm font-semibold ${
                      order.status !== 'paid' ? 'text-slate-400 line-through' : 'text-slate-900'
                    }`}
                  >
                    {formatIDR(order.total)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-surface p-4 shadow-level1 sm:p-5">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Z-Report</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Rekap tutup toko: omzet, kas, dan {notCounted} transaksi yang tidak masuk omzet.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="no-print"
              onClick={() =>
                downloadTextFile(`z-report-${day}.txt`, zReportText(report, dayLabel, REPORT_LABELS))
              }
              data-testid="download-zreport"
            >
              Unduh .txt
              <IconArrowRight size={16} stroke={2.5} />
            </Button>
          </section>
        </>
      )}
    </div>
  )
}
