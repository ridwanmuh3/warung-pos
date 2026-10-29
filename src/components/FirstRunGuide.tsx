import { useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { IconBook, IconX } from '@tabler/icons-react'
import { QUICK_START } from '../data/guide'
import { markGuideSeen } from '../lib/onboarding'
import { Button } from './ui/Button'
import { buttonStyles } from './ui/buttonStyles'

/**
 * One-time welcome sheet for invited cashiers and managers.
 *
 * Owners get the setup checklist on first run instead, because their first job
 * is adding real products. The sheet is deliberately short and dismissible;
 * `AppShell` opens it once per user per device, and the account menu can reopen
 * it at any time without touching the stored "seen" flag.
 */
export function FirstRunGuide({
  open,
  userId,
  onClose,
}: {
  open: boolean
  userId: string
  onClose: () => void
}) {
  useEffect(() => {
    if (!open) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  function dismiss() {
    markGuideSeen(userId)
    onClose()
  }

  return (
    <div
      className="no-print fixed inset-0 z-[300] flex items-end justify-center bg-overlay sm:items-center sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) dismiss()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="first-run-title"
        className="w-full max-w-md rounded-t-3xl bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-ink shadow-level3 sm:rounded-3xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
            Panduan singkat
          </p>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Tutup panduan"
            className="grid size-11 shrink-0 place-items-center rounded-full text-slate-500 transition-colors hover:bg-surface-muted hover:text-ink"
          >
            <IconX size={18} stroke={2.5} />
          </button>
        </div>

        <h2 id="first-run-title" className="mt-1 font-display text-2xl font-black leading-tight">
          Mulai jualan
        </h2>
        <p className="mt-1 text-base text-body">
          Tiga langkah ini yang akan Anda pakai setiap hari.
        </p>

        <ol className="mt-4 space-y-3">
          {QUICK_START.map((step, index) => (
            <li key={step.title} className="flex items-start gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-on-primary">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-base font-semibold text-ink">{step.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-5 flex flex-col gap-2">
          <Button size="md" className="w-full" onClick={dismiss} autoFocus>
            Mengerti
          </Button>
          <Link
            to="/panduan"
            onClick={dismiss}
            className={buttonStyles({ variant: 'secondary', size: 'md', className: 'w-full' })}
          >
            <IconBook size={18} stroke={2} />
            Buka panduan lengkap
          </Link>
        </div>
      </div>
    </div>
  )
}
