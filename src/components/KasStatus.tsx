import { useState } from 'react'
import { IconAlertTriangle, IconLock, IconLockOpen } from '@tabler/icons-react'
import { SHIFTS_CHANGED_EVENT } from '../lib/events'
import { formatIDR, formatTime } from '../lib/format'
import { useCurrentShift } from '../lib/useServerData'
import { Button } from './ui/Button'
import { Modal, ModalTitle } from './ui/Modal'
import { ShiftPanel } from './ShiftPanel'

/**
 * Cash-drawer status, visible where the cashier actually works.
 *
 * The shift used to live only on the reporting screen, so a cash sale could be
 * rung up (and was) while no drawer was open — that money never reached a
 * reconciliation. This keeps the state one tap away from the till.
 *
 * `compact` is the checkout reminder: it appears only when the drawer is
 * closed, so an ordinary cash sale is not interrupted by a panel it does not
 * need. Warn-and-allow, like oversell: the warning never blocks the sale.
 */
export function KasStatus({ compact = false }: { compact?: boolean }) {
  const { data: open, loading, reload } = useCurrentShift()
  const [dialogOpen, setDialogOpen] = useState(false)

  if (loading) return null

  const closeDialog = () => {
    setDialogOpen(false)
    reload()
    // The setup checklist and other widgets read the shift history separately.
    window.dispatchEvent(new Event(SHIFTS_CHANGED_EVENT))
  }

  if (!open) {
    if (compact) {
      return (
        <>
          <div
            data-testid="cash-closed-warning"
            className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"
          >
            <IconAlertTriangle size={16} stroke={2} className="shrink-0" />
            <span className="min-w-0 flex-1">
              Kas belum dibuka. Uang tunai ini tidak masuk rekonsiliasi kas.
            </span>
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="font-semibold underline underline-offset-2 hover:text-amber-900"
            >
              Buka kas
            </button>
          </div>
          {dialogOpen && (
            <Modal onClose={closeDialog}>
              <ModalTitle>Buka Kas</ModalTitle>
              <p className="mt-1 text-sm text-slate-600">
                Masukkan modal awal di laci. Setelah dibuka, penjualan tunai masuk rekonsiliasi.
              </p>
              <div className="mt-4">
                <ShiftPanel onChanged={reload} />
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="secondary" size="sm" onClick={closeDialog}>
                  Tutup
                </Button>
              </div>
            </Modal>
          )}
        </>
      )
    }

    return (
      <>
        <div
          data-testid="kas-status"
          className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700">
            <IconLockOpen size={18} stroke={2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">Kas belum dibuka</p>
            <p className="text-xs text-slate-600">
              Penjualan tunai belum masuk rekonsiliasi sampai laci dibuka.
            </p>
          </div>
          <Button size="sm" variant="dark" onClick={() => setDialogOpen(true)} data-testid="kas-open-button">
            Buka Kas
          </Button>
        </div>

        {dialogOpen && (
          <Modal onClose={closeDialog}>
            <ModalTitle>Kas</ModalTitle>
            <p className="mt-1 text-sm text-slate-600">
              Buka laci dengan modal awal, atau tutup dengan hitungan fisik.
            </p>
            <div className="mt-4">
              <ShiftPanel onChanged={reload} />
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="secondary" size="sm" onClick={closeDialog}>
                Tutup
              </Button>
            </div>
          </Modal>
        )}
      </>
    )
  }

  if (compact) return null

  return (
    <>
      <div
        data-testid="kas-status"
        className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-divider bg-surface px-4 py-3 shadow-level1"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-subtle text-brand-700">
          <IconLock size={18} stroke={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">
            Kas terbuka <span className="font-normal text-slate-500">· sejak {formatTime(open.openedAt)}</span>
          </p>
          <p className="tabular text-xs text-slate-500">Modal awal {formatIDR(open.openingCash)}</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setDialogOpen(true)}
          data-testid="kas-close-button"
        >
          Tutup Kas
        </Button>
      </div>

      {dialogOpen && (
        <Modal onClose={closeDialog}>
          <ModalTitle>Tutup Kas</ModalTitle>
          <p className="mt-1 text-sm text-slate-600">
            Hitung uang fisik di laci. Selisih terhadap kas seharusnya akan tercatat.
          </p>
          <div className="mt-4">
            <ShiftPanel onChanged={reload} />
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="secondary" size="sm" onClick={closeDialog}>
              Tutup
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}
