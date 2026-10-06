import type { HTMLAttributes } from 'react'

/**
 * Wise skeleton: bone block with a shimmer sweep. Geometry must match the
 * content it stands in for, so nothing shifts when real data lands.
 */
export function Skeleton({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={`relative overflow-hidden rounded-sm bg-surface-bone after:absolute after:inset-0 after:animate-shimmer after:bg-gradient-to-r after:from-transparent after:via-white/70 after:to-transparent ${className}`}
      {...props}
    />
  )
}

/** Product-card-shaped placeholders for the Kasir grid. */
export function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-36 rounded-2xl" />
      ))}
    </div>
  )
}

/** List/table row placeholders matching standard row height. */
export function SkeletonRows({ count = 5, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-14 rounded-md" />
      ))}
    </div>
  )
}

/**
 * Big-number stat card placeholders for reports.
 *
 * Geometry matches the real card grid (`grid-cols-2 gap-3 lg:grid-cols-4`) and
 * card height (label + 3xl value + hint ≈ 100px), so the numbers land in the
 * same boxes the bones occupy and nothing jumps on the first paint.
 */
export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-[6.25rem] rounded-2xl" />
      ))}
    </div>
  )
}
