/**
 * Share-of-total bar: a row's portion of a total as a filled track, with the
 * percentage printed next to it so width is never the only carrier of the
 * number (and a screen reader gets a value, not a colored rectangle).
 *
 * The fill is the data green, not the lime primary: lime sits at 1.3:1 against
 * the track, which makes a small bar effectively invisible, and the primary is
 * reserved for actions and for the one figure that leads a screen.
 *
 * A malformed aggregate degrades to a readable bar instead of an invalid CSS
 * width, so a NaN or an out-of-range share can never break the layout.
 */
export function ShareBar({ share, className = '' }: { share: number; className?: string }) {
  const safe = Number.isFinite(share) ? Math.min(100, Math.max(0, Math.round(share))) : 0

  return (
    <div className={`mt-1 flex items-center gap-2 ${className}`}>
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-data-track" aria-hidden="true">
        <span className="block h-full rounded-full bg-data" style={{ width: `${safe}%` }} />
      </span>
      <span className="tabular w-9 shrink-0 text-right text-xs font-medium text-slate-500">
        {safe}%
      </span>
    </div>
  )
}
