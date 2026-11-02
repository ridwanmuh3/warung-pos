import { Link, createFileRoute } from '@tanstack/react-router'
import { IconCheck, IconPlus, IconPrinter, IconSearch } from '@tabler/icons-react'
import { formatIDR } from '../lib/format'
import { getOrderFn } from '../lib/data.functions'
import { Receipt } from '../components/Receipt'
import { EmptyState } from '../components/EmptyState'
import { Skeleton } from '../components/ui/Skeleton'
import { Button } from '../components/ui/Button'
import { buttonStyles } from '../components/ui/buttonStyles'
import type { Order } from '../types'

export const Route = createFileRoute('/order-success/$orderId')({
  component: SuccessPage,
  pendingComponent: SuccessPending,
  pendingMs: 120,
  pendingMinMs: 300,
  // The freshly created order is fetched from the database during SSR. A
  // client-side checkout hands the order over in history state, so the receipt
  // appears immediately instead of waiting for a second round-trip.
  loader: async ({ params, location }) => {
    const cached = (location.state as { order?: Order }).order
    if (cached?.id === params.orderId) return { order: cached }
    return { order: await getOrderFn({ data: { id: params.orderId } }) }
  },
})

/** Geometry matches the receipt so the first paint does not jump. */
function SuccessPending() {
  return (
    <div className="mx-auto max-w-md" role="status" aria-live="polite">
      <span className="sr-only">Memuat struk…</span>
      <div className="mb-5 flex flex-col items-center">
        <Skeleton className="size-16 rounded-full" />
        <Skeleton className="mt-4 h-7 w-52" />
        <Skeleton className="mt-2 h-4 w-40" />
      </div>
      <Skeleton className="h-[22rem] rounded-2xl" />
      <div className="mt-4 grid gap-2">
        <Skeleton className="h-12 rounded-full" />
        <Skeleton className="h-11 rounded-xl" />
      </div>
    </div>
  )
}

function SuccessPage() {
  const { order } = Route.useLoaderData()

  if (!order) {
    return (
      <EmptyState
        icon={IconSearch}
        title="Pesanan tidak ditemukan"
        description="Struk ini mungkin sudah tidak tersedia di server."
        action={
          <Link to="/orders" className={buttonStyles({ size: 'md' })}>
            Lihat Riwayat
          </Link>
        }
      />
    )
  }

  const isCredit = order.paymentMethod === 'credit' && order.settlementStatus === 'unsettled'

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-5 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-brand-100 text-brand-600">
          <IconCheck size={36} stroke={2.5} />
        </div>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">
          {isCredit ? 'Utang Tercatat' : 'Pesanan Berhasil'}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          <span className="tabular font-medium">{order.orderNumber}</span> · Total{' '}
          <span className="tabular font-semibold text-slate-700">{formatIDR(order.total)}</span>
        </p>
        {isCredit && (
          <p className="mx-auto mt-2 max-w-xs text-xs text-amber-700">
            Belum dibayar{order.customerName ? ` oleh ${order.customerName}` : ''}. Tandai lunas dari menu Utang
            saat pelanggan membayar.
          </p>
        )}
      </div>

      <Receipt order={order} />

      <div className="no-print mt-4 grid gap-2">
        <Link
          to="/cashier"
          className={buttonStyles({ size: 'md', className: 'w-full' })}
        >
          <IconPlus size={18} stroke={2.5} />
          Transaksi Baru
        </Link>
        <Button
          variant="secondary"
          size="md"
          className="w-full"
          onClick={() => window.print()}
        >
          <IconPrinter size={18} stroke={2} />
          Cetak Struk
        </Button>
      </div>
    </div>
  )
}
