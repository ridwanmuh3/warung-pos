import { useEffect, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import {
  IconArchive,
  IconArrowRight,
  IconAlertTriangle,
  IconMinus,
  IconPlus,
  IconShoppingCart,
  IconTrash,
} from '@tabler/icons-react'
import { clearCart, removeFromCart, setCartItems, setQty, stalePriceIds, useCart } from '../lib/cart'
import {
  deleteCartFn,
  listParkedCartsFn,
  parkCartFn,
  resumeCartFn,
} from '../lib/cart.functions'
import { formatDateTime, formatIDR } from '../lib/format'
import { useProducts } from '../lib/useServerData'
import type { Cart, OrderItem } from '../types'
import { PageHeader } from '../components/PageHeader'
import { TotalPanel } from '../components/TotalPanel'
import { lineSubtotal, itemsTotal } from '../lib/totals'
import { EmptyState } from '../components/EmptyState'

function QtyStepper({ item }: { item: OrderItem }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-slate-200">
      <button
        onClick={() => setQty(item.productId, item.qty - 1)}
        className="grid size-9 place-items-center rounded-l-lg text-slate-600 transition-colors hover:bg-slate-100"
        aria-label={`Kurangi jumlah ${item.name}`}
      >
        <IconMinus size={16} stroke={2.5} />
      </button>
      <span className="tabular w-7 text-center text-sm font-semibold">{item.qty}</span>
      <button
        onClick={() => setQty(item.productId, item.qty + 1)}
        className="grid size-9 place-items-center rounded-r-lg text-slate-600 transition-colors hover:bg-slate-100"
        aria-label={`Tambah jumlah ${item.name}`}
      >
        <IconPlus size={16} stroke={2.5} />
      </button>
    </div>
  )
}

export const Route = createFileRoute('/keranjang')({
  component: CartPage,
  // Cart is persisted to localStorage (cache) and synced to the server.
  ssr: false,
})

