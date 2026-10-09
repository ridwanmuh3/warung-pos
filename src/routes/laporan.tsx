import { useMemo } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { IconArrowRight, IconDownload, IconPrinter, IconShoppingCart } from '@tabler/icons-react'
import { z } from 'zod'
import { CHANNEL_LABELS, PAYMENT_LABELS } from '../data/products'
import {
  dayKey,
  dayKeyToInputValue,
  formatDayLabel,
  formatIDR,
  formatTime,
  isDayKey,
  resolveReportingDay,
} from '../lib/format'
import { buildDailyReport, dailyOrdersCsv, downloadTextFile, zReportText } from '../lib/reporting'
import { marginPercent } from '../lib/totals'
import { useOrders, useShifts } from '../lib/useServerData'
import { SkeletonRows, SkeletonStats } from '../components/ui/Skeleton'
import { ShareBar } from '../components/ui/ShareBar'
import { StatCard as Summary, type StatTone } from '../components/ui/StatCard'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'

export const Route = createFileRoute('/laporan')({
  component: ReportPage,
  // A hand-edited `?tanggal=` must fall back to today instead of reaching the
  // day formatters with an Invalid Date.
  validateSearch: z.object({
    tanggal: z.string().refine(isDayKey, 'Tanggal tidak valid').optional().catch(undefined),
  }),
  // The selected day comes from a server function; the numbers come from
  // browser-local orders, so only the data half is server-rendered.
  ssr: 'data-only',
  loaderDeps: ({ search }) => ({ tanggal: search.tanggal }),
  loader: ({ deps }) => {
    return { day: deps.tanggal ?? resolveReportingDay() }
  },
})

