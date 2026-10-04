import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { IconBuildingBank, IconCash, IconQrcode } from '@tabler/icons-react'
import { PAYMENT_LABELS } from '../data/products'
import { clearCart, currentCartItems, useCart } from '../lib/cart'
import { formatIDR } from '../lib/format'
import { createOrder } from '../lib/orders'
import { itemsTotal } from '../lib/totals'
import type { PaymentMethod } from '../types'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'

const PAYMENT_METHODS = Object.keys(PAYMENT_LABELS) as PaymentMethod[]

const PAYMENT_ICONS: Record<PaymentMethod, typeof IconCash> = {
  tunai: IconCash,
  qris: IconQrcode,
  transfer: IconBuildingBank,
}

export function CheckoutPage() {
  const navigate = useNavigate()
  const { items } = useCart()
  const [payment, setPayment] = useState<PaymentMethod>('tunai')
  const [submitting, setSubmitting] = useState(false)

  if (items.length === 0) {
    return (
      <div>
        <PageHeader title="Detail Pesanan" backTo="/keranjang" />
        <EmptyState
          emoji="🧾"
          title="Tidak ada pesanan untuk ditinjau"
          description="Tambahkan produk ke keranjang terlebih dahulu."
          action={
            <Link
              to="/"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Kembali ke Kasir
            </Link>
          }
        />
      </div>
    )
  }

  const total = itemsTotal(items)

  function placeOrder() {
    setSubmitting(true)
    const order = createOrder({
      items: currentCartItems(),
      total,
      paymentMethod: payment,
      amountPaid: null,
      change: null,
    })
    clearCart()
    navigate({ to: '/sukses/$orderId', params: { orderId: order.id } })
  }

  return (
    <div className="pb-44 md:pb-0">
      <PageHeader
        title="Detail Pesanan"
        subtitle="Periksa kembali sebelum konfirmasi"
        backTo="/keranjang"
        backLabel="Ubah keranjang"
      />

      <div className="grid gap-4 md:grid-cols-[1fr_18rem] lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">
              Rincian Produk
            </h2>
            <ul className="divide-y divide-slate-100">
              {items.map((item) => (
                <li key={item.productId} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xl" aria-hidden>
                    {item.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{item.name}</p>
                    <p className="tabular text-xs text-slate-500">
                      {formatIDR(item.price)} × {item.qty}
                    </p>
                  </div>
                  <span className="tabular text-sm font-semibold text-slate-900">
                    {formatIDR(item.price * item.qty)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Metode Pembayaran</h2>
            <div className="mt-3 grid gap-2 grid-cols-3">
              {PAYMENT_METHODS.map((method) => {
                const Icon = PAYMENT_ICONS[method]
                return (
                  <button
                    key={method}
                    onClick={() => setPayment(method)}
                    aria-pressed={payment === method}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-4 text-sm font-medium transition-colors ${
                      payment === method
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Icon size={24} stroke={1.8} />
                    {PAYMENT_LABELS[method]}
                  </button>
                )
              })}
            </div>
          </section>
        </div>

        <div className="hidden md:block lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Ringkasan Bayar</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between text-slate-500">
                <dt>Subtotal</dt>
                <dd className="tabular font-medium text-slate-800">{formatIDR(total)}</dd>
              </div>
              <div className="flex justify-between text-slate-500">
                <dt>Diskon</dt>
                <dd className="tabular font-medium text-slate-800">Rp0</dd>
              </div>
              <div className="flex justify-between text-slate-500">
                <dt>Metode</dt>
                <dd data-testid="selected-method" className="font-medium text-slate-800">
                  {PAYMENT_LABELS[payment]}
                </dd>
              </div>
            </dl>
            <div className="my-3 border-t border-dashed border-slate-200" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900">Total Bayar</span>
              <span data-testid="payable-total" className="tabular text-2xl font-bold text-brand-600">
                {formatIDR(total)}
              </span>
            </div>
            <button
              onClick={placeOrder}
              disabled={submitting}
              className="mt-4 w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
            >
              {submitting ? 'Memproses…' : 'Konfirmasi Pesanan'}
            </button>
            <p className="mt-2 text-center text-xs text-slate-400">
              Pesanan akan tersimpan di perangkat ini.
            </p>
          </div>
        </div>
      </div>

      {/* Sticky pay bar on mobile */}
      <div className="no-print safe-bottom fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-30 border-t border-slate-200 bg-white p-3 shadow-[0_-4px_12px_rgb(0_0_0/0.05)] md:hidden">
        <button
          onClick={placeOrder}
          disabled={submitting}
          className="flex w-full items-center justify-between rounded-lg bg-brand-600 px-4 py-3 font-bold text-white disabled:opacity-60"
        >
          <span>{submitting ? 'Memproses…' : 'Konfirmasi Pesanan'}</span>
          <span data-testid="mobile-payable-total" className="tabular">{formatIDR(total)}</span>
        </button>
      </div>
    </div>
  )
}
