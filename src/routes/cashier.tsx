import { useMemo, useRef } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { IconArrowRight, IconBook, IconPackage, IconSearch, IconShoppingCart, IconX } from '@tabler/icons-react'
import { z } from 'zod'
import { CATEGORY_LABELS } from '../data/products'
import { addToCart, useCart } from '../lib/cart'
import { formatIDR } from '../lib/format'
import { listProductsFn } from '~/features/catalog/catalog.functions'
import { currentShiftFn, listDrawerOrdersFn, listShiftsFn } from '~/features/shifts/shifts.functions'
import { useTenant } from '../lib/useTenant'
import { itemsTotal } from '../lib/totals'
import type { ProductCategory } from '../types'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { OwnerSetupChecklist } from '../components/OwnerSetupChecklist'
import { ProductImage } from '../components/ProductImage'
import { CashStatus } from '~/features/shifts/CashStatus'
import { Button } from '../components/ui/Button'
import { buttonStyles } from '../components/ui/buttonStyles'

const FILTERS: Array<{ value: ProductCategory | 'all'; label: string }> = [
  { value: 'all', label: 'Semua' },
  ...(Object.keys(CATEGORY_LABELS) as ProductCategory[]).map((category) => ({
    value: category,
    label: CATEGORY_LABELS[category],
  })),
]

/** Validated search params: the cashier's filter and query survive a refresh. */
const menuSearchSchema = z.object({
  category: z.enum(['all', 'food', 'drink', 'snack']).optional().catch(undefined),
  q: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/cashier')({
  component: MenuPage,
  validateSearch: menuSearchSchema,
  loader: async () => {
    const [products, currentShift, shifts] = await Promise.all([listProductsFn(), currentShiftFn(), listShiftsFn()])
    const drawerOrders = currentShift ? await listDrawerOrdersFn({ data: { shiftId: currentShift.id } }) : []
    return { products, currentShift, shifts, drawerOrders }
  },
  // Cart is browser-local (localStorage); catalog and shifts load from server.
  ssr: false,
})

