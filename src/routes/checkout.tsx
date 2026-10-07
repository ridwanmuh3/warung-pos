import { useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { IconBuildingBank, IconCash, IconQrcode } from '@tabler/icons-react'
import { PAYMENT_LABELS, CHANNEL_LABELS } from '../data/products'
import { clearCart, flushCart, useCart } from '../lib/cart'
import { formatIDR } from '../lib/format'
import { checkoutFn } from '../lib/data.functions'
import { discountValue, itemsTotal } from '../lib/totals'
import { checkoutFormSchema, parseCheckoutForm } from '../lib/validation'
import type { PaymentMethod, SalesChannel } from '../types'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { ProductImage } from '../components/ProductImage'
import { Button } from '../components/ui/Button'

const PAYMENT_METHODS = Object.keys(PAYMENT_LABELS) as PaymentMethod[]
const CHANNELS = Object.keys(CHANNEL_LABELS) as SalesChannel[]

const PAYMENT_ICONS: Record<PaymentMethod, typeof IconCash> = {
  tunai: IconCash,
  qris: IconQrcode,
  transfer: IconBuildingBank,
}

type DiscountMode = 'rupiah' | 'persen'

/** Cash denominations a customer realistically hands over. */
const CASH_STEPS = [5000, 10000, 20000, 50000, 100000]

/** Up to three round amounts at or above the total, plus the exact amount. */
function quickCashOptions(total: number): number[] {
  const options = new Set<number>()
  for (const step of CASH_STEPS) {
    const rounded = Math.ceil(total / step) * step
    if (rounded > total) options.add(rounded)
    if (options.size >= 3) break
  }
  return [...options].sort((a, b) => a - b)
}

export const Route = createFileRoute('/checkout')({
  component: CheckoutPage,
  // Depends on the in-memory cart.
  ssr: false,
})

function CheckoutPage() {
  const navigate = useNavigate()
  const { items } = useCart()
  const [payment, setPayment] = useState<PaymentMethod>('tunai')
  const [channel, setChannel] = useState<SalesChannel>('dine-in')
  const [cashier, setCashier] = useState('')
  const [discountMode, setDiscountMode] = useState<DiscountMode>('rupiah')
  const [discountInput, setDiscountInput] = useState('')
  const [cashInput, setCashInput] = useState('')
  const [formErrors, setFormErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  /** Synchronous latch: `disabled` alone cannot stop a double click before re-render. */
  const submittedRef = useRef(false)

  const subtotal = useMemo(() => itemsTotal(items), [items])
  const discount = useMemo(() => {
    const parsed = Number(discountInput)
    if (discountInput === '' || !Number.isFinite(parsed) || parsed <= 0) return 0
    return discountValue(subtotal, {
      amount: discountMode === 'rupiah' ? parsed : 0,
      percent: discountMode === 'persen' ? parsed : null,
    })
  }, [discountInput, discountMode, subtotal])

  const total = subtotal - discount

  const cashAmount = Number(cashInput)
  const cashValid = cashInput !== '' && Number.isFinite(cashAmount) && cashAmount >= total
  const change = cashValid ? cashAmount - total : 0
  const canConfirm = payment !== 'tunai' || cashValid

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
              className="rounded-full border-2 border-primary bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition duration-150 ease-out hover:bg-primary-hover"
            >
              Kembali ke Kasir
            </Link>
          }
        />
      </div>
    )
  }

  function placeOrder() {
    if (submittedRef.current) return
    // Raw input shape: validated here for instant feedback, then validated again
    // on the server (same schema), so a crafted request cannot bypass the rules.
    const rawCheckout = {
      paymentMethod: payment,
      channel,
      cashier,
      discountMode,
      discountInput,
      cashInput,
      total,
    }
    const parsed = checkoutFormSchema.safeParse(rawCheckout)
    if (!parsed.success) {
      setFormErrors(parsed.error.issues.map((issue) => issue.message))
      return
    }
    // Local domain check for instant, precise feedback (cash < total, etc.).
    try {
      parseCheckoutForm(rawCheckout)
    } catch (cause) {
      setFormErrors(
        cause instanceof z.ZodError
          ? cause.issues.map((issue) => issue.message)
          : ['Periksa kembali isian pembayaran'],
      )
      return
    }
    setFormErrors([])
    submittedRef.current = true
    setSubmitting(true)
    void (async () => {
      try {
        // Push the local cart to the server, then settle it: the server finds
        // the open cart, prices it from the live catalog, and settles it
        // exactly once (ADR-0003/0004). A retry returns the original order, so
        // the latch below is a UX nicety, not the integrity mechanism.
        await flushCart()
        const order = await checkoutFn({ data: { checkout: rawCheckout } })
        clearCart()
        await navigate({ to: '/sukses/$orderId', params: { orderId: order.id } })
      } catch (cause) {
        // The order was not created: release the latch so the cashier can retry.
        submittedRef.current = false
        setSubmitting(false)
        setFormErrors([cause instanceof Error ? cause.message : 'Gagal menyimpan pesanan'])
      }
    })()
  }

  const cashSection = payment === 'tunai' && (
    <section className="rounded-2xl border border-border-subtle bg-surface p-4 shadow-level1">
      <h2 className="text-sm font-semibold text-slate-900">Uang Diterima</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => setCashInput(String(total))}
          className="rounded-full border border-divider px-3 py-1.5 text-xs font-semibold text-body transition duration-150 ease-out hover:bg-surface-muted"
        >
          Uang pas
        </button>
        {quickCashOptions(total).map((option) => (
          <button
            key={option}
            onClick={() => setCashInput(String(option))}
            className="tabular rounded-full border border-divider px-3 py-1.5 text-xs font-semibold text-body transition duration-150 ease-out hover:bg-surface-muted"
          >
            {formatIDR(option)}
          </button>
        ))}
      </div>
      <input
        type="number"
        min={0}
        step={500}
        inputMode="numeric"
        value={cashInput}
        onChange={(event) => setCashInput(event.target.value)}
        placeholder="0"
        aria-label="Uang diterima"
        data-testid="cash-input"
        className="tabular mt-3 w-full rounded-sm border-2 border-border bg-surface px-3 py-2 text-right text-lg font-semibold text-ink outline-none transition duration-150 ease-out focus:border-primary focus:shadow-[0_0_0_3px_rgb(22_51_0/0.15)]"
      />
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="text-slate-500">Kembalian</span>
        <span
          data-testid="change-value"
          className={`tabular text-lg font-bold ${cashValid ? 'text-brand-600' : 'text-slate-300'}`}
        >
          {formatIDR(change)}
        </span>
      </div>
      {cashInput !== '' && !cashValid && (
        <p className="mt-1 text-xs text-red-600">Uang diterima kurang dari total bayar.</p>
      )}
    </section>
  )

  const discountSection = (
    <section className="rounded-2xl border border-border-subtle bg-surface p-4 shadow-level1">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Diskon</h2>
        <div className="flex rounded-lg border border-slate-200 p-0.5">
          {(['rupiah', 'persen'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setDiscountMode(mode)}
              aria-pressed={discountMode === mode}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                discountMode === mode ? 'bg-ink text-white' : 'text-body hover:bg-surface-muted'
              }`}
            >
              {mode === 'rupiah' ? 'Rp' : '%'}
            </button>
          ))}
        </div>
      </div>
      <input
        type="number"
        min={0}
        step={discountMode === 'persen' ? 1 : 500}
        inputMode="numeric"
        value={discountInput}
        onChange={(event) => setDiscountInput(event.target.value)}
        placeholder={discountMode === 'persen' ? '10' : '2000'}
        aria-label="Nilai diskon"
        data-testid="discount-input"
        className="tabular mt-3 w-full rounded-sm border-2 border-border bg-surface px-3 py-2 text-right text-sm font-semibold text-ink outline-none transition duration-150 ease-out focus:border-primary focus:shadow-[0_0_0_3px_rgb(22_51_0/0.15)]"
      />
      {discount > 0 && (
        <p className="mt-1 text-right text-xs text-slate-500">
          Potongan <span className="tabular font-semibold text-red-600">−{formatIDR(discount)}</span>
        </p>
      )}
    </section>
  )

  const payButton = (size: 'md' | 'lg', className: string, label: ReactNode) => (
    <Button
      onClick={placeOrder}
      size={size}
      busy={submitting}
      disabled={!canConfirm}
      data-testid="confirm-order"
      className={className}
    >
      {label}
    </Button>
  )

  return (
    <div className="pb-44 md:pb-0">
      <PageHeader
        title="Detail Pesanan"
        subtitle="Periksa kembali sebelum konfirmasi"
        backTo="/keranjang"
        backLabel="Ubah keranjang"
      />

      {formErrors.length > 0 && (
        <div
          role="alert"
          data-testid="checkout-errors"
          className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <ul className="space-y-0.5">
            {formErrors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-[1fr_18rem] lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-border-subtle bg-surface shadow-level1">
            <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">
              Rincian Produk
            </h2>
            <ul className="divide-y divide-slate-100">
              {items.map((item) => (
                <li key={item.productId} className="flex items-center gap-3 px-4 py-3">
                  <ProductImage imageKey={item.imageKey} alt={item.name} className="size-9" iconSize={16} />
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

          <section className="rounded-2xl border border-border-subtle bg-surface p-4 shadow-level1">
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
                        ? 'border-primary bg-primary-subtle text-on-primary'
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

          <section className="rounded-2xl border border-border-subtle bg-surface p-4 shadow-level1">
            <h2 className="text-sm font-semibold text-slate-900">Jenis Pesanan</h2>
            <div className="mt-3 grid gap-2 grid-cols-3">
              {CHANNELS.map((value) => (
                <button
                  key={value}
                  onClick={() => setChannel(value)}
                  aria-pressed={channel === value}
                  data-testid={`channel-${value}`}
                  className={`rounded-xl border-2 px-3 py-3 text-sm font-medium transition-colors ${
                    channel === value
                      ? 'border-primary bg-primary-subtle text-on-primary'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {CHANNEL_LABELS[value]}
                </button>
              ))}
            </div>
            <label htmlFor="cashier-name" className="mt-3 block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Nama Kasir
              </span>
              <input
                id="cashier-name"
                value={cashier}
                onChange={(event) => setCashier(event.target.value)}
                placeholder="Opsional"
                autoComplete="off"
                data-testid="cashier-input"
                className="mt-1 w-full rounded-sm border-2 border-border bg-surface px-3 py-2 text-sm text-ink outline-none transition duration-150 ease-out focus:border-primary focus:shadow-[0_0_0_3px_rgb(22_51_0/0.15)]"
              />
            </label>
          </section>

          {cashSection}
          {discountSection}
        </div>

        <div className="hidden md:block lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border-subtle bg-surface p-4 shadow-level1">
            <h2 className="text-sm font-semibold text-slate-900">Ringkasan Bayar</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between text-slate-500">
                <dt>Subtotal</dt>
                <dd className="tabular font-medium text-slate-800">{formatIDR(subtotal)}</dd>
              </div>
              <div className="flex justify-between text-slate-500">
                <dt>Diskon</dt>
                <dd data-testid="summary-discount" className="tabular font-medium text-slate-800">
                  {discount > 0 ? `−${formatIDR(discount)}` : 'Rp0'}
                </dd>
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
              <span data-testid="payable-total" className="tabular font-display text-4xl font-black leading-none text-on-primary">
                {formatIDR(total)}
              </span>
            </div>
            {payButton('lg', 'mt-4 w-full', 'Konfirmasi Pesanan')}
            <p className="mt-2 text-center text-xs text-slate-400">
              Pesanan tersimpan di server dan stok langsung berkurang.
            </p>
          </div>
        </div>
      </div>

      {/* Sticky pay bar on mobile */}
      <div className="no-print safe-bottom fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-30 border-t border-slate-200 bg-white p-3 shadow-[0_-4px_12px_rgb(0_0_0/0.05)] md:hidden">
        {payButton(
          'md',
          'w-full justify-between',
          <>
            <span>Konfirmasi Pesanan</span>
            <span data-testid="mobile-payable-total" className="tabular font-display font-black">
              {formatIDR(total)}
            </span>
          </>,
        )}
      </div>
    </div>
  )
}
