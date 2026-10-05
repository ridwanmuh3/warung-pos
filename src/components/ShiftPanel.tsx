import { useState } from 'react'
import { IconLockOpen, IconLock, IconAlertTriangle } from '@tabler/icons-react'
import { formatDateTime, formatIDR } from '../lib/format'
import { openingCashSchema, shiftCloseSchema } from '../lib/validation'
import { closeShift, currentShift, expectedCashFor, openShift, useShifts } from '../lib/useShifts'
import { useOrders } from '../lib/useOrders'

/**
 * Cash-drawer shift panel: open the drawer with a float, then close it with a
 * physical count. The variance is the difference between counted and expected.
 */
export function ShiftPanel() {
  const shifts = useShifts()
  const orders = useOrders()
  const open = currentShift()

  const [openingCash, setOpeningCash] = useState('')
  const [countedCash, setCountedCash] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const lastClosed = shifts.find((shift) => shift.closedAt !== undefined)

  if (!open) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" data-testid="shift-panel">
        <div className="flex items-center gap-2">
          <IconLockOpen size={18} stroke={2} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-900">Kas Belum Dibuka</h2>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Buka kas dengan modal awal agar penjualan tunai bisa direkonsiliasi saat tutup.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label htmlFor="opening-cash" className="flex-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Modal Awal</span>
            <input
              id="opening-cash"
              type="number"
              min={0}
              step={1000}
              inputMode="numeric"
              value={openingCash}
              onChange={(event) => setOpeningCash(event.target.value)}
              placeholder="100000"
              data-testid="opening-cash"
              className="tabular mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <button
            onClick={() => {
              const parsed = openingCashSchema.safeParse({ openingCash })
              if (!parsed.success) {
                setError(parsed.error.issues[0]?.message ?? 'Modal awal tidak valid')
                return
              }
              setError(null)
              openShift(parsed.data.openingCash)
              setOpeningCash('')
            }}
            data-testid="open-shift"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Buka Kas
          </button>
        </div>
        {error && (
          <p role="alert" data-testid="shift-error" className="mt-2 text-sm text-red-600">
            {error}
          </p>
        )}

        {lastClosed && (
          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-700">Tutup kas terakhir</p>
            <p className="mt-0.5">{formatDateTime(lastClosed.closedAt!)}</p>
            <p className="tabular mt-1">
              Diharapkan {formatIDR(lastClosed.expectedCash ?? 0)} · dihitung{' '}
              {formatIDR(lastClosed.closingCash ?? 0)}
            </p>
            <p
              className={`tabular mt-0.5 font-semibold ${
                (lastClosed.variance ?? 0) === 0
                  ? 'text-brand-700'
                  : (lastClosed.variance ?? 0) > 0
                    ? 'text-amber-700'
                    : 'text-red-600'
              }`}
            >
              Selisih {(lastClosed.variance ?? 0) > 0 ? '+' : ''}
              {formatIDR(lastClosed.variance ?? 0)}
              {(lastClosed.variance ?? 0) === 0 ? ' (pas)' : (lastClosed.variance ?? 0) > 0 ? ' (lebih)' : ' (kurang)'}
            </p>
          </div>
        )}
      </section>
    )
  }

  const expected = expectedCashFor(open, orders)
  const counted = Number(countedCash)
  const varianceValid = countedCash !== '' && Number.isFinite(counted)
  const variance = varianceValid ? Math.round(counted) - expected : 0

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" data-testid="shift-panel">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <IconLock size={18} stroke={2} className="text-brand-600" />
          <h2 className="text-sm font-semibold text-slate-900">Kas Terbuka</h2>
        </div>
        <span className="tabular text-xs text-slate-500">sejak {formatDateTime(open.openedAt)}</span>
      </div>

      <dl className="mt-3 space-y-1 text-sm">
        <div className="flex justify-between text-slate-500">
          <dt>Modal awal</dt>
          <dd className="tabular font-medium text-slate-700">{formatIDR(open.openingCash)}</dd>
        </div>
        <div className="flex justify-between text-slate-500">
          <dt>Kas seharusnya</dt>
          <dd data-testid="expected-cash" className="tabular font-semibold text-slate-900">
            {formatIDR(expected)}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label htmlFor="counted-cash" className="flex-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kas Dihitung</span>
          <input
            id="counted-cash"
            type="number"
            min={0}
            step={1000}
            inputMode="numeric"
            value={countedCash}
            onChange={(event) => setCountedCash(event.target.value)}
            placeholder="0"
            data-testid="counted-cash"
            className="tabular mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </label>
        <label htmlFor="shift-note" className="flex-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Catatan</span>
          <input
            id="shift-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Opsional"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </label>
      </div>

      {varianceValid && (
        <p
          data-testid="shift-variance"
          className={`mt-2 flex items-center gap-1.5 text-sm font-semibold ${
            variance === 0 ? 'text-brand-700' : variance > 0 ? 'text-amber-700' : 'text-red-600'
          }`}
        >
          {variance !== 0 && <IconAlertTriangle size={16} stroke={2} />}
          Selisih {variance > 0 ? '+' : ''}
          {formatIDR(variance)}
          {variance === 0 ? ' (pas)' : variance > 0 ? ' (lebih)' : ' (kurang)'}
        </p>
      )}

      <button
        onClick={() => {
          const parsed = shiftCloseSchema.safeParse({ countedCash, note })
          if (!parsed.success) {
            setError(parsed.error.issues[0]?.message ?? 'Jumlah kas tidak valid')
            return
          }
          setError(null)
          closeShift({ countedCash: parsed.data.countedCash, note: parsed.data.note }, orders)
          setCountedCash('')
          setNote('')
        }}
        disabled={!varianceValid}
        data-testid="close-shift"
        className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
      >
        Tutup Kas
      </button>
      {error && (
        <p role="alert" data-testid="shift-error" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </section>
  )
}
