import { useState } from 'react'
import {
  IconAlertTriangle,
  IconDeviceFloppy,
  IconPencil,
  IconRefresh,
  IconTrash,
  IconX,
} from '@tabler/icons-react'
import { CATEGORY_LABELS } from '../data/products'
import { formatIDR } from '../lib/format'
import { addProduct, deleteProduct, resetProducts, updateProduct } from '../lib/products'
import { useProducts } from '../lib/useProducts'
import type { Product, ProductCategory } from '../types'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { SelectField, TextField } from '../components/Field'

const EMOJI_CHOICES: Record<ProductCategory, string[]> = {
  makanan: ['🍜', '🍚', '🍗', '🍲', '🥖', '🍛', '🥘', '🍕'],
  minuman: ['🧋', '☕', '💧', '🥑', '🥛', '🧃', '🍵', '🥤'],
  snack: ['🍟', '🍪', '🍥', '🥔', '🍫', '🥨', '🍿', '🍬'],
}

interface DraftState {
  id: string | null
  name: string
  price: string
  category: ProductCategory
  emoji: string
}

const EMPTY_DRAFT: DraftState = { id: null, name: '', price: '', category: 'makanan', emoji: '🍜' }

function ProductForm({ draft, onChange, onSubmit, onCancel }: {
  draft: DraftState
  onChange: (draft: DraftState) => void
  onSubmit: () => void
  onCancel: () => void
}) {
  const editing = draft.id !== null
  const priceNumber = Number(draft.price)
  // Whole rupiah only; the disabled button is the single source of truth so the
  // browser never silently blocks submit with a native validation bubble.
  const priceValid = draft.price !== '' && Number.isInteger(priceNumber) && priceNumber > 0
  const nameValid = draft.name.trim() !== ''

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
      className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
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

      <div className="mt-4 flex items-center gap-2">
        <button
          type="submit"
          disabled={!nameValid || !priceValid}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          <IconDeviceFloppy size={16} />
          {editing ? 'Simpan Perubahan' : 'Tambah Produk'}
        </button>
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

export function ProductsPage() {
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT)
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null)
  const [filter, setFilter] = useState<ProductCategory | 'semua'>('semua')

  const products = useProducts()

  const visible = filter === 'semua' ? products : products.filter((p) => p.category === filter)

  function submit() {
    const price = Number(draft.price)
    if (!draft.name.trim() || !Number.isInteger(price) || price <= 0) return

    if (draft.id) {
      updateProduct(draft.id, { name: draft.name.trim(), price, category: draft.category, emoji: draft.emoji })
    } else {
      addProduct({ name: draft.name.trim(), price, category: draft.category, emoji: draft.emoji })
    }
    setDraft(EMPTY_DRAFT)
  }

  return (
    <div>
      <PageHeader
        title="Kelola Produk"
        subtitle="Tambah, ubah, atau hapus produk yang dijual"
        action={
          <button
            onClick={() => {
              if (confirm('Kembalikan produk ke daftar awal? Perubahan produk akan hilang.')) resetProducts()
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <IconRefresh size={16} />
            Reset
          </button>
        }
      />

      <ProductForm
        draft={draft}
        onChange={setDraft}
        onSubmit={submit}
        onCancel={() => setDraft(EMPTY_DRAFT)}
      />

      <div className="mb-3 flex flex-wrap gap-2">
        {(['semua', ...(Object.keys(CATEGORY_LABELS) as ProductCategory[])] as const).map((value) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
              filter === value
                ? 'bg-slate-900 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {value === 'semua' ? 'Semua' : CATEGORY_LABELS[value]}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          emoji="📦"
          title="Belum ada produk"
          description="Tambahkan produk pertama lewat form di atas."
        />
      ) : (
        <ul className="space-y-2">
          {visible.map((product) => (
            <li
              key={product.id}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
            >
              <span className="text-2xl" aria-hidden>
                {product.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{product.name}</p>
                <p className="text-xs text-slate-500">{CATEGORY_LABELS[product.category]}</p>
                <p className="tabular text-xs font-semibold text-brand-600 sm:hidden">{formatIDR(product.price)}</p>
              </div>
              <span className="tabular hidden text-sm font-bold text-brand-600 sm:block">{formatIDR(product.price)}</span>
              <button
                onClick={() => setDraft({ id: product.id, name: product.name, price: String(product.price), category: product.category, emoji: product.emoji })}
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
          ))}
        </ul>
      )}

      {pendingDelete && (
        <div className="no-print fixed inset-0 z-40 grid place-items-center bg-slate-900/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-red-100 text-red-600">
                <IconAlertTriangle size={20} />
              </span>
              <div>
                <h2 className="font-semibold text-slate-900">Hapus produk?</h2>
                <p className="mt-1 text-sm text-slate-600">
                  <span className="font-medium">{pendingDelete.name}</span> ({formatIDR(pendingDelete.price)})
                  akan dihapus dari daftar produk.
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setPendingDelete(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  deleteProduct(pendingDelete.id)
                  if (draft.id === pendingDelete.id) setDraft(EMPTY_DRAFT)
                  setPendingDelete(null)
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}