function ReportPage() {
  const { day } = Route.useLoaderData()
  const { data: orders, loading: ordersLoading, error: ordersError, reload: reloadOrders } = useOrders()
  const { data: shifts, error: shiftsError, reload: reloadShifts } = useShifts()
  const navigate = useNavigate({ from: Route.fullPath })

  const report = useMemo(() => buildDailyReport(day, orders, shifts), [day, orders, shifts])

  // Every day that has data, so the picker can offer real choices.
  const availableDays = useMemo(() => {
    const days = new Set(orders.map((order) => dayKey(order.createdAt)))
    days.add(day)
    return [...days].sort((a, b) => b.localeCompare(a))
  }, [orders, day])

  const dayLabel = formatDayLabel(day)
  const hasData = report.orders.length > 0

  const margin = marginPercent(report.profit, report.revenue)

  // Both mixes read largest-first; the report aggregates in storage order.
  const paymentRows = useMemo(
    () => [...report.byPayment].sort((a, b) => b.total - a.total),
    [report.byPayment],
  )
  const channelRows = useMemo(
    () => [...report.byChannel].sort((a, b) => b.total - a.total),
    [report.byChannel],
  )
  const notCounted = report.voided.length + report.refunded.length

  // Cash variance tone follows the app's existing convention (ShiftPanel and the
  // reconciliation list): pas = green, lebih (surplus) = amber, kurang = red.
  // Nothing to reconcile — no closed shift, or the cash read failed — stays neutral.
  const closedShiftCount = report.shifts.filter((shift) => shift.closedAt !== undefined).length
  const cashState = report.cashVariance === 0 ? 'pas' : report.cashVariance > 0 ? 'lebih' : 'kurang'
  const cashTone: StatTone =
    shiftsError || closedShiftCount === 0
      ? 'neutral'
      : report.cashVariance === 0
        ? 'positive'
        : report.cashVariance > 0
          ? 'warning'
          : 'danger'

  return (
    <div>
      <PageHeader
        title="Laporan Harian"
        subtitle={`${dayLabel} · ${report.paid.length} transaksi lunas${
          notCounted > 0 ? ` · ${notCounted} tidak masuk omzet` : ''
        }`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                downloadTextFile(`warung-pos-${day}.csv`, dailyOrdersCsv(report), 'text/csv')
              }
              disabled={!hasData}
              data-testid="export-csv"
            >
              <IconDownload size={16} />
              CSV
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.print()}
              disabled={!hasData}
            >
              <IconPrinter size={16} />
              Cetak Laporan Harian
            </Button>
          </div>
        }
      />

      <div className="no-print mb-4 flex flex-wrap gap-2">
        {availableDays.slice(0, 7).map((value) => (
          <button
            key={value}
            onClick={() => navigate({ search: { tanggal: value }, replace: true })}
            data-testid={`day-${value}`}
            className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
              value === day
                ? 'bg-slate-900 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {formatDayLabel(value)}
          </button>
        ))}
        <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-600">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pilih</span>
          <input
            type="date"
            value={dayKeyToInputValue(day)}
            onChange={(event) => {
              // Clearing the picker fires with an empty value; navigating on it
              // would write a day key no formatter can read.
              const value = event.target.value
              if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return
              const [year, month, dayOfMonth] = value.split('-').map(Number)
              navigate({
                search: { tanggal: `${year}-${month - 1}-${dayOfMonth}` },
                replace: true,
              })
            }}
            data-testid="day-picker"
            className="min-h-6 bg-transparent text-sm outline-none"
          />
        </label>
      </div>

      {ordersLoading && orders.length === 0 ? (
        <>
          <SkeletonStats count={4} />
          <SkeletonRows count={5} className="mt-4" />
        </>
      ) : ordersError && orders.length === 0 ? (
        <ErrorState
          title="Gagal memuat laporan"
          description="Data transaksi tidak bisa diambil. Periksa koneksi internet lalu coba lagi."
          onRetry={() => {
            reloadOrders()
            reloadShifts()
          }}
        />
      ) : !hasData ? (
        <EmptyState
          emoji="📄"
          title="Tidak ada transaksi pada hari ini"
          description="Pilih tanggal lain atau buat transaksi baru di kasir."
          action={
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-primary bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition duration-150 ease-out hover:bg-primary-hover"
            >
              <IconShoppingCart size={16} />
              Buka Kasir
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Summary
              label="Omzet"
              value={formatIDR(report.revenue)}
              hint={`${report.paid.length} transaksi lunas`}
              testId="report-revenue"
              emphasis
            />
            <Summary label="Laba Kotor" value={formatIDR(report.profit)} hint={`Modal ${formatIDR(report.costTotal)}`} testId="report-profit" />
            <Summary label="Margin" value={`${margin}%`} hint={`Diskon ${formatIDR(report.discountTotal)}`} tone={margin < 0 ? 'danger' : 'neutral'} testId="report-margin" />
            <Summary
              label="Selisih Kas"
              // A missing cash figure must read as unknown, never as a real Rp0.
              value={shiftsError ? '—' : `${report.cashVariance > 0 ? '+' : ''}${formatIDR(report.cashVariance)}`}
              hint={
                shiftsError
                  ? 'Gagal memuat kas'
                  : closedShiftCount > 0
                    ? `${report.shifts.length} shift · ${cashState}`
                    : report.shifts.length > 0
                      ? `${report.shifts.length} shift · belum tutup`
                      : 'Kas belum dibuka'
              }
              tone={cashTone}
              testId="report-variance"
            />
          </div>

          {shiftsError && (
            <div
              role="alert"
              className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-danger/30 bg-danger/6 px-3 py-2 text-sm text-danger"
            >
              <span>Sebagian data kas gagal dimuat, jadi angka Selisih Kas tidak ditampilkan.</span>
              <button
                type="button"
                onClick={reloadShifts}
                className="font-semibold underline underline-offset-2 hover:text-danger-hover"
              >
                Coba lagi
              </button>
            </div>
          )}

          <div className="mt-4 grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
            <section className="rounded-2xl border border-border-subtle bg-surface p-4 shadow-level1 sm:p-5">
              <h2 className="text-sm font-semibold text-slate-900">Pembayaran</h2>
              {paymentRows.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  Tidak ada transaksi lunas pada hari ini.
                </p>
              ) : (
                <ul className="mt-3 space-y-2.5" data-testid="report-payments">
                  {paymentRows.map((row) => (
                    <li key={row.method}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate text-slate-600">
                          {PAYMENT_LABELS[row.method] ?? row.method}{' '}
                          <span className="tabular text-xs text-slate-400">({row.count}×)</span>
                        </span>
                        <span className="tabular shrink-0 font-semibold text-slate-900">
                          {formatIDR(row.total)}
                        </span>
                      </div>
                      <ShareBar
                        share={
                          report.revenue > 0 ? Math.round((row.total / report.revenue) * 100) : 0
                        }
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-border-subtle bg-surface p-4 shadow-level1 sm:p-5">
              <h2 className="text-sm font-semibold text-slate-900">Jenis Pesanan</h2>
              {channelRows.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  Tidak ada transaksi lunas pada hari ini.
                </p>
              ) : (
                <ul className="mt-3 space-y-2.5" data-testid="report-channels">
                  {channelRows.map((row) => (
                    <li key={row.channel}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate text-slate-600">
                          {CHANNEL_LABELS[row.channel] ?? row.channel}{' '}
                          <span className="tabular text-xs text-slate-400">({row.count}×)</span>
                        </span>
                        <span className="tabular shrink-0 font-semibold text-slate-900">
                          {formatIDR(row.total)}
                        </span>
                      </div>
                      <ShareBar
                        share={
                          report.revenue > 0 ? Math.round((row.total / report.revenue) * 100) : 0
                        }
                      />
                    </li>
                  ))}
                </ul>
              )}
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
              <h2 className="text-sm font-semibold text-slate-900">
                Transaksi ({report.orders.length})
              </h2>
              {/* Void and refunded rows stay in the list; these say up front how
                  many of them are here and why they do not count. */}
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
                  <Link
                    to="/riwayat/$orderId"
                    params={{ orderId: order.id }}
                    className="min-w-0 flex-1"
                  >
                    <span className="tabular text-sm font-semibold text-slate-900">{order.orderNumber}</span>
                    <span className="tabular ml-2 text-xs text-slate-400">{formatTime(order.createdAt)}</span>
                    {order.status === 'void' && (
                      <Badge variant="danger" className="ml-2 px-1.5 py-0.5 text-[10px]">
                        BATAL
                      </Badge>
                    )}
                    {/* A refunded order is not money kept either; without this the
                        row reads as a normal sale. */}
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

          <section className="mt-4 rounded-2xl border border-border-subtle bg-surface p-4 shadow-level1 sm:p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Laporan Harian</h2>
              <button
                onClick={() => downloadTextFile(`z-report-${day}.txt`, zReportText(report, dayLabel))}
                data-testid="download-zreport"
                className="no-print inline-flex min-h-8 items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
              >
                Unduh
                <IconArrowRight size={12} stroke={2.5} />
              </button>
            </div>
            <pre
              data-testid="zreport-text"
              className="mt-3 overflow-x-auto whitespace-pre-wrap font-mono text-xs text-slate-700"
            >
              {zReportText(report, dayLabel)}
            </pre>
          </section>
        </>
      )}
    </div>
  )
}
