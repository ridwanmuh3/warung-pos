import { useMemo } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { IconArrowRight, IconDownload, IconPrinter, IconShoppingCart } from '@tabler/icons-react'
import { z } from 'zod'
import { CHANNEL_LABELS, PAYMENT_LABELS } from '../data/products'
import { dayKey, dayKeyToInputValue, formatDayLabel, formatIDR, formatTime } from '../lib/format'
import { buildDailyReport, dailyOrdersCsv, downloadTextFile, zReportText } from '../lib/report'
import { fetchReportingDay } from '../lib/reporting.functions'
import { marginPercent } from '../lib/totals'
import { useOrders, useShifts } from '../lib/useServerData'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'

export const Route = createFileRoute('/laporan')({
  component: ReportPage,
  validateSearch: z.object({ tanggal: z.string().optional().catch(undefined) }),
  // The selected day comes from a server function; the numbers come from
  // browser-local orders, so only the data half is server-rendered.
  ssr: 'data-only',
  loaderDeps: ({ search }) => ({ tanggal: search.tanggal }),
  loader: async ({ deps }) => {
    const today = await fetchReportingDay({ data: { iso: undefined } })
    return { day: deps.tanggal ?? today }
  },
})

function ReportPage() {
  const { day } = Route.useLoaderData()
  const { data: orders } = useOrders()
  const { data: shifts } = useShifts()
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

  return (
    <div>
      <PageHeader
        title="Laporan Harian"
        subtitle={`${dayLabel} · ${report.paid.length} transaksi`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() =>
                downloadTextFile(`warung-pos-${day}.csv`, dailyOrdersCsv(report), 'text/csv')
              }
              disabled={!hasData}
              data-testid="export-csv"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <IconDownload size={16} />
              CSV
            </button>
            <button
              onClick={() => window.print()}
              disabled={!hasData}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <IconPrinter size={16} />
              Cetak Z-Report
            </button>
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
        <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pilih</span>
          <input
            type="date"
            value={dayKeyToInputValue(day)}
            onChange={(event) => {
              const [year, month, dayOfMonth] = event.target.value.split('-').map(Number)
              navigate({
                search: { tanggal: `${year}-${month - 1}-${dayOfMonth}` },
                replace: true,
              })
            }}
            data-testid="day-picker"
            className="bg-transparent text-sm outline-none"
          />
        </label>
      </div>

      {!hasData ? (
        <EmptyState
          emoji="📄"
          title="Tidak ada transaksi pada hari ini"
          description="Pilih tanggal lain atau buat transaksi baru di kasir."
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
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Summary label="Omzet" value={formatIDR(report.revenue)} hint={`${report.paid.length} transaksi`} testId="report-revenue" />
            <Summary label="Laba Kotor" value={formatIDR(report.profit)} hint={`HPP ${formatIDR(report.costTotal)}`} testId="report-profit" />
            <Summary label="Margin" value={`${marginPercent(report.profit, report.revenue)}%`} hint={`Diskon ${formatIDR(report.discountTotal)}`} testId="report-margin" />
            <Summary
              label="Selisih Kas"
              value={`${report.cashVariance > 0 ? '+' : ''}${formatIDR(report.cashVariance)}`}
              hint={report.shifts.length > 0 ? `${report.shifts.length} shift` : 'Kas belum dibuka'}
              testId="report-variance"
            />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Pembayaran</h2>
              <ul className="mt-3 space-y-2" data-testid="report-payments">
                {report.byPayment.map((row) => (
                  <li key={row.method} className="flex justify-between text-sm">
                    <span className="text-slate-600">
                      {PAYMENT_LABELS[row.method]} <span className="text-xs text-slate-400">({row.count}×)</span>
                    </span>
                    <span className="tabular font-semibold text-slate-900">{formatIDR(row.total)}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Jenis Pesanan</h2>
              <ul className="mt-3 space-y-2" data-testid="report-channels">
                {report.byChannel.map((row) => (
                  <li key={row.channel} className="flex justify-between text-sm">
                    <span className="text-slate-600">
                      {CHANNEL_LABELS[row.channel]} <span className="text-xs text-slate-400">({row.count}×)</span>
                    </span>
                    <span className="tabular font-semibold text-slate-900">{formatIDR(row.total)}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {report.shifts.length > 0 && (
            <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
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

          <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Transaksi ({report.orders.length})</h2>
            <ul className="mt-3 divide-y divide-slate-100" data-testid="report-orders">
              {report.orders.map((order) => (
                <li key={order.id} className="flex items-center gap-3 py-2.5">
                  <Link
                    to="/riwayat/$orderId"
                    params={{ orderId: order.id }}
                    className="min-w-0 flex-1"
                  >
                    <span className="tabular text-sm font-semibold text-slate-900">{order.orderNumber}</span>
                    <span className="ml-2 text-xs text-slate-400">{formatTime(order.createdAt)}</span>
                    {order.status === 'void' && (
                      <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                        VOID
                      </span>
                    )}
                    <p className="truncate text-xs text-slate-500">
                      {order.items.map((item) => `${item.name} ×${item.qty}`).join(', ')}
                    </p>
                  </Link>
                  <span
                    className={`tabular text-sm font-semibold ${
                      order.status === 'void' ? 'text-slate-400 line-through' : 'text-slate-900'
                    }`}
                  >
                    {formatIDR(order.total)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Z-Report</h2>
              <button
                onClick={() => downloadTextFile(`z-report-${day}.txt`, zReportText(report, dayLabel))}
                data-testid="download-zreport"
                className="no-print inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
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

function Summary({
  label,
  value,
  hint,
  testId,
}: {
  label: string
  value: string
  hint?: string
  testId: string
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
