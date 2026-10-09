import { useMemo, useRef } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { IconArrowRight, IconPackage, IconPlus, IconSearch, IconShoppingCart, IconX } from '@tabler/icons-react'
import { z } from 'zod'
import { CATEGORY_LABELS } from '../data/products'
import { addToCart, useCart } from '../lib/cart'
import { formatIDR } from '../lib/format'
import { useProducts } from '../lib/useServerData'
import type { ProductCategory } from '../types'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { ProductImage } from '../components/ProductImage'
import { SkeletonGrid } from '../components/ui/Skeleton'

const FILTERS: Array<{ value: ProductCategory | 'semua'; label: string }> = [
  { value: 'semua', label: 'Semua' },
  ...(Object.keys(CATEGORY_LABELS) as ProductCategory[]).map((category) => ({
    value: category,
    label: CATEGORY_LABELS[category],
  })),
]

/** Validated search params: the cashier's filter and query survive a refresh. */
const menuSearchSchema = z.object({
  kategori: z.enum(['semua', 'makanan', 'minuman', 'snack']).optional().catch(undefined),
  cari: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/')({
  component: MenuPage,
  validateSearch: menuSearchSchema,
  // Catalog is browser-local (localStorage); nothing meaningful to render on the server.
  ssr: false,
})

function MenuPage() {
  const { kategori, cari } = Route.useSearch()
  const active = kategori ?? 'semua'
  const query = cari ?? ''
  const navigate = useNavigate({ from: Route.fullPath })
  const searchRef = useRef<HTMLInputElement>(null)
  const { items } = useCart()
  const { data: products, loading: productsLoading } = useProducts()

  const qtyByProduct = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of items) map.set(item.productId, item.qty)
    return map
  }, [items])

  const needle = query.trim().toLowerCase()
  const visible = products
    .filter((p) => active === 'semua' || p.category === active)
    .filter((p) => {
      if (needle === '') return true
      return (
        p.name.toLowerCase().includes(needle) ||
        (p.sku ?? '').toLowerCase().includes(needle) ||
        (p.barcode ?? '').toLowerCase().includes(needle)
      )
    })

  function setSearch(patch: { kategori?: ProductCategory | 'semua'; cari?: string }) {
    navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })
  }

  /** Barcode scanners act as keyboards: an Enter-terminated code adds the match. */
  function handleScanSubmit() {
    if (needle === '') return
    const match = products.find(
      (p) => p.barcode?.toLowerCase() === needle || p.sku?.toLowerCase() === needle,
    )
    if (!match) return
    addToCart(match)
    setSearch({ cari: '' })
    searchRef.current?.focus()
  }

  return (
    <div className="pb-14 md:pb-0">
      <PageHeader
        title="Kasir"
        subtitle="Pilih produk yang dibeli pelanggan"
        action={
          <Link
            to="/produk"
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-border bg-transparent px-4 py-2 text-sm font-semibold text-ink transition duration-150 ease-out hover:bg-surface-muted"
          >
            <IconPackage size={16} />
            Kelola Produk
          </Link>
        }
      />

      <div className="relative mb-3">
        <IconSearch
          size={16}
          stroke={2}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(event) => setSearch({ cari: event.target.value })}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              handleScanSubmit()
            }
          }}
          placeholder="Cari nama, SKU, atau scan barcode…"
          aria-label="Cari produk"
          data-testid="menu-search"
          className="w-full rounded-sm border-2 border-border bg-surface py-2 pl-9 pr-11 text-sm text-ink outline-none transition duration-150 ease-out placeholder:text-mute focus:border-primary focus:shadow-[0_0_0_3px_rgb(22_51_0/0.15)]"
        />
        {query !== '' && (
          <button
            onClick={() => setSearch({ cari: '' })}
            aria-label="Hapus pencarian"
            className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-slate-100"
          >
            <IconX size={14} stroke={2.5} />
          </button>
        )}
      </div>

      {/* Full-bleed filter rail: the negative margin mirrors the shell gutter so the
          chips scroll edge to edge without a nested scroll container. */}
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setSearch({ kategori: filter.value })}
            className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold transition duration-150 ease-out ${
              active === filter.value
                ? 'bg-primary text-on-primary'
                : 'border border-divider bg-surface text-body hover:bg-surface-muted'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {productsLoading && products.length === 0 ? (
        <SkeletonGrid count={8} />
      ) : visible.length === 0 ? (
        <EmptyState
          emoji={needle === '' ? '📦' : '🔍'}
          title={needle === '' ? 'Belum ada produk' : 'Produk tidak ditemukan'}
          description={
            needle === ''
              ? 'Tambahkan produk dulu di halaman Kelola Produk.'
              : `Tidak ada produk cocok dengan “${query}”.`
          }
          action={
            needle === '' ? (
              <Link
                to="/produk"
                className="inline-flex items-center gap-1.5 rounded-full border-2 border-primary bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition duration-150 ease-out hover:bg-primary-hover"
              >
                <IconPackage size={16} />
                Kelola Produk
              </Link>
            ) : (
              <button
                onClick={() => setSearch({ cari: '' })}
                className="rounded-full border-2 border-primary bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition duration-150 ease-out hover:bg-primary-hover"
              >
                Hapus pencarian
              </button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((product) => {
            const qty = qtyByProduct.get(product.id) ?? 0
            // Warn-and-allow (ADR-0005): an empty or negative count warns in
            // red but never blocks the sale — the count may simply be stale.
            const soldOut = product.stock !== null && product.stock <= 0
            const isLow = product.stock !== null && product.stock <= product.lowStockThreshold
            return (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className={`relative flex flex-col items-start rounded-2xl border bg-surface p-3 text-left shadow-level1 transition duration-150 ease-out hover:-translate-y-0.5 hover:shadow-level3 active:scale-[0.98] ${
                  soldOut ? 'border-danger/30' : 'border-border-subtle'
                }`}
              >
                {qty > 0 && (
                  <span className="tabular absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-ink text-xs font-bold text-white">
                    {qty}
                  </span>
                )}
                <ProductImage imageKey={product.imageKey} alt={product.name} className="aspect-square w-full rounded-xl" iconSize={28} />
                <span className="mt-2 line-clamp-2 text-sm font-semibold text-slate-900">{product.name}</span>
                <span className="tabular mt-1 text-sm font-bold text-brand-600">
                  {formatIDR(product.price)}
                </span>
                {product.stock !== null && (
                  <span
                    data-testid={`menu-stock-${product.id}`}
                    className={`tabular mt-1 text-[11px] font-medium ${
                      soldOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-slate-400'
                    }`}
                  >
                    {soldOut ? `Stok habis (${product.stock})` : `Stok ${product.stock}`}
                  </span>
                )}
                <span className="mt-2 flex w-full items-center justify-center gap-1 rounded-full bg-surface-muted py-1.5 text-xs font-semibold text-body">
                  <IconPlus size={14} stroke={2.5} />
                  {soldOut ? 'Habis' : 'Tambah'}
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
          className="flex items-center justify-between rounded-full border-2 border-primary bg-primary px-5 py-3 font-semibold text-on-primary"
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
