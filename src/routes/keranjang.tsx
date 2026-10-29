import { useEffect, useRef, useState } from 'react'
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
import { clearCart, currentCartItems, removeFromCart, setCartItems, setQty, stalePriceIds, useCart } from '../lib/cart'
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
import { ProductImage } from '../components/ProductImage'
import { Button } from '../components/ui/Button'
import { buttonStyles } from '../components/ui/buttonStyles'
import { Modal, ModalTitle } from '../components/ui/Modal'

function QtyStepper({ item }: { item: OrderItem }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200">
      <button
        onClick={() => setQty(item.productId, item.qty - 1)}
        className="grid size-11 place-items-center rounded-l-lg text-slate-600 transition-colors hover:bg-slate-100"
        aria-label={`Kurangi jumlah ${item.name}`}
      >
        <IconMinus size={16} stroke={2.5} />
      </button>
      <span className="tabular w-8 text-center text-sm font-semibold">{item.qty}</span>
      <button
        onClick={() => setQty(item.productId, item.qty + 1)}
        className="grid size-11 place-items-center rounded-r-lg text-slate-600 transition-colors hover:bg-slate-100"
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
    <section className="mb-4">
      <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
        <IconArchive size={16} stroke={2} />
        Pesanan Ditahan
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
            <Button size="sm" onClick={() => onResume(cart.id)} disabled={busy}>
              Lanjutkan
            </Button>
            <Button
              variant="danger-outline"
              size="sm"
              onClick={() => onDiscard(cart.id)}
              disabled={busy}
            >
              Hapus
            </Button>
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
  const [confirmClear, setConfirmClear] = useState(false)
  const [undoItems, setUndoItems] = useState<OrderItem[] | null>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
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

  useEffect(() => {
    if (!undoItems) return
    const timer = window.setTimeout(() => setUndoItems(null), 5000)
    return () => window.clearTimeout(timer)
  }, [undoItems])

  function confirmEmptyCart() {
    setUndoItems(currentCartItems())
    setConfirmClear(false)
    clearCart()
  }

  // ponytail: undo restores only an empty cart; merging later edits needs a dedicated cart-history flow.
  const undoNotice = undoItems && items.length === 0 && (
    <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-divider bg-primary-subtle px-4 py-3 text-sm text-on-primary">
      <span>Keranjang dikosongkan. Urungkan dalam 5 detik.</span>
      <button type="button" className="min-h-11 rounded-full px-4 font-semibold underline underline-offset-2" onClick={() => { setCartItems(undoItems); setUndoItems(null) }}>Urungkan</button>
    </div>
  )

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
        <PageHeader title="Keranjang" backTo="/kasir" backLabel="Kembali ke kasir" />
        {undoNotice}
        <ParkedCarts parked={parked} onResume={resume} onDiscard={discard} busy={busy} />
        <EmptyState
          icon={IconShoppingCart}
          title="Keranjang masih kosong"
          description="Pilih produk di halaman kasir untuk memulai transaksi."
          action={
            <Link to="/kasir" className={buttonStyles({ size: 'md' })}>
              <IconShoppingCart size={18} />
              Mulai Belanja
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="pb-[calc(8.5rem+env(safe-area-inset-bottom))] md:pb-0">
      <PageHeader title="Keranjang" subtitle={`${count} item dipilih`} backTo="/kasir" backLabel="Tambah produk" />

      {undoNotice}

      <ParkedCarts parked={parked} onResume={resume} onDiscard={discard} busy={busy} />

      {staleNames.length > 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 sm:p-4">
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
                <ProductImage imageKey={item.imageKey} alt={item.name} className="size-11" iconSize={20} />
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
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
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

        <div className="hidden md:block lg:sticky lg:top-6 lg:self-start">
          <TotalPanel
            items={items}
            footer={
              <div className="space-y-2">
                <Link
                  to="/checkout"
                  className={buttonStyles({ size: 'md', className: 'w-full' })}
                >
                  Lanjut ke Detail Pesanan
                  <IconArrowRight size={18} stroke={2.5} />
                </Link>
                <div className="flex items-center gap-2">
                  <input
                    value={parkLabel}
                    onChange={(event) => setParkLabel(event.target.value)}
                    placeholder="Nama pelanggan / meja"
                    aria-label="Nama pesanan yang ditahan"
                    className="h-11 min-w-0 flex-1 rounded-lg border border-border px-3 text-sm outline-none focus:border-primary"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void park()}
                    disabled={busy}
                    data-testid="park-cart"
                  >
                    <IconArchive size={16} />
                    Tahan
                  </Button>
                </div>
                <Button
                  variant="danger-outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setConfirmClear(true)}
                >
                  Kosongkan keranjang
                </Button>
              </div>
            }
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setConfirmClear(true)}
        className="mt-4 min-h-11 w-full rounded-full border border-danger/40 px-4 text-sm font-semibold text-danger md:hidden"
      >
        Kosongkan keranjang
      </button>

      {confirmClear && (
        <Modal
          onClose={() => setConfirmClear(false)}
          aria-labelledby="clear-cart-title"
          aria-describedby="clear-cart-description"
          onKeyDown={(event) => {
            if (event.key === 'Escape') { event.preventDefault(); setConfirmClear(false) }
            if (event.key === 'Tab' && event.shiftKey && document.activeElement === cancelRef.current) { event.preventDefault(); confirmRef.current?.focus() }
            if (event.key === 'Tab' && !event.shiftKey && document.activeElement === confirmRef.current) { event.preventDefault(); cancelRef.current?.focus() }
          }}
        >
          <ModalTitle id="clear-cart-title">Kosongkan keranjang?</ModalTitle>
          <p id="clear-cart-description" className="mt-2 text-sm text-body">{count} item akan dihapus dari keranjang. Anda bisa mengurungkannya dalam 5 detik.</p>
          <div className="mt-6 flex justify-end gap-2">
            <button ref={cancelRef} autoFocus type="button" className={buttonStyles({ variant: 'secondary', size: 'sm' })} onClick={() => setConfirmClear(false)}>Batal</button>
            <button ref={confirmRef} type="button" className={buttonStyles({ variant: 'danger', size: 'sm' })} onClick={confirmEmptyCart}>Ya, kosongkan</button>
          </div>
        </Modal>
      )}

      {/* Compact sticky total bar on mobile */}
      <div className="no-print safe-bottom fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-30 border-t border-slate-200 bg-white p-3 shadow-[0_-4px_12px_rgb(0_0_0/0.05)] md:hidden">
        <Link
          to="/checkout"
          className={buttonStyles({ size: 'md', justify: 'between', className: 'w-full' })}
        >
          <span>Total · {count} item</span>
          <span className="tabular flex items-center gap-1">
            {formatIDR(itemsTotal(items))}
            <IconArrowRight size={18} stroke={2.5} />
          </span>
        </Link>
      </div>
    </div>
  )
}
