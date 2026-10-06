import { IconAlertTriangle } from '@tabler/icons-react'
import { Button } from './ui/Button'

/**
 * Load-failure state for a data-backed surface.
 *
 * Distinct from `EmptyState` on purpose: "no transactions yet" and "we could not
 * load your transactions" look different and say different things. Rendering the
 * empty state on a failed request tells the owner their day was empty when the
 * network, not the shop, was down.
 *
 * The recovery action is always offered, and the message names the problem.
 */
export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel = 'Coba lagi',
}: {
  title: string
  description: string
  onRetry?: () => void
  retryLabel?: string
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-xl border border-dashed border-danger/40 bg-white px-6 py-14 text-center"
    >
      <span className="grid size-12 place-items-center rounded-full bg-danger/6 text-danger" aria-hidden>
        <IconAlertTriangle size={26} stroke={2} />
      </span>
      <h2 className="mt-3 font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      {onRetry && (
        <div className="mt-5">
          <Button size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      )}
    </div>
  )
}
