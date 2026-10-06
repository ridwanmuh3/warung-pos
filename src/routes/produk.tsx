import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import {
  IconAlertTriangle,
  IconDeviceFloppy,
  IconPencil,
  IconPlus,
  IconRefresh,
  IconTrash,
  IconX,
} from '@tabler/icons-react'
import { CATEGORY_LABELS } from '../data/products'
import { formatIDR } from '../lib/format'
import { productDraftSchema } from '../lib/validation'
import {
  createProductFn,
  deleteProductFn,
  listProductsFn,
  restockProductFn,
  seedProductsFn,
  updateProductFn,
} from '../lib/data.functions'
import { useProducts } from '../lib/useServerData'
import type { Product, ProductCategory } from '../types'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { SelectField, TextField } from '../components/Field'
import { Button } from '../components/ui/Button'
import { Modal, ModalTitle } from '../components/ui/Modal'
import { SkeletonRows } from '../components/ui/Skeleton'

const EMOJI_CHOICES: Record<ProductCategory, string[]> = {
  makanan: ['🍜', '🍚', '🍗', '🍲', '🥖', '🍛', '🥘', '🍕'],
  minuman: ['🧋', '☕', '💧', '🥑', '🥛', '🧃', '🍵', '🥤'],
  snack: ['🍟', '🍪', '🍥', '🥔', '🍫', '🥨', '🍿', '🍬'],
}

interface DraftState {
  id: string | null
  name: string
  price: string
  /** Purchase price (HPP). */
  cost: string
  category: ProductCategory
  emoji: string
  /** Empty string means "not stock-tracked". */
  stock: string
  lowStockThreshold: string
  sku: string
  barcode: string
}

const EMPTY_DRAFT: DraftState = {
  id: null,
  name: '',
  price: '',
  cost: '',
  category: 'makanan',
  emoji: '🍜',
  stock: '',
  lowStockThreshold: '5',
  sku: '',
  barcode: '',
}

function draftFromProduct(product: Product): DraftState {
  return {
    id: product.id,
    name: product.name,
    price: String(product.price),
    cost: product.cost > 0 ? String(product.cost) : '',
    category: product.category,
    emoji: product.emoji,
    stock: product.stock === null ? '' : String(product.stock),
    lowStockThreshold: String(product.lowStockThreshold),
    sku: product.sku ?? '',
    barcode: product.barcode ?? '',
  }
}

