import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { IconCheck, IconChevronRight, IconX } from '@tabler/icons-react'
import { SHIFTS_CHANGED_EVENT } from '../lib/events'
import { setupProgress } from '../lib/onboarding'
import { useShifts } from '../lib/useServerData'

type SetupLink = '/pengaturan' | '/produk'

const STEP_COPY: Record<'name' | 'product' | 'shift', { title: string; hint: string; link?: SetupLink; action?: string }> = {
  name: {
    title: 'Beri nama warung',
    hint: 'Nama ini tampil di struk dan menu Akun.',
    link: '/pengaturan',
    action: 'Atur',
  },
  product: {
    title: 'Tambah produk pertama',
    hint: 'Cukup nama dan harga; foto serta stok bisa menyusul.',
    link: '/produk',
    action: 'Tambah',
  },
  shift: {
    title: 'Buka kas',
    hint: 'Gunakan tombol Buka Kas di panel kas di bawah.',
  },
}

/**
 * Owner-only checklist shown until the shop can actually take a sale.
 *
 * Progress comes from real data (name, catalog, shift history), never from a
 * local flag, so it disappears on every device as soon as setup is done. It is
 * a card, not a modal: the cashier screen stays usable while the owner works.
 */
export function OwnerSetupChecklist({
  tenantName,
  productCount,
  productsLoading = false,
}: {
  tenantName: string | null | undefined
  productCount: number
  productsLoading?: boolean
}) {
  const { data: shifts, loading: shiftsLoading, reload: reloadShifts } = useShifts()
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const refresh = () => reloadShifts()
    window.addEventListener(SHIFTS_CHANGED_EVENT, refresh)
    return () => window.removeEventListener(SHIFTS_CHANGED_EVENT, refresh)
  }, [reloadShifts])

  // Wait for both lists so the count does not flash "0 dari 3" on a shop that
  // is already set up.
  if (productsLoading || shiftsLoading) return null

  const progress = setupProgress({
    tenantName,
    productCount,
    shiftCount: shifts.length,
  })

  if (hidden || progress.complete) return null

  return (
    <section
      aria-labelledby="setup-checklist-title"
      data-testid="setup-checklist"
      className="mb-4 rounded-2xl border-2 border-primary/50 bg-primary-subtle/50 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p id="setup-checklist-title" className="text-xs font-semibold uppercase tracking-wide text-brand-700">
            Persiapan warung
          </p>
          <p className="mt-0.5 text-sm font-semibold text-ink">
            {progress.doneCount} dari 3 selesai
          </p>
        </div>
        <button
          type="button"
          onClick={() => setHidden(true)}
          aria-label="Sembunyikan checklist"
          className="grid size-9 shrink-0 place-items-center rounded-full text-slate-500 transition-colors hover:bg-white/70 hover:text-ink"
        >
          <IconX size={16} stroke={2.5} />
        </button>
      </div>

      <ol className="mt-2 space-y-0.5">
        {progress.steps.map((step, index) => {
          const copy = STEP_COPY[step.key]
          const content = (
            <>
              <span
                aria-hidden
                className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                  step.done
                    ? 'bg-primary text-on-primary'
                    : 'border-2 border-primary bg-surface text-brand-700'
                }`}
              >
                {step.done ? <IconCheck size={15} stroke={3} /> : index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={`block text-sm font-semibold ${step.done ? 'text-slate-500' : 'text-ink'}`}
                >
                  {copy.title}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-slate-600">
                  {copy.hint}
                </span>
              </span>
              {step.done ? (
                <span className="shrink-0 text-xs font-semibold text-brand-700">Selesai</span>
              ) : (
                copy.action && (
                  <span className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-brand-700">
                    {copy.action}
                    <IconChevronRight size={14} stroke={2.5} />
                  </span>
                )
              )}
            </>
          )

          return (
            <li key={step.key}>
              {copy.link ? (
                <Link
                  to={copy.link}
                  className="flex min-h-12 items-center gap-3 rounded-xl px-1 py-2 transition-colors hover:bg-white/60"
                >
                  {content}
                </Link>
              ) : (
                <div className="flex min-h-12 items-center gap-3 px-1 py-2">{content}</div>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