function MenuPage() {
  const { category, q } = Route.useSearch()
  const active = category ?? 'all'
  const query = q ?? ''
  const navigate = useNavigate({ from: Route.fullPath })
  const searchRef = useRef<HTMLInputElement>(null)
  const { items, count } = useCart()
  const { products, currentShift, shifts, drawerOrders } = Route.useLoaderData()
  const tenant = useTenant()
  const canManageCatalog = tenant.context?.role === 'owner' || tenant.context?.role === 'manager'

  const qtyByProduct = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of items) map.set(item.productId, item.qty)
    return map
  }, [items])

  const needle = query.trim().toLowerCase()
  const visible = products
    .filter((p) => active === 'all' || p.category === active)
    .filter((p) => {
      if (needle === '') return true
      return (
        p.name.toLowerCase().includes(needle) ||
        (p.sku ?? '').toLowerCase().includes(needle) ||
        (p.barcode ?? '').toLowerCase().includes(needle)
      )
    })

  function setSearch(patch: { category?: ProductCategory | 'all'; q?: string }) {
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
    setSearch({ q: '' })
    searchRef.current?.focus()
  }

  return (
    <div className="pb-[calc(8.5rem+env(safe-area-inset-bottom))] md:pb-0">
      <PageHeader
        title="Kasir"
        subtitle="Pilih produk yang dibeli pelanggan"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/products"
              className={buttonStyles({ variant: 'secondary', size: 'sm' })}
            >
              <IconPackage size={16} />
              {canManageCatalog ? 'Kelola Produk' : 'Lihat Produk'}
            </Link>
          </div>
        }
      />

      {tenant.context?.role === 'owner' && (
        <OwnerSetupChecklist
          tenantName={tenant.context.tenantName}
          productCount={products.length}
          shifts={shifts}
        />
      )}

      <CashStatus open={currentShift} shifts={shifts} drawerOrders={drawerOrders} />

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
          onChange={(event) => setSearch({ q: event.target.value })}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              handleScanSubmit()
            }
          }}
          placeholder="Cari nama, SKU, atau scan barcode…"
          aria-label="Cari produk"
          data-testid="menu-search"
          className="h-11 w-full rounded-sm border border-border bg-surface pl-9 pr-12 text-sm text-ink outline-none transition duration-150 ease-out placeholder:text-mute focus:border-primary focus:shadow-[0_0_0_3px_rgb(22_51_0/0.15)]"
        />
        {query !== '' && (
          <button
            onClick={() => setSearch({ q: '' })}
            aria-label="Hapus pencarian"
            className="absolute right-0 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-slate-100"
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
            onClick={() => setSearch({ category: filter.value })}
            aria-pressed={active === filter.value}
            className={`flex min-h-11 shrink-0 items-center rounded-full px-3.5 py-2 text-sm font-semibold transition duration-150 ease-out ${
              active === filter.value
                ? 'bg-primary text-on-primary'
                : 'border border-divider bg-surface text-body hover:bg-surface-muted'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={IconPackage}
          title="Belum ada produk"
          description={
            canManageCatalog
              ? 'Tambahkan produk pertama agar kasir bisa dipakai. Cukup nama dan harga.'
              : 'Minta pemilik atau manajer menambahkan produk. Panduan singkat bisa dibuka kapan saja.'
          }
          action={
            canManageCatalog ? (
              <Link
                to="/products"
                className={buttonStyles({ size: 'md' })}
              >
                <IconPackage size={18} />
                Tambah Produk
              </Link>
            ) : (
              <Link
                to="/guide"
                className={buttonStyles({ variant: 'secondary', size: 'md' })}
              >
                <IconBook size={18} />
                Lihat Panduan
              </Link>
            )
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={needle === '' ? IconPackage : IconSearch}
          title={needle === '' ? 'Belum ada produk di kategori ini' : 'Produk tidak ditemukan'}
          description={
            needle === ''
              ? 'Coba pilih kategori lain atau tampilkan semua produk.'
              : `Tidak ada produk cocok dengan “${query}”.`
          }
          action={
            <Button
              size="md"
              onClick={() => navigate({ search: {}, replace: true })}
            >
              Tampilkan semua
            </Button>
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
                aria-label={`Tambah ${product.name}`}
                className={`relative flex flex-col items-start rounded-2xl border bg-surface p-3 text-left shadow-level1 transition duration-150 ease-out hover:-translate-y-0.5 hover:shadow-level3 active:scale-[0.98] ${
                  soldOut ? 'border-danger/30' : 'border-border-subtle'
                }`}
              >
                {qty > 0 && (
                  <span className="tabular absolute right-2 top-2 z-10 grid size-6 place-items-center rounded-full bg-ink text-xs font-bold text-white">
                    {qty}
                  </span>
                )}
                <ProductImage imageKey={product.imageKey} alt={product.name} className="aspect-square w-full rounded-xl" iconSize={28} />
                <span className="mt-2 line-clamp-2 text-sm font-semibold text-slate-900">{product.name}</span>
                <span className="tabular mt-1 text-sm font-bold text-brand-600">
                  {formatIDR(product.price)}
                </span>
                {/* Stock is only worth a line when it changes the decision.
                    A normal count on every card is twenty rows of noise. */}
                {product.stock !== null && (soldOut || isLow) && (
                  <span
                    data-testid={`menu-stock-${product.id}`}
                    className={`tabular mt-1 text-[11px] font-semibold ${
                      soldOut ? 'text-red-600' : 'text-amber-600'
                    }`}
                  >
                    {soldOut ? `Stok habis (${product.stock})` : `Sisa ${product.stock}`}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Floating cart bar for small screens, stacked above the tab bar. Hidden
          while the cart is empty: a dead "0 produk" bar is just noise. */}
      {items.length > 0 && (
        <div className="no-print safe-bottom fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-30 border-t border-slate-200 bg-white p-3 shadow-[0_-4px_12px_rgb(0_0_0/0.05)] md:hidden">
          <Link
            to="/cart"
            className={buttonStyles({ size: 'md', justify: 'between', className: 'w-full' })}
          >
            <span className="flex items-center gap-2">
              <IconShoppingCart size={18} stroke={2} />
              {count} produk
            </span>
            <span className="tabular flex items-center gap-1">
              {formatIDR(itemsTotal(items))}
              <IconArrowRight size={16} stroke={2.5} />
            </span>
          </Link>
        </div>
      )}
    </div>
  )
}
