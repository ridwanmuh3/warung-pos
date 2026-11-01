import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { IconAlertTriangle, IconPrinter, IconSearch } from '@tabler/icons-react'
import { getOrderFn, refundOrderFn, voidOrderFn } from '../lib/data.functions'
import { formatIDR } from '../lib/format'
import { useTenant } from '../lib/useTenant'
import { Receipt } from '../components/Receipt'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { Button } from '../components/ui/Button'
import { buttonStyles } from '../components/ui/buttonStyles'
import { Modal, ModalTitle } from '../components/ui/Modal'

export const Route = createFileRoute('/orders/$orderId')({
  component: ReceiptPage,
  // The order is fetched from the database on the server and streamed with the HTML.
  loader: async ({ params }) => ({ order: await getOrderFn({ data: { id: params.orderId } }) }),
})

function ReceiptPage() {
  const { order } = Route.useLoaderData()
  const tenant = useTenant()
  const router = useRouter()

  const canManage = tenant.context?.role === 'owner' || tenant.context?.role === 'manager'
  const [confirming, setConfirming] = useState(false)
  const [reason, setReason] = useState('')
  const [needsRefund, setNeedsRefund] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!order) {
    return (
      <EmptyState
        icon={IconSearch}
        title="Pesanan tidak ditemukan"
        description="Struk ini mungkin sudah tidak tersedia di server."
        action={
          <Link to="/orders" className={buttonStyles({ size: 'md' })}>
            Kembali ke Riwayat
          </Link>
        }
      />
    )
  }

  function closeDialog() {
    setConfirming(false)
    setNeedsRefund(false)
    setError(null)
  }

  function confirmCancellation() {
    if (!order) return
    const action = needsRefund ? refundOrderFn : voidOrderFn
    setBusy(true)
    setError(null)
    void action({ data: { id: order.id, reason } })
      .then(() => {
        closeDialog()
        void router.invalidate()
      })
      .catch((cause: unknown) => {
        const message = cause instanceof Error ? cause.message : 'Gagal membatalkan transaksi'
        // A closed shift turns a void into a refund (ADR-0006).
        if (!needsRefund && message.toLowerCase().includes('refund')) setNeedsRefund(true)
        setError(message)
      })
      .finally(() => setBusy(false))
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="no-print">
        <PageHeader title="Struk" subtitle={order.orderNumber} backTo="/orders" backLabel="Riwayat" />
      </div>

      {order.status !== 'paid' && (
        <div
          className={`no-print mb-3 rounded-xl border p-3 text-sm ${
            order.status === 'void'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-amber-200 bg-amber-50 text-amber-800'
          }`}
        >
          <p className="font-semibold">
            {order.status === 'void' ? 'Transaksi dibatalkan' : 'Dana dikembalikan'}
          </p>
          <p className="mt-0.5 text-xs">
            {order.status === 'void' ? order.voidReason : order.refundReason}
          </p>
        </div>
      )}

      <Receipt order={order} />

      <div className="no-print mt-4 space-y-2">
        <Button
          variant="secondary"
          size="md"
          className="w-full"
          onClick={() => window.print()}
        >
          <IconPrinter size={18} stroke={2} />
          Cetak Struk
        </Button>

        {/* Cancelling is a manager decision and belongs on the order it
            affects, not as a button on every row of the history list. */}
        {canManage && order.status === 'paid' && (
          <Button
            variant="danger-outline"
            size="md"
            className="w-full"
            onClick={() => setConfirming(true)}
            data-testid="void-order"
          >
            Batalkan Transaksi
          </Button>
        )}
      </div>

      {confirming && (
        <Modal onClose={closeDialog}>
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-red-100 text-red-600">
              <IconAlertTriangle size={20} />
            </span>
            <div>
              <ModalTitle>
                {needsRefund ? 'Kembalikan dana' : 'Batalkan'} {order.orderNumber}?
              </ModalTitle>
              <p className="mt-1 text-sm text-slate-600">
                {needsRefund
                  ? 'Shift transaksi ini sudah ditutup, jadi uang dikembalikan dari laci kas yang sedang buka dan tercatat sebagai refund. Stok produk dikembalikan.'
                  : 'Transaksi ditandai batal dan stok produknya dikembalikan. Transaksi tidak dihapus, jadi jejaknya tetap ada.'}
              </p>
              <p className="tabular mt-1 text-sm font-semibold text-slate-900">
                {formatIDR(order.total)}
              </p>
            </div>
          </div>
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Alasan (opsional)"
            aria-label="Alasan pembatalan"
            data-testid="void-reason"
            className="mt-3 w-full rounded-sm border-2 border-border px-3 py-2 text-sm outline-none transition duration-150 ease-out focus:border-primary focus:shadow-[0_0_0_3px_rgb(22_51_0/0.15)]"
          />
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={closeDialog}>
              Batal
            </Button>
            <Button
              variant="danger"
              size="sm"
              busy={busy}
              data-testid="void-confirm"
              onClick={confirmCancellation}
            >
              {needsRefund ? 'Kembalikan Dana' : 'Batalkan Transaksi'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