function ProductForm({ draft, onChange, onSubmit, onCancel, error, busy }: {
  draft: DraftState
  onChange: (draft: DraftState) => void
  onSubmit: () => void
  onCancel: () => void
  error?: string | null
  busy?: boolean
}) {
  const editing = draft.id !== null
  const priceNumber = Number(draft.price)
  // Whole rupiah only; the disabled button is the single source of truth so the
  // browser never silently blocks submit with a native validation bubble.
  const priceValid = draft.price !== '' && Number.isInteger(priceNumber) && priceNumber > 0
  const nameValid = draft.name.trim() !== ''
  const stockNumber = Number(draft.stock)
  const stockValid = draft.stock === '' || (Number.isInteger(stockNumber) && stockNumber >= 0)

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
      className="mb-5 rounded-2xl border border-border-subtle bg-surface p-4 shadow-level1"
    >
      {error && (
        <p
          role="alert"
          data-testid="product-form-error"
          className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem_9rem]">
        <TextField
          id="product-name"
          label={editing ? 'Edit Produk' : 'Produk Baru'}
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
          placeholder="Contoh: Es Jeruk"
          autoComplete="off"
        />
        <TextField
          id="product-price"
          label="Harga"
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          value={draft.price}
          onChange={(e) => onChange({ ...draft, price: e.target.value })}
          placeholder="10000"
        />
        <SelectField
          id="product-category"
          label="Kategori"
          value={draft.category}
          onChange={(e) => onChange({ ...draft, category: e.target.value as ProductCategory, emoji: EMOJI_CHOICES[e.target.value as ProductCategory][0] })}
        >
          {(Object.keys(CATEGORY_LABELS) as ProductCategory[]).map((category) => (
            <option key={category} value={category}>
              {CATEGORY_LABELS[category]}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <TextField
          id="product-cost"
          label="Modal"
          hint="harga beli"
          type="number"
          min={0}
          step={100}
          inputMode="numeric"
          value={draft.cost}
          onChange={(e) => onChange({ ...draft, cost: e.target.value })}
          placeholder="0"
        />
        <TextField
          id="product-stock"
          label="Stok"
          hint="kosongkan = tidak dilacak"
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          value={draft.stock}
          onChange={(e) => onChange({ ...draft, stock: e.target.value })}
          placeholder="∞"
        />
        <TextField
          id="product-threshold"
          label="Batas Menipis"
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          value={draft.lowStockThreshold}
          onChange={(e) => onChange({ ...draft, lowStockThreshold: e.target.value })}
          placeholder="5"
        />
        <TextField
          id="product-sku"
          label="SKU"
          value={draft.sku}
          onChange={(e) => onChange({ ...draft, sku: e.target.value })}
          placeholder="MKN-006"
          autoComplete="off"
        />
        <TextField
          id="product-barcode"
          label="Barcode"
          value={draft.barcode}
          onChange={(e) => onChange({ ...draft, barcode: e.target.value })}
          placeholder="899…"
          autoComplete="off"
        />
      </div>

      <div className="mt-3">
        <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Ikon</span>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {EMOJI_CHOICES[draft.category].map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onChange({ ...draft, emoji })}
              className={`grid size-10 place-items-center rounded-lg border-2 text-lg transition-colors ${
                draft.emoji === emoji
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
              aria-pressed={draft.emoji === emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" busy={busy} disabled={!nameValid || !priceValid || !stockValid}>
          <IconDeviceFloppy size={16} />
          {editing ? 'Simpan Perubahan' : 'Tambah Produk'}
        </Button>
        {editing && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <IconX size={16} />
            Batal
          </button>
        )}
        {editing && priceValid && (
          <span className="tabular text-xs text-slate-500">Harga baru: {formatIDR(priceNumber)}</span>
        )}
      </div>
    </form>
  )
}

/** Validated search params: the category filter is shareable and refresh-safe. */
const productSearchSchema = z.object({
  kategori: z.enum(['semua', 'makanan', 'minuman', 'snack']).optional().catch(undefined),
  menipis: z.boolean().optional().catch(undefined),
})

export const Route = createFileRoute('/produk')({
  component: ProductsPage,
  validateSearch: productSearchSchema,
  // The catalog now lives in the database, so the list is fetched on the server.
  loader: async () => ({ products: await listProductsFn() }),
})

function ProductsPage() {
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT)
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const { kategori, menipis } = Route.useSearch()
  const filter = kategori ?? 'semua'
  const navigate = useNavigate({ from: Route.fullPath })

  const { data: products, loading, reload } = useProducts()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function resetCatalog() {
    await Promise.all(products.map((product) => deleteProductFn({ data: { id: product.id } })))
    await seedProductsFn()
    reload()
  }

  const lowStock = products.filter((p) => p.stock !== null && p.stock <= p.lowStockThreshold)
  const visible = products
    .filter((p) => filter === 'semua' || p.category === filter)
    .filter((p) => !menipis || (p.stock !== null && p.stock <= p.lowStockThreshold))

  function submit() {
    const parsed = productDraftSchema.safeParse(draft)
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Periksa kembali isian produk.')
      return
    }
    setFormError(null)
    setSaving(true)

    const mutation = draft.id
      ? updateProductFn({ data: { id: draft.id, draft } })
      : createProductFn({ data: draft })
    void mutation
      .then(() => {
        setDraft(EMPTY_DRAFT)
        reload()
      })
      .catch((cause: unknown) => {
        setFormError(cause instanceof Error ? cause.message : 'Gagal menyimpan produk')
      })
      .finally(() => setSaving(false))
  }

  return (
    <div>
      <PageHeader
        title="Kelola Produk"
        subtitle="Tambah, ubah, atau hapus produk yang dijual"
        action={
          <button
            onClick={() => {
              if (confirm('Kembalikan produk ke daftar awal? Perubahan produk akan hilang.')) {
                void resetCatalog()
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <IconRefresh size={16} />
            Reset
          </button>
        }
      />

      {lowStock.length > 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <IconAlertTriangle size={18} stroke={2} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">{lowStock.length} produk perlu restock</p>
            <p className="mt-0.5">
              {lowStock.map((p) => `${p.name} (${p.stock})`).join(', ')}
            </p>
          </div>
        </div>
      )}

      <ProductForm
        draft={draft}
        onChange={(next) => {
          setDraft(next)
          setFormError(null)
        }}
        onSubmit={submit}
        onCancel={() => {
          setDraft(EMPTY_DRAFT)
          setFormError(null)
        }}
        error={formError}
        busy={saving}
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(['semua', ...(Object.keys(CATEGORY_LABELS) as ProductCategory[])] as const).map((value) => (
          <button
            key={value}
            onClick={() => navigate({ search: (prev) => ({ ...prev, kategori: value }), replace: true })}
            className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
              filter === value
                ? 'bg-slate-900 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {value === 'semua' ? 'Semua' : CATEGORY_LABELS[value]}
          </button>
        ))}
        <button
          onClick={() => navigate({ search: (prev) => ({ ...prev, menipis: menipis ? undefined : true }), replace: true })}
          aria-pressed={menipis === true}
          className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
            menipis
              ? 'bg-warning text-on-warning'
              : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          Stok menipis
        </button>
      </div>

      {loading && products.length === 0 ? (
        <SkeletonRows count={6} />
      ) : visible.length === 0 ? (
        <EmptyState
          emoji="📦"
          title={menipis ? 'Tidak ada stok menipis' : 'Belum ada produk'}
          description={
            menipis
              ? 'Semua produk terlacak masih di atas batas menipis.'
              : 'Tambahkan produk pertama lewat form di atas.'
          }
        />
      ) : (
        <ul className="space-y-2">
          {visible.map((product) => {
            const isLow = product.stock !== null && product.stock <= product.lowStockThreshold
            return (
              <li
                key={product.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-border-subtle bg-surface p-3 shadow-sm"
              >
                <span className="text-2xl" aria-hidden>
                  {product.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{product.name}</p>
                  <p className="text-xs text-slate-500">
                    {CATEGORY_LABELS[product.category]}
                    {product.sku && <span className="tabular"> · {product.sku}</span>}
                  </p>
                  <p className="tabular text-xs font-semibold text-brand-600 sm:hidden">{formatIDR(product.price)}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    data-testid={`stock-${product.id}`}
                    className={`tabular rounded-full px-2.5 py-1 text-xs font-semibold ${
                      product.stock === null
                        ? 'bg-slate-100 text-slate-500'
                        : isLow
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-brand-50 text-brand-700'
                    }`}
                  >
                    {product.stock === null ? '∞' : `${product.stock} pcs`}
                  </span>
                  {product.stock !== null && (
                    <button
                      onClick={() => {
                        void restockProductFn({ data: { id: product.id, delta: 10 } }).then(reload)
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      aria-label={`Tambah stok ${product.name} 10`}
                    >
                      <IconPlus size={12} stroke={2.5} />
                      10
                    </button>
                  )}
                </div>

                <span className="tabular hidden text-sm font-bold text-brand-600 sm:block">{formatIDR(product.price)}</span>
                <button
                  onClick={() => setDraft(draftFromProduct(product))}
                  className="grid size-10 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  aria-label={`Edit ${product.name}`}
                >
                  <IconPencil size={16} />
                </button>
                <button
                  onClick={() => setPendingDelete(product)}
                  className="grid size-10 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600"
                  aria-label={`Hapus ${product.name}`}
                >
                  <IconTrash size={16} />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {pendingDelete && (
        <Modal onClose={() => setPendingDelete(null)}>
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-red-100 text-red-600">
              <IconAlertTriangle size={20} />
            </span>
            <div>
              <ModalTitle>Hapus produk?</ModalTitle>
              <p className="mt-1 text-sm text-slate-600">
                <span className="font-medium">{pendingDelete.name}</span> ({formatIDR(pendingDelete.price)})
                akan dihapus dari daftar produk. Riwayat penjualan lama tidak berubah.
              </p>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPendingDelete(null)}>
              Batal
            </Button>
            <Button
              variant="danger"
              size="sm"
              busy={deleting}
              onClick={() => {
                setDeleting(true)
                void deleteProductFn({ data: { id: pendingDelete.id } })
                  .then(() => {
                    if (draft.id === pendingDelete.id) setDraft(EMPTY_DRAFT)
                    setPendingDelete(null)
                    reload()
                  })
                  .finally(() => setDeleting(false))
              }}
            >
              Hapus
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
