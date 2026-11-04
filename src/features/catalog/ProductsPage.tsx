import { useState } from 'react'
import { Link, getRouteApi, useNavigate } from '@tanstack/react-router'
import {
  IconAlertTriangle,
  IconDeviceFloppy,
  IconPackage,
  IconPencil,
  IconPlus,
  IconTrash,
  IconUpload,
  IconX,
} from '@tabler/icons-react'
import { CATEGORY_LABELS } from '~/data/products'
import { formatIDR } from '~/lib/format'
import { MAX_IMAGE_BYTES, productDraftSchema } from '~/lib/validation'
import {
  createProductFn,
  deleteProductFn,
  getImageUploadUrlFn,
  restockProductFn,
  updateProductFn,
} from './catalog.functions'
import { useProducts } from '~/lib/useServerData'
import { useTenant } from '~/lib/useTenant'
import type { Product, ProductCategory } from '~/types'
import { PageHeader } from '~/components/PageHeader'
import { EmptyState } from '~/components/EmptyState'
import { SelectField, TextField } from '~/components/Field'
import { ProductImage } from '~/components/ProductImage'
import { Button } from '~/components/ui/Button'
import { buttonStyles } from '~/components/ui/buttonStyles'
import { Modal, ModalTitle } from '~/components/ui/Modal'
import { SkeletonRows } from '~/components/ui/Skeleton'

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

interface DraftState {
  id: string | null
  name: string
  price: string
  /** Purchase price (HPP). */
  cost: string
  category: ProductCategory
  /** R2 object key, or null for the placeholder. */
  imageKey: string | null
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
  category: 'food',
  imageKey: null,
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
    imageKey: product.imageKey,
    stock: product.stock === null ? '' : String(product.stock),
    lowStockThreshold: String(product.lowStockThreshold),
    sku: product.sku ?? '',
    barcode: product.barcode ?? '',
  }
}

