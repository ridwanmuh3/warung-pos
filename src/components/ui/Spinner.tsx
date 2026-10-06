/**
 * Wise spinner: a single arc sweeping a ring. `ink` for light surfaces,
 * `onPrimary` on lime fills, `onDark` on ink/danger fills.
 */
export type SpinnerSize = 'sm' | 'md' | 'lg'
export type SpinnerTone = 'ink' | 'onPrimary' | 'onDark'

const SIZES: Record<SpinnerSize, string> = {
  sm: 'size-4 border-2',
  md: 'size-6 border-2',
  lg: 'size-10 border-[3px]',
}

const TONES: Record<SpinnerTone, string> = {
  ink: 'border-divider border-t-link',
  onPrimary: 'border-on-primary/30 border-t-on-primary',
  onDark: 'border-white/30 border-t-white',
}

export function Spinner({
  size = 'md',
  tone = 'ink',
  label = 'Memuat…',
  className = '',
}: {
  size?: SpinnerSize
  tone?: SpinnerTone
  label?: string
  className?: string
}) {
  return (
    <span role="status" aria-label={label} className={`inline-flex ${className}`}>
      <span className={`animate-spin rounded-full ${SIZES[size]} ${TONES[tone]}`} />
      <span className="sr-only">{label}</span>
    </span>
  )
}
