import type { HTMLAttributes } from 'react'

/**
 * Wise badge: pill, semantic 6% tint fills with paired text.
 * Note: the spec's info-blue label fails 4.5:1 on white, so warning and
 * info use ink text — accessibility floor overrides the style's choice.
 */
export type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'dark'

const VARIANTS: Record<BadgeVariant, string> = {
  primary: 'bg-primary-subtle text-on-primary',
  success: 'bg-success/6 text-success',
  warning: 'bg-warning/20 text-ink',
  danger: 'bg-danger/6 text-danger',
  info: 'bg-info/15 text-ink',
  dark: 'bg-ink text-white',
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

export function Badge({ variant = 'primary', className = '', ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-sm font-semibold leading-relaxed ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  )
}