function ImagePicker({ draft, onChange, onError }: {
  draft: DraftState
  onChange: (draft: DraftState) => void
  onError: (message: string | null) => void
}) {
  const [uploading, setUploading] = useState(false)

  async function upload(file: File) {
    if (!IMAGE_TYPES.has(file.type)) {
      onError('Format gambar harus JPG, PNG, atau WebP')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      onError('Ukuran gambar maksimal 5MB')
      return
    }
    setUploading(true)
    onError(null)
    try {
      const { key, uploadUrl } = await getImageUploadUrlFn({
        data: { contentType: file.type as 'image/jpeg' | 'image/png' | 'image/webp' },
      })
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!response.ok) throw new Error('Gagal mengunggah gambar')
      onChange({ ...draft, imageKey: key })
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : 'Gagal mengunggah gambar')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mt-3">
      <span className="block text-xs font-semibold tracking-wide text-slate-500">Gambar</span>
      <div className="mt-1 flex items-center gap-3">
        <ProductImage imageKey={draft.imageKey} alt={draft.name || 'Produk'} className="size-16" iconSize={24} />
        <label
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 ${uploading ? 'pointer-events-none opacity-50' : ''}`}
        >
          <IconUpload size={16} />
          {uploading ? 'Mengunggah…' : draft.imageKey ? 'Ganti gambar' : 'Unggah gambar'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void upload(file)
              event.target.value = ''
            }}
          />
        </label>
        {draft.imageKey && (
          <button
            type="button"
            onClick={() => onChange({ ...draft, imageKey: null })}
            className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <IconX size={14} />
            Hapus
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-400">JPG, PNG, atau WebP · maksimal 5MB</p>
    </div>
  )
}

function ProductForm({ draft, onChange, onSubmit, onCancel, error, busy, onError }: {
  draft: DraftState
  onChange: (draft: DraftState) => void
  onSubmit: () => void
  onCancel: () => void
  error?: string | null
  busy?: boolean
  onError: (message: string | null) => void
}) {
  const editing = draft.id !== null
  const priceNumber = Number(draft.price)
  // Whole rupiah only; the disabled button is the single source of truth so the
  // browser never silently blocks submit with a native validation bubble.
  const priceValid = draft.price !== '' && Number.isInteger(priceNumber) && priceNumber > 0
  const nameValid = draft.name.trim() !== ''
  const stockNumber = Number(draft.stock)
  const stockValid = draft.stock === '' || (Number.isInteger(stockNumber) && stockNumber >= 0)
  // The four fields that genuinely change the sale. HPP, thresholds, SKU, and
  // barcode stay one tap away instead of forming a nine-field wall.
  const advancedOpen = draft.cost !== '' || draft.sku !== '' || draft.barcode !== ''

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
      className="mt-4"
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
      <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
        <TextField
          id="product-name"
          label="Nama produk"
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
          placeholder="Contoh: Es Jeruk"
          autoComplete="off"
        />
        <TextField
          id="product-price"
          label="Harga jual"
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          value={draft.price}
          onChange={(e) => onChange({ ...draft, price: e.target.value })}
          placeholder="10000"
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <SelectField
          id="product-category"
          label="Kategori"
          value={draft.category}
          onChange={(e) => onChange({ ...draft, category: e.target.value as ProductCategory })}
        >
          {(Object.keys(CATEGORY_LABELS) as ProductCategory[]).map((category) => (
            <option key={category} value={category}>
              {CATEGORY_LABELS[category]}
            </option>
          ))}
        </SelectField>
        <TextField
          id="product-stock"
          label="Stok"
          hint="kosong = tanpa stok"
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          value={draft.stock}
          onChange={(e) => onChange({ ...draft, stock: e.target.value })}
          placeholder="∞"
        />
      </div>

      <ImagePicker draft={draft} onChange={onChange} onError={onError} />

      <details className="mt-3 rounded-lg border border-slate-200 p-3" open={advancedOpen}>
        <summary className="cursor-pointer text-xs font-semibold tracking-wide text-slate-500">
          Opsi lanjutan
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <TextField
            id="product-cost"
            label="Harga beli (HPP)"
            type="number"
            min={0}
            step={100}
            inputMode="numeric"
            value={draft.cost}
            onChange={(e) => onChange({ ...draft, cost: e.target.value })}
            placeholder="0"
          />
          <TextField
            id="product-threshold"
            label="Batas stok menipis"
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
      </details>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" size="sm" busy={busy} disabled={!nameValid || !priceValid || !stockValid}>
          <IconDeviceFloppy size={16} />
          {editing ? 'Simpan Perubahan' : 'Tambah Produk'}
        </Button>
      </div>
    </form>
  )
}

const route = getRouteApi('/products')

export function ProductsPage() {
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT)
  const [formOpen, setFormOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [restockTarget, setRestockTarget] = useState<Product | null>(null)
  const [restockQty, setRestockQty] = useState('10')
  const [restockError, setRestockError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const { category, lowStock } = route.useSearch()
  const filter = category ?? 'all'
  const navigate = useNavigate({ from: '/products' })
  const tenant = useTenant()
  const canManage = tenant.context?.role === 'owner' || tenant.context?.role === 'manager'

  const { data: products, loading, reload } = useProducts()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [restocking, setRestocking] = useState(false)

  const lowStockProducts = products.filter((p) => p.stock !== null && p.stock <= p.lowStockThreshold)
  const visible = products
    .filter((p) => filter === 'all' || p.category === filter)
    .filter((p) => !lowStock || (p.stock !== null && p.stock <= p.lowStockThreshold))

  function openCreate() {
    setDraft(EMPTY_DRAFT)
    setFormError(null)
    setFormOpen(true)
  }

  function openEdit(product: Product) {
    setDraft(draftFromProduct(product))
    setFormError(null)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setDraft(EMPTY_DRAFT)
    setFormError(null)
  }

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
        closeForm()
        reload()
      })
      .catch((cause: unknown) => {
        setFormError(cause instanceof Error ? cause.message : 'Gagal menyimpan produk')
      })
      .finally(() => setSaving(false))
  }

  const restockAmount = Number(restockQty)
  const restockValid = Number.isInteger(restockAmount) && restockAmount > 0

  return (
    <div>
      <PageHeader
        title="Produk"
        subtitle={
          canManage
            ? 'Tambah, ubah, atau atur stok produk yang dijual'
            : 'Daftar produk yang dijual di warung ini'
        }
        action={
          canManage ? (
            <Button size="sm" onClick={openCreate} data-testid="product-add">
              <IconPlus size={16} stroke={2.5} />
              Produk
            </Button>
          ) : undefined
        }
      />

      {!canManage && (
        <p className="mb-4 rounded-lg border border-divider bg-surface-muted px-3 py-2 text-xs text-slate-600">
          Hanya pemilik dan manajer yang bisa mengubah produk. Hubungi mereka bila ada harga atau stok
          yang perlu diperbaiki.
        </p>
      )}

      {lowStockProducts.length > 0 && (
        <div className="mb-4 flex flex-wrap items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <IconAlertTriangle size={18} stroke={2} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{lowStockProducts.length} produk perlu restock</p>
            <p className="mt-0.5 truncate text-xs">
              {lowStockProducts.slice(0, 3).map((p) => `${p.name} (${p.stock})`).join(', ')}
              {lowStockProducts.length > 3 ? `, +${lowStockProducts.length - 3} lainnya` : ''}
            </p>
          </div>
          {!lowStock && (
            <button
              onClick={() => navigate({ search: (prev) => ({ ...prev, lowStock: true }), replace: true })}
              className="text-xs font-semibold underline underline-offset-2 hover:text-amber-900"
            >
              Tampilkan
            </button>
          )}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(['all', ...(Object.keys(CATEGORY_LABELS) as ProductCategory[])] as const).map((value) => (
          <button
            key={value}
            onClick={() => navigate({ search: (prev) => ({ ...prev, category: value }), replace: true })}
            aria-pressed={filter === value}
            className={`flex min-h-11 items-center rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
              filter === value
                ? 'bg-primary text-on-primary'
                : 'border border-divider bg-surface text-body hover:bg-surface-muted'
            }`}
          >
            {value === 'all' ? 'Semua' : CATEGORY_LABELS[value]}
          </button>
        ))}
        <button
          onClick={() => navigate({ search: (prev) => ({ ...prev, lowStock: lowStock ? undefined : true }), replace: true })}
          aria-pressed={lowStock === true}
          className={`flex min-h-11 items-center rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
            lowStock
              ? 'bg-primary text-on-primary'
              : 'border border-divider bg-surface text-body hover:bg-surface-muted'
          }`}
        >
          Stok menipis
        </button>
      </div>

      {loading && products.length === 0 ? (
        <SkeletonRows count={6} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={IconPackage}
          title={lowStock ? 'Tidak ada stok menipis' : 'Belum ada produk'}
          description={
            lowStock
              ? 'Semua produk terlacak masih di atas batas menipis.'
              : canManage
                ? 'Tambahkan produk pertama. Cukup nama dan harga; foto, stok, dan barcode bisa menyusul.'
                : 'Belum ada produk di warung ini. Minta pemilik atau manajer menambahkannya.'
          }
          action={
            lowStock ? undefined : canManage ? (
              <Button size="md" onClick={openCreate} data-testid="product-empty-add">
                <IconPlus size={18} stroke={2.5} />
                Tambah Produk
              </Button>
            ) : (
              <Link
                to="/guide"
                className={buttonStyles({ variant: 'secondary', size: 'md' })}
              >
                Lihat Panduan
              </Link>
            )
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
                <ProductImage imageKey={product.imageKey} alt={product.name} className="size-11" iconSize={20} />
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
                  {canManage && product.stock !== null && (
                    <button
                      onClick={() => {
                        setRestockTarget(product)
                        setRestockQty('10')
                        setRestockError(null)
                      }}
                      className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      aria-label={`Tambah stok ${product.name}`}
                      data-testid={`restock-${product.id}`}
                    >
                      <IconPlus size={12} stroke={2.5} />
                      Stok
                    </button>
                  )}
                </div>

                <span className="tabular hidden text-sm font-bold text-brand-600 sm:block">{formatIDR(product.price)}</span>
                {canManage && (
                  <>
                    <button
                      onClick={() => openEdit(product)}
                      className="grid size-11 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      aria-label={`Edit ${product.name}`}
                    >
                      <IconPencil size={16} />
                    </button>
                    <button
                      onClick={() => {
                        setDeleteError(null)
                        setPendingDelete(product)
                      }}
                      className="grid size-11 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600"
                      aria-label={`Hapus ${product.name}`}
                    >
                      <IconTrash size={16} />
                    </button>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {formOpen && canManage && (
        <Modal onClose={closeForm} className="max-w-lg">
          <ModalTitle>{draft.id ? 'Edit Produk' : 'Produk Baru'}</ModalTitle>
          <p className="mt-1 text-sm text-slate-500">
            {draft.id ? 'Perubahan harga tidak mengubah struk yang sudah tercetak.' : 'Isi yang perlu saja; opsi lain bisa dibuka nanti.'}
          </p>
          <ProductForm
            draft={draft}
            onChange={(next) => {
              setDraft(next)
              setFormError(null)
            }}
            onSubmit={submit}
            onCancel={closeForm}
            error={formError}
            busy={saving}
            onError={setFormError}
          />
        </Modal>
      )}

      {pendingDelete && (
        <Modal
          onClose={() => {
            setPendingDelete(null)
            setDeleteError(null)
          }}
        >
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
          {deleteError && (
            <p role="alert" className="mt-2 text-xs text-red-600">
              {deleteError}
            </p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setPendingDelete(null)
                setDeleteError(null)
              }}
            >
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
                    if (draft.id === pendingDelete.id) closeForm()
                    setPendingDelete(null)
                    reload()
                  })
                  .catch((cause: unknown) => {
                    setDeleteError(cause instanceof Error ? cause.message : 'Gagal menghapus produk')
                  })
                  .finally(() => setDeleting(false))
              }}
            >
              Hapus
            </Button>
          </div>
        </Modal>
      )}

      {restockTarget && (
        <Modal
          onClose={() => {
            setRestockTarget(null)
            setRestockError(null)
          }}
        >
          <ModalTitle>Tambah Stok</ModalTitle>
          <p className="mt-1 text-sm text-slate-600">
            {restockTarget.name} · sekarang{' '}
            <span className="tabular font-semibold text-slate-900">{restockTarget.stock} pcs</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[1, 5, 10, 20].map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setRestockQty(String(amount))}
                aria-pressed={restockQty === String(amount)}
                className={`min-h-11 rounded-full border px-3.5 text-xs font-semibold transition-colors ${
                  restockQty === String(amount)
                    ? 'border-primary bg-primary-subtle text-on-primary'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                +{amount}
              </button>
            ))}
          </div>
          <label htmlFor="restock-qty" className="mt-3 block">
            <span className="text-xs font-semibold tracking-wide text-slate-500">Jumlah masuk</span>
            <input
              id="restock-qty"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={restockQty}
              onChange={(event) => setRestockQty(event.target.value)}
              data-testid="restock-qty"
              className="tabular mt-1 min-h-11 w-full rounded-sm border border-border px-3 py-2 text-right text-lg font-semibold outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgb(22_51_0/0.15)]"
            />
          </label>
          {restockValid && restockTarget.stock !== null && (
            <p className="tabular mt-2 text-right text-xs text-slate-500">
              Stok menjadi {restockTarget.stock + restockAmount} pcs
            </p>
          )}
          {restockError && (
            <p role="alert" className="mt-2 text-xs text-red-600">
              {restockError}
            </p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setRestockTarget(null)}>
              Batal
            </Button>
            <Button
              size="sm"
              busy={restocking}
              disabled={!restockValid}
              data-testid="restock-confirm"
              onClick={() => {
                setRestocking(true)
                void restockProductFn({ data: { id: restockTarget.id, delta: restockAmount } })
                  .then(() => {
                    setRestockTarget(null)
                    reload()
                  })
                  .catch((cause: unknown) => {
                    setRestockError(cause instanceof Error ? cause.message : 'Gagal menambah stok')
                  })
                  .finally(() => setRestocking(false))
              }}
            >
              Tambah Stok
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
