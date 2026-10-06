/**
 * Big-number stat card: the shared shape for Ringkasan and Laporan.
 *
 * Hardened for real report data:
 * - `min-w-0` lets the card shrink inside its grid track instead of forcing the
 *   row wider, so a wide desktop grid and a narrow phone both hold.
 * - A value or hint longer than the card wraps instead of spilling out
 *   (`overflow-wrap: anywhere`), so a nine-digit rupiah total stays readable.
 * - The label, value and hint are a description list, so a screen reader reads
 *   each figure together with its name instead of as loose paragraphs.
 *
 * `tone` colors the figure only, and only where the sign carries meaning.
 */

export type StatTone = 'neutral' | 'positive' | 'warning' | 'danger'

/**
 * The same tokens ShiftPanel and the reconciliation list use for cash variance,
 * so a green/amber/red figure means the same thing everywhere it appears:
 * `positive` (pas), `warning` (lebih — an overage is a discrepancy, not a win),
 * `danger` (kurang / a loss). All three pass 4.5:1 on the card surface.
 */
const TONE_VALUE: Record<StatTone, string> = {
  neutral: 'text-ink',
  positive: 'text-brand-700',
  warning: 'text-amber-700',
  danger: 'text-red-600',
}

export function StatCard({
  testId,
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  testId: string
  label: string
  value: string
  hint?: string
  /** Semantic color for the figure. Defaults to the neutral ink color. */
  tone?: StatTone
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-border-subtle bg-surface p-4 shadow-level1">
      <dl className="min-w-0">
        <dt className="break-words text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </dt>
        <dd
          data-testid={testId}
          className={`tabular mt-1 font-display text-3xl font-black leading-none ${TONE_VALUE[tone]} [overflow-wrap:anywhere]`}
        >
          {value}
        </dd>
        {hint && (
          <dd className="mt-0.5 break-words text-xs text-mute [overflow-wrap:anywhere]">{hint}</dd>
        )}
      </dl>
    </div>
  )
}
