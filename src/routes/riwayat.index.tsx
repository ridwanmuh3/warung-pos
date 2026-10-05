import { useEffect, useState } from 'react'
import { Link, createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { IconAlertTriangle, IconSearch, IconShoppingCart, IconX } from '@tabler/icons-react'
import { z } from 'zod'
import { CHANNEL_LABELS, PAYMENT_LABELS } from '../data/products'
import { dayKey, formatDayLabel, formatIDR, formatTime } from '../lib/format'
import { listOrders, voidOrder } from '../lib/orders'
import { useOrders } from '../lib/useOrders'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import type { Order, PaymentMethod, SalesChannel } from '../types'

const CHANNELS = Object.keys(CHANNEL_LABELS) as SalesChannel[]

/** Validated search params: malformed values fall back instead of erroring. */
const orderSearchSchema = z.object({
  q: z.string().optional().catch(undefined),
  method: z.enum(['tunai', 'qris', 'transfer']).optional().catch(undefined),
  channel: z.enum(['dine-in', 'bungkus', 'ojol']).optional().catch(undefined),
  day: z.string().optional().catch(undefined),
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
  // Orders live in localStorage, so nothing can be rendered or loaded on the server.
  ssr: false,
  loaderDeps: ({ search }) => ({ q: search.q, method: search.method, channel: search.channel, day: search.day }),
  loader: ({ deps }) => {
    const all = listOrders()
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
  const navigate = useNavigate({ from: Route.fullPath })
  const router = useRouter()

  // Re-run the loader whenever the underlying store changes (new order, void, ...).
  const liveOrders = useOrders()
  useEffect(() => {
    router.invalidate()
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
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
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
              className="inline-flex items-center gap-1 rounded-full bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
            >
              {formatDayLabel(day)}
              <IconX size={12} stroke={2.5} />
            </button>
          )}
        </div>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          emoji="🔍"
          title="Tidak ada pesanan cocok"
          description="Coba ubah kata kunci atau hapus filter yang aktif."
          action={
            hasFilters ? (
              <button
                onClick={() => navigate({ search: {}, replace: true })}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Hapus semua filter
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-6">
          {groupByDay(orders).map(([key, dayOrders]) => {
            const dayTotal = dayOrders.reduce((sum, order) => sum + order.total, 0)
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
                          order.status === 'void' ? 'border-red-200 opacity-75' : 'border-slate-200'
                        }`}
                      >
                        <Link
                          to="/riwayat/$orderId"
                          params={{ orderId: order.id }}
                          className="min-w-0 flex-1"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="tabular text-sm font-bold text-slate-900">{order.orderNumber}</span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                              {PAYMENT_LABELS[order.paymentMethod]}
                            </span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                              {CHANNEL_LABELS[order.channel]}
                            </span>
                            {order.status === 'void' && (
                              <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                                VOID
                              </span>
                            )}
                            {order.discount > 0 && (
                              <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
                                −{formatIDR(order.discount)}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {order.items.map((item) => item.name).join(', ')}
                          </p>
                        </Link>
                        <div className="text-right">
                          <p
                            className={`tabular text-sm font-bold ${
                              order.status === 'void' ? 'text-slate-400 line-through' : 'text-slate-900'
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
                            Void
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
        <div className="no-print fixed inset-0 z-40 grid place-items-center bg-slate-900/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-red-100 text-red-600">
                <IconAlertTriangle size={20} />
              </span>
              <div>
                <h2 className="font-semibold text-slate-900">Void {pendingVoid.orderNumber}?</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Transaksi ditandai batal dan stok produknya dikembalikan. Transaksi tidak dihapus, jadi
                  jejaknya tetap ada.
                </p>
              </div>
            </div>
            <input
              value={voidReason}
              onChange={(event) => setVoidReason(event.target.value)}
              placeholder="Alasan (opsional)"
              aria-label="Alasan void"
              data-testid="void-reason"
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setPendingVoid(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                data-testid="void-confirm"
                onClick={() => {
                  voidOrder(pendingVoid.id, voidReason)
                  setPendingVoid(null)
                  router.invalidate()
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Void Transaksi
              </button>
            </div>
          </div>
        </div>
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
