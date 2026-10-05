import { Link, createFileRoute } from '@tanstack/react-router'
import { IconCheck, IconPlus, IconPrinter } from '@tabler/icons-react'
import { formatIDR } from '../lib/format'
import { getOrderFn } from '../lib/data.functions'
import { Receipt } from '../components/Receipt'
import { EmptyState } from '../components/EmptyState'

export const Route = createFileRoute('/sukses/$orderId')({
  component: SuccessPage,
  // The freshly created order is fetched from the database during SSR.
  loader: async ({ params }) => ({ order: await getOrderFn({ data: { id: params.orderId } }) }),
})

function SuccessPage() {
  const { order } = Route.useLoaderData()

  if (!order) {
    return (
      <EmptyState
        emoji="🔍"
        title="Pesanan tidak ditemukan"
        description="Struk ini mungkin sudah tidak tersedia di perangkat ini."
        action={
          <Link to="/riwayat" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            Lihat Riwayat
          </Link>
        }
      />
    )
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-5 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-brand-100 text-brand-600">
          <IconCheck size={36} stroke={2.5} />
        </div>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">Pesanan Berhasil</h1>
        <p className="mt-1 text-sm text-slate-500">
          <span className="tabular font-medium">{order.orderNumber}</span> · Total{' '}
          <span className="tabular font-semibold text-slate-700">{formatIDR(order.total)}</span>
        </p>
      </div>

      <Receipt order={order} />

      <div className="no-print mt-4 grid gap-2">
        <Link
          to="/"
          className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-center text-sm font-bold text-white hover:bg-brand-700"
        >
          <IconPlus size={16} stroke={2.5} />
          Transaksi Baru
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <IconPrinter size={16} stroke={2} />
          Cetak Struk
        </button>
      </div>
    </div>
  )
}
