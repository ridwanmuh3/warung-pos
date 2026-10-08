import { useEffect, useState } from 'react'
import { Link, createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { IconAlertTriangle, IconSearch, IconShoppingCart, IconX } from '@tabler/icons-react'
import { z } from 'zod'
import { CHANNEL_LABELS, PAYMENT_LABELS } from '../data/products'
import { dayKey, formatDayLabel, formatIDR, formatTime, isDayKey } from '../lib/format'
import { listOrdersFn, refundOrderFn, voidOrderFn } from '../lib/data.functions'
import { useOrders } from '../lib/useServerData'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { SkeletonRows } from '../components/ui/Skeleton'
import { Button } from '../components/ui/Button'
import { Modal, ModalTitle } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import type { Order, PaymentMethod, SalesChannel } from '../types'

const CHANNELS = Object.keys(CHANNEL_LABELS) as SalesChannel[]

/** Validated search params: malformed values fall back instead of erroring. */
const orderSearchSchema = z.object({
  q: z.string().optional().catch(undefined),
  method: z.enum(['tunai', 'qris', 'transfer']).optional().catch(undefined),
  channel: z.enum(['dine-in', 'bungkus', 'ojol']).optional().catch(undefined),
  // Same guard as the report screens: a malformed `?day=` falls back to "all
  // days" instead of throwing inside the day formatter.
  day: z.string().refine(isDayKey, 'Tanggal tidak valid').optional().catch(undefined),
})

const PAYMENT_METHODS = Object.keys(PAYMENT_LABELS) as PaymentMethod[]

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

export const Route = createFileRoute('/riwayat/')({
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
        const haystack = `${order.orderNumber} ${order.items.map((item) => item.name).join(' ')}`
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

function OrdersPage() {
  const { orders, storedCount, netTotal } = Route.useLoaderData()
  const { q: rawQ, method, channel, day } = Route.useSearch()
  const q = rawQ ?? ''
  const [pendingVoid, setPendingVoid] = useState<Order | null>(null)
  const [voidReason, setVoidReason] = useState('')
  /** Server told us the shift is closed: offer a refund instead of a void (ADR-0006). */
  const [needsRefund, setNeedsRefund] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState(false)
  const navigate = useNavigate({ from: Route.fullPath })

  // Re-run the loader whenever the order set changes (new order, void, ...).
  const { data: liveOrders, loading: liveLoading } = useOrders()
  const router = useRouter()
  useEffect(() => {
    void router.invalidate()
  }, [liveOrders, router])

  const hasFilters = q !== '' || method !== undefined || channel !== undefined || day !== undefined

  function updateSearch(patch: Partial<z.infer<typeof orderSearchSchema>>) {
    navigate({
      search: (prev) => ({ ...prev, ...patch }),
      replace: true,
    })
  }

  if (storedCount === 0) {
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
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-primary bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition duration-150 ease-out hover:bg-primary-hover"
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
        subtitle={`${orders.length} dari ${storedCount} transaksi · bersih ${formatIDR(netTotal)}`}
      />

      <div className="mb-4 space-y-2">
        <div className="relative">
          <IconSearch
            size={16}
            stroke={2}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={q}
            onChange={(event) => updateSearch({ q: event.target.value })}
            placeholder="Cari nomor pesanan atau nama produk…"
            aria-label="Cari pesanan"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition duration-150 ease-out focus:border-primary focus:shadow-[0_0_0_3px_rgb(22_51_0/0.15)]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => updateSearch({ method: undefined })}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              method === undefined
                ? 'bg-slate-900 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            Semua metode
          </button>
          {PAYMENT_METHODS.map((value) => (
            <button
              key={value}
              onClick={() => updateSearch({ method: method === value ? undefined : value })}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                method === value
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {PAYMENT_LABELS[value]}
            </button>
          ))}
          {CHANNELS.map((value) => (
            <button
              key={value}
              onClick={() => updateSearch({ channel: channel === value ? undefined : value })}
              data-testid={`filter-channel-${value}`}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                channel === value
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {CHANNEL_LABELS[value]}
            </button>
          ))}
          {day && (
            <button
              onClick={() => updateSearch({ day: undefined })}
              className="inline-flex items-center gap-1 rounded-full border-2 border-primary bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary transition duration-150 ease-out hover:bg-primary-hover"
            >
              {formatDayLabel(day)}
              <IconX size={12} stroke={2.5} />
            </button>
          )}
        </div>
      </div>

      {orders.length === 0 && liveLoading ? (
        <SkeletonRows count={6} />
      ) : orders.length === 0 ? (
        <EmptyState
          emoji="🔍"
          title="Tidak ada pesanan cocok"
          description="Coba ubah kata kunci atau hapus filter yang aktif."
          action={
            hasFilters ? (
              <button
                onClick={() => navigate({ search: {}, replace: true })}
                className="rounded-full border-2 border-primary bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition duration-150 ease-out hover:bg-primary-hover"
              >
                Hapus semua filter
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-6">
          {groupByDay(orders).map(([key, dayOrders]) => {
            // Day totals count money actually kept: paid orders only.
            const dayTotal = dayOrders
              .filter((order) => order.status === 'paid')
              .reduce((sum, order) => sum + order.total, 0)
            return (
              <section key={key}>
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <button
                    onClick={() => updateSearch({ day: day === key ? undefined : key })}
                    className={`text-sm font-semibold transition-colors ${
                      day === key ? 'text-brand-700 underline' : 'text-slate-700 hover:text-brand-700'
                    }`}
                    title="Filter hanya hari ini"
                  >
                    {formatDayLabel(key)}
                  </button>
                  <span className="tabular text-sm font-semibold text-brand-600">{formatIDR(dayTotal)}</span>
                </div>
                <ul className="space-y-2">
                  {dayOrders.map((order) => (
                    <li key={order.id}>
                      <div
                        className={`flex items-center gap-3 rounded-xl border bg-white p-3 shadow-sm ${
                          order.status !== 'paid' ? 'border-red-200 opacity-75' : 'border-slate-200'
                        }`}
                      >
                        <Link
                          to="/riwayat/$orderId"
                          params={{ orderId: order.id }}
                          className="min-w-0 flex-1"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="tabular text-sm font-bold text-slate-900">{order.orderNumber}</span>
                            <Badge variant="dark" className="px-1.5 py-0.5 text-[10px] font-medium">
                              {PAYMENT_LABELS[order.paymentMethod]}
                            </Badge>
                            <Badge variant="primary" className="px-1.5 py-0.5 text-[10px] font-medium">
                              {CHANNEL_LABELS[order.channel]}
                            </Badge>
                            {order.status === 'void' && (
                              <Badge variant="danger" className="px-1.5 py-0.5 text-[10px]">
                                BATAL
                              </Badge>
                            )}
                            {order.status === 'refunded' && (
                              <Badge variant="warning" className="px-1.5 py-0.5 text-[10px]">
                                REFUND
                              </Badge>
                            )}
                            {order.discount > 0 && (
                              <Badge variant="danger" className="px-1.5 py-0.5 text-[10px] font-medium">
                                −{formatIDR(order.discount)}
                              </Badge>
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {order.items.map((item) => item.name).join(', ')}
                          </p>
                        </Link>
                        <div className="text-right">
                          <p
                            className={`tabular text-sm font-bold ${
                              order.status !== 'paid' ? 'text-slate-400 line-through' : 'text-slate-900'
                            }`}
                          >
                            {formatIDR(order.total)}
                          </p>
                          <p className="tabular text-xs text-slate-400">{formatTime(order.createdAt)}</p>
                        </div>
                        {order.status === 'paid' && (
                          <button
                            onClick={() => {
                              setPendingVoid(order)
                              setVoidReason('')
                            }}
                            data-testid={`void-${order.orderNumber}`}
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                          >
                            Batalkan
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}

      {pendingVoid && (
        <Modal
          onClose={() => {
            setPendingVoid(null)
            setNeedsRefund(false)
            setActionError(null)
          }}
        >
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-red-100 text-red-600">
              <IconAlertTriangle size={20} />
            </span>
            <div>
              <ModalTitle>
                {needsRefund ? 'Kembalikan dana' : 'Batalkan'} {pendingVoid.orderNumber}?
              </ModalTitle>
              <p className="mt-1 text-sm text-slate-600">
                {needsRefund
                  ? 'Shift transaksi ini sudah ditutup, jadi uang dikembalikan dari laci kas yang sedang buka dan tercatat sebagai refund. Stok produk dikembalikan.'
                  : 'Transaksi ditandai batal dan stok produknya dikembalikan. Transaksi tidak dihapus, jadi jejaknya tetap ada.'}
              </p>
            </div>
          </div>
          <input
            value={voidReason}
            onChange={(event) => setVoidReason(event.target.value)}
            placeholder="Alasan (opsional)"
            aria-label="Alasan pembatalan"
            data-testid="void-reason"
            className="mt-3 w-full rounded-sm border-2 border-border px-3 py-2 text-sm outline-none transition duration-150 ease-out focus:border-primary focus:shadow-[0_0_0_3px_rgb(22_51_0/0.15)]"
          />
          {actionError && <p className="mt-2 text-xs text-red-600">{actionError}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setPendingVoid(null)
                setNeedsRefund(false)
                setActionError(null)
              }}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              size="sm"
              busy={actionBusy}
              data-testid="void-confirm"
              onClick={() => {
                const action = needsRefund ? refundOrderFn : voidOrderFn
                setActionBusy(true)
                setActionError(null)
                void action({ data: { id: pendingVoid.id, reason: voidReason } })
                  .then(() => {
                    setPendingVoid(null)
                    setNeedsRefund(false)
                    void router.invalidate()
                  })
                  .catch((cause: unknown) => {
                    const message =
                      cause instanceof Error ? cause.message : 'Gagal membatalkan transaksi'
                    // A closed shift turns a void into a refund (ADR-0006).
                    if (!needsRefund && message.toLowerCase().includes('refund')) {
                      setNeedsRefund(true)
                    }
                    setActionError(message)
                  })
                  .finally(() => setActionBusy(false))
              }}
            >
              {needsRefund ? 'Kembalikan Dana' : 'Batalkan Transaksi'}
            </Button>
          </div>
        </Modal>
      )}

      {hasFilters && orders.length > 0 && (
        <button
          onClick={() => navigate({ search: {}, replace: true })}
          className="mx-auto mt-4 block text-xs font-medium text-slate-500 hover:text-brand-700"
        >
          Hapus semua filter
        </button>
      )}
    </div>
  )
}
