import { Link, createFileRoute } from '@tanstack/react-router'
import { IconPrinter } from '@tabler/icons-react'
import { getOrderFn } from '../lib/data.functions'
import { Receipt } from '../components/Receipt'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'

export const Route = createFileRoute('/riwayat/$orderId')({
  component: ReceiptPage,
  // The order is fetched from the database on the server and streamed with the HTML.
  loader: async ({ params }) => ({ order: await getOrderFn({ data: { id: params.orderId } }) }),
})

function ReceiptPage() {
  const { order } = Route.useLoaderData()

  if (!order) {
    return (
      <EmptyState
        emoji="🔍"
        title="Pesanan tidak ditemukan"
        description="Struk ini mungkin sudah tidak tersedia di server."
        action={
          <Link to="/riwayat" className="rounded-full border-2 border-primary bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition duration-150 ease-out hover:bg-primary-hover">
            Kembali ke Riwayat
          </Link>
        }
      />
    )
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="no-print">
        <PageHeader title="Struk" subtitle={order.orderNumber} backTo="/riwayat" backLabel="Riwayat" />
      </div>
      <Receipt order={order} />
      <div className="no-print mt-4">
        <button
          onClick={() => window.print()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <IconPrinter size={16} stroke={2} />
          Cetak Struk
        </button>
      </div>
    </div>
  )
}
