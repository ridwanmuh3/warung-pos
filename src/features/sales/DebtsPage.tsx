import { useMemo, useState } from 'react'
import { Link, getRouteApi, useNavigate, useRouter } from '@tanstack/react-router'
import { IconNotebook, IconSearch } from '@tabler/icons-react'
import { PAYMENT_LABELS } from '~/content/labels'
import { dayKey, formatDayLabel, formatIDR, formatTime } from '~/lib/format'
import { settleCreditOrderFn } from './sales.functions'
import { isOutstanding } from '~/domain/sales/lifecycle'
import { PageHeader } from '~/components/PageHeader'
import { EmptyState } from '~/components/EmptyState'
import { Badge } from '~/components/ui/Badge'
import { Button } from '~/components/ui/Button'
import { Modal, ModalTitle } from '~/components/ui/Modal'
import type { Order, SettlementPaymentMethod } from '~/types'

const route = getRouteApi('/debts')

export function DebtsPage() {
  const { orders } = route.useLoaderData()
  const { q: rawQ, status } = route.useSearch()
  const q = rawQ ?? ''
  const tab = status ?? 'unsettled'
  const navigate = useNavigate({ from: '/debts' })
  const router = useRouter()

  const [settling, setSettling] = useState<Order | null>(null)
  const [method, setMethod] = useState<SettlementPaymentMethod>('cash')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const outstanding = useMemo(() => orders.filter(isOutstanding), [orders])
  const outstandingTotal = useMemo(
    () => outstanding.reduce((sum, order) => sum + order.total, 0),
    [outstanding],
  )

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const base = orders.filter((order) =>
      tab === 'unsettled' ? isOutstanding(order) : order.settlementStatus === 'settled',
    )
    const filtered = needle
      ? base.filter((order) => {
          const haystack = `${order.orderNumber} ${order.customerName ?? ''} ${order.items
            .map((item) => item.name)
            .join(' ')}`
          return haystack.toLowerCase().includes(needle)
        })
      : base
    return [...filtered].sort((a, b) =>
      tab === 'unsettled' ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt),
    )
  }, [orders, q, tab])

  function closeSettle() {
    setSettling(null)
    setError(null)
  }

  function confirmSettle() {
    if (!settling) return
    setBusy(true)
    setError(null)
    void settleCreditOrderFn({ data: { id: settling.id, method } })
      .then(() => {
        closeSettle()
        void router.invalidate()
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'Gagal menandai lunas')
      })
      .finally(() => setBusy(false))
  }

  return (
    <div>
      <PageHeader
        title="Utang Pelanggan"
        subtitle={`${outstanding.length} utang belum dibayar · total ${formatIDR(outstandingTotal)}`}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex rounded-xl border border-divider bg-surface p-1">
          <button
            type="button"
            onClick={() => navigate({ search: (prev) => ({ ...prev, status: undefined }), replace: true })}
            aria-pressed={tab === 'unsettled'}
            data-testid="debts-tab-unsettled"
            className={`min-h-10 flex-1 rounded-lg px-3 text-xs font-semibold transition-colors sm:flex-none ${
              tab === 'unsettled' ? 'bg-primary text-on-primary' : 'text-body hover:bg-surface-muted'
            }`}
          >
            Belum dibayar
          </button>
          <button
            type="button"
            onClick={() => navigate({ search: (prev) => ({ ...prev, status: 'settled' }), replace: true })}
            aria-pressed={tab === 'settled'}
            data-testid="debts-tab-settled"
            className={`min-h-10 flex-1 rounded-lg px-3 text-xs font-semibold transition-colors sm:flex-none ${
              tab === 'settled' ? 'bg-primary text-on-primary' : 'text-body hover:bg-surface-muted'
            }`}
          >
            Sudah dibayar
          </button>
        </div>

        <div className="relative min-w-0 flex-1">
          <IconSearch
            size={16}
            stroke={2}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={q}
            onChange={(event) =>
              navigate({
                search: (prev) => ({ ...prev, q: event.target.value || undefined }),
                replace: true,
              })
            }
            placeholder="Cari nama pelanggan, nomor pesanan, atau produk…"
            aria-label="Cari utang"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition duration-150 ease-out focus:border-primary focus:shadow-[0_0_0_3px_rgb(22_51_0/0.15)]"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={IconNotebook}
          title={q !== '' ? 'Tidak ada utang cocok' : tab === 'unsettled' ? 'Tidak ada utang' : 'Belum ada pelunasan'}
          description={
            q !== ''
              ? 'Coba kata kunci lain atau hapus pencarian.'
              : tab === 'unsettled'
                ? 'Semua utang pelanggan sudah lunas.'
                : 'Pesanan ngutang yang sudah dibayar akan muncul di sini.'
          }
        />
      ) : (
        <ul className="space-y-2" data-testid="debts-list">
          {visible.map((order) => (
            <li
              key={order.id}
              className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"
            >
              <div className="flex items-start gap-3">
                <Link to="/orders/$orderId" params={{ orderId: order.id }} className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      {order.customerName ?? 'Tanpa nama'}
                    </span>
                    <Badge
                      variant={order.settlementStatus === 'settled' ? 'success' : 'warning'}
                      className="px-1.5 py-0.5 text-[10px]"
                    >
                      {order.settlementStatus === 'settled' ? 'LUNAS' : 'NGUTANG'}
                    </Badge>
                    <span className="tabular text-xs font-semibold text-slate-400">
                      {order.orderNumber}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {order.items.map((item) => `${item.name} ×${item.qty}`).join(', ')}
                  </p>
                  <p className="tabular mt-0.5 text-xs text-slate-400">
                    {formatDayLabel(dayKey(order.createdAt))} · {formatTime(order.createdAt)}
                    {order.status === 'void' ? ' · BATAL' : ''}
                    {order.status === 'refunded' ? ' · REFUND' : ''}
                  </p>
                </Link>
                <div className="shrink-0 text-right">
                  <p className="tabular text-sm font-bold text-slate-900">{formatIDR(order.total)}</p>
                  {order.settlementStatus === 'settled' && order.settledAt && (
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {formatDayLabel(dayKey(order.settledAt))}
                      {order.settledPaymentMethod
                        ? ` · ${PAYMENT_LABELS[order.settledPaymentMethod]}`
                        : ''}
                    </p>
                  )}
                </div>
              </div>

              {isOutstanding(order) && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-3 w-full sm:w-auto"
                  onClick={() => {
                    setMethod('cash')
                    setError(null)
                    setSettling(order)
                  }}
                  data-testid={`settle-${order.id}`}
                >
                  Tandai Sudah Dibayar
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {settling && (
        <Modal onClose={closeSettle}>
          <ModalTitle>Tandai Lunas</ModalTitle>
          <p className="mt-1 text-sm text-slate-600">
            {settling.customerName ?? 'Tanpa nama'} · {settling.orderNumber}
          </p>
          <p className="tabular mt-1 text-lg font-bold text-slate-900">{formatIDR(settling.total)}</p>

          <fieldset className="mt-4">
            <legend className="text-xs font-semibold tracking-wide text-slate-500">
              Metode Pelunasan
            </legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(['cash', 'qris', 'transfer'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMethod(value)}
                  aria-pressed={method === value}
                  data-testid={`settle-method-${value}`}
                  className={`min-h-11 rounded-xl border px-2 py-2 text-xs font-semibold transition-colors ${
                    method === value
                      ? 'border-primary bg-primary-subtle text-on-primary'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {PAYMENT_LABELS[value]}
                </button>
              ))}
            </div>
          </fieldset>

          {method === 'cash' && (
            <p className="mt-2 text-xs text-slate-500">
              Pelunasan tunai menambah kas pada shift yang sedang terbuka.
            </p>
          )}
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={closeSettle}>
              Batal
            </Button>
            <Button size="sm" busy={busy} onClick={confirmSettle} data-testid="settle-confirm">
              Tandai Lunas
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