function ParkedCarts({
  parked,
  onResume,
  onDiscard,
  busy,
}: {
  parked: Cart[]
  onResume: (id: string) => void
  onDiscard: (id: string) => void
  busy: boolean
}) {
  if (parked.length === 0) return null
  return (
    <section className="mb-5">
      <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
        <IconArchive size={16} stroke={2} />
        Keranjang Tersimpan
      </h2>
      <ul className="space-y-2">
        {parked.map((cart) => (
          <li
            key={cart.id}
            data-testid={`parked-${cart.id}`}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">
                {cart.label ?? 'Tanpa nama'}
              </p>
              <p className="truncate text-xs text-slate-500">
                {cart.items.length} produk · {formatIDR(itemsTotal(cart.items))} ·{' '}
                {formatDateTime(cart.updatedAt)}
              </p>
            </div>
            <button
              onClick={() => onResume(cart.id)}
              disabled={busy}
              className="rounded-full border-2 border-primary bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary transition duration-150 ease-out hover:bg-primary-hover disabled:border-primary-muted disabled:bg-primary-muted disabled:text-mute"
            >
              Lanjutkan
            </button>
            <button
              onClick={() => onDiscard(cart.id)}
              disabled={busy}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Hapus
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function CartPage() {
  const { items, count } = useCart()
  const { data: products } = useProducts()
  const [parked, setParked] = useState<Cart[]>([])
  const [parkLabel, setParkLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const stale = stalePriceIds(products)
  const staleNames = items.filter((item) => stale.includes(item.productId)).map((item) => item.name)

  async function reloadParked() {
    try {
      setParked(await listParkedCartsFn())
    } catch {
      // Offline: keep whatever list we last had.
    }
  }

  useEffect(() => {
    void reloadParked()
  }, [])

  async function park() {
    if (items.length === 0) return
    setBusy(true)
    try {
      await parkCartFn({ data: { label: parkLabel.trim() || undefined } })
      clearCart()
      setParkLabel('')
      await reloadParked()
    } finally {
      setBusy(false)
    }
  }

  async function resume(cartId: string) {
    setBusy(true)
    try {
      const cart = await resumeCartFn({ data: { cartId } })
      if (cart) setCartItems(cart.items)
      await reloadParked()
    } finally {
      setBusy(false)
    }
  }

  async function discard(cartId: string) {
    setBusy(true)
    try {
      await deleteCartFn({ data: { cartId } })
      await reloadParked()
    } finally {
      setBusy(false)
    }
  }

  if (items.length === 0) {
    return (
      <div>
        <PageHeader title="Keranjang" backTo="/" backLabel="Kembali ke kasir" />
        <ParkedCarts parked={parked} onResume={resume} onDiscard={discard} busy={busy} />
        <EmptyState
          emoji="🛒"
          title="Keranjang masih kosong"
          description="Pilih produk di halaman kasir untuk memulai transaksi."
          action={
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-primary bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition duration-150 ease-out hover:bg-primary-hover"
            >
              <IconShoppingCart size={16} />
              Mulai Belanja
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="pb-44 md:pb-0">
      <PageHeader title="Keranjang" subtitle={`${count} item dipilih`} backTo="/" backLabel="Tambah produk" />

      <ParkedCarts parked={parked} onResume={resume} onDiscard={discard} busy={busy} />

      {staleNames.length > 0 && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <IconAlertTriangle size={18} stroke={2} className="mt-0.5 shrink-0" />
          <p>
            Harga berubah sejak item masuk keranjang:{' '}
            <span className="font-semibold">{staleNames.join(', ')}</span>. Keranjang memakai harga saat
            ditambahkan.
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-[1fr_18rem] lg:grid-cols-[1fr_20rem]">
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.productId} className="rounded-2xl border border-border-subtle bg-surface p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden>
                  {item.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
                  <p className="tabular text-xs text-slate-500">
                    {formatIDR(item.price)} × {item.qty}
                  </p>
                </div>
                <span className="tabular text-sm font-bold text-slate-900 sm:hidden">
                  {formatIDR(lineSubtotal(item))}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <QtyStepper item={item} />
                  <button
                    onClick={() => removeFromCart(item.productId)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  >
                    <IconTrash size={14} stroke={2.2} />
                    Hapus
                  </button>
                </div>
                <span className="tabular hidden text-sm font-bold text-slate-900 sm:block">
                  {formatIDR(lineSubtotal(item))}
                </span>
              </div>
            </li>
          ))}
        </ul>

        <div className="hidden md:block lg:sticky lg:top-24 lg:self-start">
          <TotalPanel
            items={items}
            footer={
              <div className="space-y-2">
                <Link
                  to="/checkout"
                  className="flex w-full items-center justify-center gap-1.5 rounded-full border-2 border-primary bg-primary px-4 py-3 text-center text-sm font-semibold text-on-primary transition duration-150 ease-out hover:bg-primary-hover active:scale-95"
                >
                  Lanjut ke Detail Pesanan
                  <IconArrowRight size={16} stroke={2.5} />
                </Link>
                <div className="flex gap-2">
                  <input
                    value={parkLabel}
                    onChange={(event) => setParkLabel(event.target.value)}
                    placeholder="Nama pelanggan"
                    aria-label="Nama keranjang disimpan"
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-brand-500"
                  />
                  <button
                    onClick={() => void park()}
                    disabled={busy}
                    data-testid="park-cart"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <IconArchive size={14} />
                    Simpan
                  </button>
                </div>
                <button
                  onClick={() => {
                    if (confirm('Kosongkan keranjang?')) clearCart()
                  }}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Kosongkan keranjang
                </button>
              </div>
            }
          />
        </div>
      </div>

      {/* Compact sticky total bar on mobile */}
      <div className="no-print safe-bottom fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-30 border-t border-slate-200 bg-white p-3 shadow-[0_-4px_12px_rgb(0_0_0/0.05)] md:hidden">
        <Link
          to="/checkout"
          className="flex items-center justify-between rounded-full border-2 border-primary bg-primary px-5 py-3 font-semibold text-on-primary"
        >
          <span>Total · {count} item</span>
          <span className="tabular flex items-center gap-1">
            {formatIDR(itemsTotal(items))}
            <IconArrowRight size={16} stroke={2.5} />
          </span>
        </Link>
      </div>
    </div>
  )
}
