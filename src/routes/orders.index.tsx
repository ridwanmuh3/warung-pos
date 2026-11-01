import { useEffect } from 'react'
import { Link, createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { IconReceipt, IconSearch, IconShoppingCart, IconX } from '@tabler/icons-react'
import { z } from 'zod'
import { CHANNEL_LABELS, PAYMENT_LABELS } from '../data/products'
import { dayKey, formatDayLabel, formatIDR, formatTime, isDayKey } from '../lib/format'
import { listOrdersFn } from '../lib/data.functions'
import { useOrders } from '../lib/useServerData'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { SkeletonRows } from '../components/ui/Skeleton'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { buttonStyles } from '../components/ui/buttonStyles'
import type { Order, PaymentMethod, SalesChannel } from '../types'

const CHANNELS = Object.keys(CHANNEL_LABELS) as SalesChannel[]

/** Validated search params: malformed values fall back instead of erroring. */
const orderSearchSchema = z.object({
  q: z.string().optional().catch(undefined),
  method: z.enum(['cash', 'qris', 'transfer']).optional().catch(undefined),
  channel: z.enum(['dine-in', 'takeaway', 'delivery']).optional().catch(undefined),
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

export const Route = createFileRoute('/orders/')({
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
          icon={IconReceipt}
          title="Belum ada transaksi"
          description="Pesanan yang sudah dibayar akan muncul di sini."
          action={
            <Link to="/cashier" className={buttonStyles({ size: 'md' })}>
              <IconShoppingCart size={18} />
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
        subtitle={`${orders.length} dari ${storedCount} transaksi · omzet lunas ${formatIDR(netTotal)}`}
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

        {/* Two labelled rows instead of one undifferentiated chain: "Tunai" is a
            payment method and "Bungkus" is a channel, and mixing them made the
            filter unreadable. */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="shrink-0 text-[10px] font-semibold tracking-wide text-mute">Metode</span>
          <button
            onClick={() => updateSearch({ method: undefined })}
            aria-pressed={method === undefined}
            className={`flex min-h-11 shrink-0 items-center rounded-full px-3.5 text-xs font-medium transition-colors ${
              method === undefined
                ? 'bg-primary text-on-primary'
                : 'border border-divider bg-surface text-body hover:bg-surface-muted'
            }`}
          >
            Semua
          </button>
          {PAYMENT_METHODS.map((value) => (
            <button
              key={value}
              onClick={() => updateSearch({ method: method === value ? undefined : value })}
              aria-pressed={method === value}
              className={`flex min-h-11 shrink-0 items-center rounded-full px-3.5 text-xs font-medium transition-colors ${
                method === value
                  ? 'bg-primary text-on-primary'
                  : 'border border-divider bg-surface text-body hover:bg-surface-muted'
              }`}
            >
              {PAYMENT_LABELS[value]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="shrink-0 text-[10px] font-semibold tracking-wide text-mute">Jenis</span>
          <button
            onClick={() => updateSearch({ channel: undefined })}
            aria-pressed={channel === undefined}
            className={`flex min-h-11 shrink-0 items-center rounded-full px-3.5 text-xs font-medium transition-colors ${
              channel === undefined
                ? 'bg-primary text-on-primary'
                : 'border border-divider bg-surface text-body hover:bg-surface-muted'
            }`}
          >
            Semua
          </button>
          {CHANNELS.map((value) => (
            <button
              key={value}
              onClick={() => updateSearch({ channel: channel === value ? undefined : value })}
              data-testid={`filter-channel-${value}`}
              aria-pressed={channel === value}
              className={`flex min-h-11 shrink-0 items-center rounded-full px-3.5 text-xs font-medium transition-colors ${
                channel === value
                  ? 'bg-primary text-on-primary'
                  : 'border border-divider bg-surface text-body hover:bg-surface-muted'
              }`}
            >
              {CHANNEL_LABELS[value]}
            </button>
          ))}
          {day && (
            <button
              onClick={() => updateSearch({ day: undefined })}
              className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full border border-primary bg-primary px-3.5 text-xs font-semibold text-on-primary transition duration-150 ease-out hover:bg-primary-hover"
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
          icon={IconSearch}
          title="Tidak ada pesanan cocok"
          description="Coba ubah kata kunci atau hapus filter yang aktif."
          action={
            hasFilters ? (
              <Button
                size="md"
                onClick={() => navigate({ search: {}, replace: true })}
              >
                Hapus semua filter
              </Button>
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
                    className={`py-1 text-sm font-semibold transition-colors ${
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
                          to="/orders/$orderId"
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
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
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
