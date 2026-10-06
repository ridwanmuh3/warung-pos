import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { IconAlertTriangle, IconArrowBackUp, IconDatabaseImport } from '@tabler/icons-react'
import { Button } from '../components/ui/Button'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { clearLegacyStorage, readLegacySnapshot } from '../lib/legacy'
import type { LegacySnapshot } from '../lib/legacy'
import { importLegacyFn, undoImportFn } from '../lib/migration.functions'
import type { ImportBatchResult } from '../lib/data.server'

export const Route = createFileRoute('/pulihkan')({
  component: RestorePage,
  // localStorage only exists in the browser.
  ssr: false,
})

function RestorePage() {
  const navigate = useNavigate()
  const [snapshot, setSnapshot] = useState<LegacySnapshot | null>(null)
  const [result, setResult] = useState<ImportBatchResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function refresh() {
    setSnapshot(readLegacySnapshot())
  }

  useEffect(() => {
    refresh()
  }, [])

  async function runImport() {
    if (!snapshot) return
    setBusy(true)
    setError(null)
    try {
      const outcome = await importLegacyFn({
        data: {
          products: snapshot.products,
          orders: snapshot.orders,
          shifts: snapshot.shifts,
          stockMovements: snapshot.stockMovements,
          orderNumberCounter: snapshot.orderNumberCounter,
        },
      })
      setResult(outcome)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impor gagal')
    } finally {
      setBusy(false)
    }
  }

  async function runUndo() {
    if (!result) return
    setBusy(true)
    setError(null)
    try {
      await undoImportFn({ data: { batchId: result.batchId } })
      setResult(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Pembatalan gagal')
    } finally {
      setBusy(false)
    }
  }

  function finish() {
    clearLegacyStorage()
    void navigate({ to: '/' })
  }

  if (!snapshot) {
    return (
      <div>
        <PageHeader title="Pulihkan Data" />
        <p className="py-8 text-center text-sm text-slate-500">Memeriksa data lama…</p>
      </div>
    )
  }

  if (!snapshot.present) {
    return (
      <div>
        <PageHeader title="Pulihkan Data" />
        <EmptyState
          emoji="✅"
          title="Tidak ada data lama"
          description="Tidak ditemukan data dari versi sebelumnya di perangkat ini."
        />
      </div>
    )
  }

  const { counts, skipped } = snapshot

  return (
    <div>
      <PageHeader
        title="Pulihkan Data"
        subtitle="Data dari versi sebelumnya di perangkat ini bisa dipindahkan ke akun ini"
        backTo="/"
        backLabel="Kembali ke kasir"
      />

      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="rounded-2xl border border-border-subtle bg-surface p-4 shadow-level1">
        <h2 className="text-sm font-semibold text-slate-900">Data ditemukan</h2>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          {[
            ['Produk', counts.products],
            ['Pesanan', counts.orders],
            ['Shift kas', counts.shifts],
            ['Mutasi stok', counts.stockMovements],
            ['Item keranjang', counts.cartItems],
            ['Akun lama', counts.users],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-lg bg-slate-50 p-2.5">
              <dt className="text-xs text-slate-500">{label}</dt>
              <dd className="tabular text-lg font-bold text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>
        {skipped > 0 && (
          <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
            <IconAlertTriangle size={16} stroke={2} className="mt-0.5 shrink-0" />
            {skipped} baris tidak lolos validasi dan akan dilewati, bukan menggagalkan impor.
          </p>
        )}
        <p className="mt-2 text-xs text-slate-500">
          Akun lama tidak dibuat ulang; data menjadi milik akun yang sedang masuk. Kata sandi tidak
          diubah.
        </p>
      </section>

      {result && (
        <section
          data-testid="import-summary"
          className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-900"
        >
          <h2 className="font-semibold">Impor selesai</h2>
          <ul className="mt-2 space-y-0.5">
            <li>{result.products} produk ditambahkan</li>
            <li>{result.orders} pesanan ditambahkan</li>
            <li>{result.shifts} shift ditambahkan</li>
            <li>{result.stockMovements} mutasi stok ditambahkan</li>
          </ul>
          <p className="mt-2 text-xs text-brand-800">
            Baris yang sudah ada dilewati, jadi menjalankan impor dua kali tidak menggandakan data.
          </p>
        </section>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {!result ? (
          <Button onClick={() => void runImport()} busy={busy} data-testid="import-run" size="sm">
            <IconDatabaseImport size={16} />
            Impor ke Akun Ini
          </Button>
        ) : (
          <>
            <Button onClick={finish} data-testid="import-finish" size="sm">
              Selesai
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void runUndo()}
              busy={busy}
              data-testid="import-undo"
            >
              <IconArrowBackUp size={16} />
              Batalkan Impor
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
