import { useState } from 'react'
import { Link, getRouteApi, useRouter } from '@tanstack/react-router'
import { IconAlertTriangle, IconPrinter, IconSearch } from '@tabler/icons-react'
import { refundOrderFn, settleCreditOrderFn, voidOrderFn } from './sales.functions'
import { canSettle } from '~/domain/sales/lifecycle'
import { PAYMENT_LABELS } from '~/content/labels'
import { formatIDR } from '~/lib/format'
import { useTenant } from '~/lib/useTenant'
import type { SettlementPaymentMethod } from '~/types'
import { Receipt } from '~/components/Receipt'
import { PageHeader } from '~/components/PageHeader'
import { EmptyState } from '~/components/EmptyState'
import { Button } from '~/components/ui/Button'
import { buttonStyles } from '~/components/ui/buttonStyles'
import { Modal, ModalTitle } from '~/components/ui/Modal'

const route = getRouteApi('/orders/$orderId')

export function ReceiptPage() {
  const { order } = route.useLoaderData()
  const tenant = useTenant()
  const router = useRouter()

  const canManage = tenant.context?.role === 'owner' || tenant.context?.role === 'manager'
  const [confirming, setConfirming] = useState(false)
  const [reason, setReason] = useState('')
  const [needsRefund, setNeedsRefund] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [settling, setSettling] = useState(false)
  const [settleMethod, setSettleMethod] = useState<SettlementPaymentMethod>('cash')
  const [settleError, setSettleError] = useState<string | null>(null)
  const [settleBusy, setSettleBusy] = useState(false)

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

  async function confirmCancellation() {
    if (!order) return
    setBusy(true)
    setError(null)
    try {
      if (needsRefund) {
        const result = await refundOrderFn({ data: { id: order.id, reason } })
        if (result.kind === 'not-found') {
          setError('Pesanan tidak ditemukan')
          return
        }
        closeDialog()
        void router.invalidate()
        return
      }

      const result = await voidOrderFn({ data: { id: order.id, reason } })
      // A closed shift means the cancellation is a refund (ADR-0006). Switch
      // the dialog without treating it as an error or matching copy.
      if (result.kind === 'refund-required') {
        setNeedsRefund(true)
        return
      }
      if (result.kind === 'not-found') {
        setError('Pesanan tidak ditemukan')
        return
      }
      closeDialog()
      void router.invalidate()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal membatalkan transaksi')
    } finally {
      setBusy(false)
    }
  }

  function settleCredit() {
    if (!order) return
    setSettleBusy(true)
    setSettleError(null)
    void settleCreditOrderFn({ data: { id: order.id, method: settleMethod } })
      .then(() => {
        setSettling(false)
        void router.invalidate()
      })
      .catch((cause: unknown) => {
        setSettleError(cause instanceof Error ? cause.message : 'Gagal menandai lunas')
      })
      .finally(() => setSettleBusy(false))
  }

  const canSettleNow = canSettle(order)

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

        {canSettleNow && (
          <Button
            size="md"
            className="w-full"
            onClick={() => {
              setSettleMethod('cash')
              setSettleError(null)
              setSettling(true)
            }}
            data-testid="settle-credit"
          >
            Tandai Sudah Dibayar
          </Button>
        )}

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

      {settling && (
        <Modal
          onClose={() => {
            setSettling(false)
            setSettleError(null)
          }}
        >
          <ModalTitle>Tandai Lunas</ModalTitle>
          <p className="mt-1 text-sm text-slate-600">
            {order.customerName ? `${order.customerName} · ` : ''}
            {order.orderNumber}
          </p>
          <p className="tabular mt-1 text-lg font-bold text-slate-900">{formatIDR(order.total)}</p>

          <fieldset className="mt-4">
            <legend className="text-xs font-semibold tracking-wide text-slate-500">
              Metode Pelunasan
            </legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(['cash', 'qris', 'transfer'] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setSettleMethod(method)}
                  aria-pressed={settleMethod === method}
                  data-testid={`settle-method-${method}`}
                  className={`min-h-11 rounded-xl border px-2 py-2 text-xs font-semibold transition-colors ${
                    settleMethod === method
                      ? 'border-primary bg-primary-subtle text-on-primary'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {PAYMENT_LABELS[method]}
                </button>
              ))}
            </div>
          </fieldset>

          {settleMethod === 'cash' && (
            <p className="mt-2 text-xs text-slate-500">
              Pelunasan tunai menambah kas pada shift yang sedang terbuka.
            </p>
          )}
          {settleError && <p className="mt-2 text-xs text-red-600">{settleError}</p>}

          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSettling(false)
                setSettleError(null)
              }}
            >
              Batal
            </Button>
            <Button size="sm" busy={settleBusy} onClick={settleCredit} data-testid="settle-confirm">
              Tandai Lunas
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
