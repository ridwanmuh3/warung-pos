import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { IconArrowRight, IconPackage, IconPlus, IconShoppingCart } from '@tabler/icons-react'
import { CATEGORY_LABELS } from '../data/products'
import { addToCart, useCart } from '../lib/cart'
import { formatIDR } from '../lib/format'
import { useProducts } from '../lib/useProducts'
import type { ProductCategory } from '../types'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'

const FILTERS: Array<{ value: ProductCategory | 'semua'; label: string }> = [
  { value: 'semua', label: 'Semua' },
  ...(Object.keys(CATEGORY_LABELS) as ProductCategory[]).map((category) => ({
    value: category,
    label: CATEGORY_LABELS[category],
  })),
]

export function MenuPage() {
  const [active, setActive] = useState<ProductCategory | 'semua'>('semua')
  const { items } = useCart()
  const products = useProducts()

  const qtyByProduct = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of items) map.set(item.productId, item.qty)
    return map
  }, [items])

  const visible = active === 'semua' ? products : products.filter((p) => p.category === active)

  return (
    <div className="pb-44 md:pb-0">
      <PageHeader
        title="Kasir"
        subtitle="Pilih produk yang dibeli pelanggan"
        action={
          <Link
            to="/produk"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <IconPackage size={16} />
            Kelola Produk
          </Link>
        }
      />

      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setActive(filter.value)}
            className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
              active === filter.value
                ? 'bg-brand-600 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          emoji="📦"
          title="Belum ada produk"
          description="Tambahkan produk dulu di halaman Kelola Produk."
          action={
            <Link
              to="/produk"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              <IconPackage size={16} />
              Kelola Produk
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((product) => {
            const qty = qtyByProduct.get(product.id) ?? 0
            return (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="relative flex flex-col items-start rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition-all hover:border-brand-500 hover:shadow-md active:scale-[0.98]"
              >
                {qty > 0 && (
                  <span className="tabular absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
                    {qty}
                  </span>
                )}
                <span className="text-3xl" aria-hidden>
                  {product.emoji}
                </span>
                <span className="mt-2 line-clamp-2 text-sm font-semibold text-slate-900">{product.name}</span>
                <span className="tabular mt-1 text-sm font-bold text-brand-600">
                  {formatIDR(product.price)}
                </span>
                <span className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-slate-100 py-1.5 text-xs font-semibold text-slate-700">
                  <IconPlus size={14} stroke={2.5} />
                  Tambah
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Floating cart bar for small screens, stacked above the tab bar. */}
      <div className="no-print safe-bottom fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-30 border-t border-slate-200 bg-white p-3 shadow-[0_-4px_12px_rgb(0_0_0/0.05)] md:hidden">
        <Link
          to="/keranjang"
          className="flex items-center justify-between rounded-lg bg-brand-600 px-4 py-3 font-semibold text-white"
        >
          <span className="flex items-center gap-2">
            <IconShoppingCart size={18} stroke={2} />
            {items.length} produk dipilih
          </span>
          <span className="flex items-center gap-1">
            Lanjut
            <IconArrowRight size={16} stroke={2.5} />
          </span>
        </Link>
      </div>
    </div>
  )
}