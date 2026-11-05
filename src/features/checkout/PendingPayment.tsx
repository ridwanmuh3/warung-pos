import { useEffect, useState } from 'react'
import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import { QRCodeSVG } from 'qrcode.react'
import { IconClock, IconQrcode, IconRefresh, IconX } from '@tabler/icons-react'
import { formatIDR } from '~/lib/format'
import { paymentDisplayState } from '~/domain/sales/payment-lifecycle'
import type { Order, PaymentAttempt } from '~/types'
import { Button } from '~/components/ui/Button'
import { buttonStyles } from '~/components/ui/buttonStyles'
import {
  cancelPendingOrderFn,
  getPaymentStatusFn,
  reconcilePaymentFn,
  regeneratePaymentFn,
  simulatePaymentFn,
} from './checkout.functions'

const POLL_INTERVAL_MS = 3_000

function countdown(expiresAt: string | undefined, now: number): string {
  if (!expiresAt) return ''
  const remaining = Math.max(0, Date.parse(expiresAt) - now)
  const minutes = Math.floor(remaining / 60_000)
  const seconds = Math.floor((remaining % 60_000) / 1000)
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/**
 * Pending QRIS screen.
 *
 * The QR is fixed-amount and belongs to exactly one order. The screen polls
 * for the webhook's effect, offers a manual check when a callback is delayed,
 * and keeps expiry non-destructive: a lapsed QR offers a new attempt or a
 * cancel that restocks and parks the items.
 */
export function PendingPayment({
  order,
  payment,
}: {
  order: Order
  payment?: PaymentAttempt
}) {
  const router = useRouter()
  const navigate = useNavigate()
  const [attempt, setAttempt] = useState<PaymentAttempt | undefined>(payment)
  const [now, setNow] = useState(() => Date.now())
  const [busy, setBusy] = useState<'check' | 'regenerate' | 'cancel' | 'simulate' | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const live = attempt?.status === 'pending' || attempt?.status === 'creating'

  useEffect(() => {
    if (!live) return
    const id = setInterval(() => {
      void (async () => {
        try {
          const result = await getPaymentStatusFn({ data: { orderId: order.id } })
          if (result.payment) setAttempt(result.payment)
          if (result.orderStatus === 'paid') await router.invalidate()
        } catch {
          // Polling is best-effort; "Cek status" is the explicit fallback.
        }
      })()
    }, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [live, order.id, router])

  const display = paymentDisplayState(
    attempt ?? { status: 'creating' },
    new Date(now).toISOString(),
  )

  async function run(task: 'check' | 'regenerate' | 'cancel' | 'simulate') {
    setBusy(task)
    setError(null)
    setNotice(null)
    try {
      if (task === 'check') {
        const result = await reconcilePaymentFn({ data: { orderId: order.id } })
        if (result.payment) setAttempt(result.payment)
        if (result.orderStatus === 'paid') {
          await router.invalidate()
          return
        }
        setNotice('Pembayaran belum terkonfirmasi. Coba lagi beberapa saat.')
      } else if (task === 'regenerate') {
        const result = await regeneratePaymentFn({ data: { orderId: order.id } })
        if (result.kind === 'ready') {
          setAttempt(result.payment)
          setNotice('QR baru dibuat. Minta pelanggan memindai ulang.')
        }
      } else if (task === 'cancel') {
        const confirmed = window.confirm(
          'Batalkan pesanan ini? Stok dikembalikan dan item disimpan sebagai keranjang tertahan.',
        )
        if (!confirmed) return
        await cancelPendingOrderFn({ data: { orderId: order.id } })
        await navigate({ to: '/cart' })
      } else {
        await simulatePaymentFn({ data: { orderId: order.id } })
        setNotice('Simulasi dikirim. Status akan diperbarui lewat webhook atau Cek status.')
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Terjadi kesalahan')
    } finally {
      setBusy(null)
    }
  }

  const showQr = display === 'waiting' && Boolean(attempt?.qrString)
  const needsNewQr = display === 'expired' || display === 'failed'

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-5 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-sky-100 text-sky-700">
          <IconQrcode size={36} stroke={2} />
        </div>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">Menunggu Pembayaran</h1>
        <p className="mt-1 text-sm text-slate-500">
          <span className="tabular font-medium">{order.orderNumber}</span> · Total{' '}
          <span className="tabular font-semibold text-slate-700">{formatIDR(order.total)}</span>
        </p>
      </div>

      <div className="rounded-2xl border border-border-subtle bg-surface p-5 text-center shadow-level1">
        {showQr ? (
          <>
            <div
              data-testid="qris-code"
              className="mx-auto w-fit rounded-xl border border-slate-200 bg-white p-3"
            >
              <QRCodeSVG value={attempt!.qrString!} size={220} level="M" marginSize={1} />
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Minta pelanggan memindai QR ini. Nominal sudah terisi otomatis.
            </p>
            <p className="tabular mt-2 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
              <IconClock size={16} stroke={2} />
              {countdown(attempt?.expiresAt, now)}
            </p>
          </>
        ) : (
          <div className="py-8">
            <p className="text-sm font-semibold text-slate-800">
              {display === 'creating'
                ? 'Menyiapkan QR…'
                : display === 'cancelled'
                  ? 'Pembayaran dibatalkan'
                  : display === 'paid'
                    ? 'Pembayaran berhasil'
                    : 'QR kedaluwarsa'}
            </p>
            <p className="mx-auto mt-1 max-w-xs text-xs text-slate-500">
              {needsNewQr
                ? 'Tidak ada stok yang dikembalikan otomatis. Buat QR baru atau batalkan pesanan.'
                : 'Muat ulang status untuk melihat hasil terbaru.'}
            </p>
          </div>
        )}

        {display === 'waiting' && attempt?.expiresAt && (
          <p className="mt-3 text-[11px] text-slate-400">
            Pembayaran yang masuk setelah hitungan habis tetap dicatat selama dana diterima.
          </p>
        )}
      </div>

      {(notice || error) && (
        <p
          role="status"
          className={`mt-3 rounded-lg border p-3 text-xs ${
            error
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-sky-200 bg-sky-50 text-sky-800'
          }`}
        >
          {error ?? notice}
        </p>
      )}

      <div className="mt-4 grid gap-2">
        {needsNewQr && (
          <Button
            size="md"
            className="w-full"
            busy={busy === 'regenerate'}
            onClick={() => void run('regenerate')}
            data-testid="regenerate-qr"
          >
            <IconRefresh size={18} stroke={2.5} />
            Buat QR Baru
          </Button>
        )}
        <Button
          variant="secondary"
          size="md"
          className="w-full"
          busy={busy === 'check'}
          onClick={() => void run('check')}
          data-testid="check-payment"
        >
          Cek Status Pembayaran
        </Button>
        <Button
          variant="secondary"
          size="md"
          className="w-full"
          busy={busy === 'cancel'}
          onClick={() => void run('cancel')}
          data-testid="cancel-pending"
        >
          <IconX size={18} stroke={2.5} />
          Batalkan Pesanan
        </Button>
        {import.meta.env.DEV && attempt?.providerRef && (
          <Button
            variant="dark"
            size="sm"
            className="w-full"
            busy={busy === 'simulate'}
            onClick={() => void run('simulate')}
            data-testid="simulate-payment"
          >
            Simulasikan Pembayaran (Test Mode)
          </Button>
        )}
        <Link to="/orders" className={buttonStyles({ variant: 'ghost', size: 'sm', className: 'w-full' })}>
          Lihat Riwayat Pesanan
        </Link>
      </div>
    </div>
  )
}
