import { Link } from '@tanstack/react-router'
import { IconArrowRight, IconMinus, IconPlus, IconShoppingCart, IconTrash } from '@tabler/icons-react'
import { removeFromCart, setQty, useCart } from '../lib/cart'
import { formatIDR } from '../lib/format'
import type { OrderItem } from '../types'
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

export function CartPage() {
  const { items, count } = useCart()

  if (items.length === 0) {
    return (
      <div>
        <PageHeader title="Keranjang" backTo="/" backLabel="Kembali ke kasir" />
        <EmptyState
          emoji="🛒"
          title="Keranjang masih kosong"
          description="Pilih produk di halaman kasir untuk memulai transaksi."
          action={
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
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

      <div className="grid gap-4 md:grid-cols-[1fr_18rem] lg:grid-cols-[1fr_20rem]">
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.productId} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
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
              <Link
                to="/checkout"
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-3 text-center text-sm font-bold text-white transition-colors hover:bg-brand-700"
              >
                Lanjut ke Detail Pesanan
                <IconArrowRight size={16} stroke={2.5} />
              </Link>
            }
          />
        </div>
      </div>

      {/* Compact sticky total bar on mobile */}
      <div className="no-print safe-bottom fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-30 border-t border-slate-200 bg-white p-3 shadow-[0_-4px_12px_rgb(0_0_0/0.05)] md:hidden">
        <Link
          to="/checkout"
          className="flex items-center justify-between rounded-lg bg-brand-600 px-4 py-3 font-semibold text-white"
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