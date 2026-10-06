import type { ButtonHTMLAttributes } from 'react'
import { Spinner } from './Spinner'

/**
 * Wise button: pill shape, 2px border, paired on-fill text tokens.
 * Primary is the signature green-on-green: lime fill, dark-green label.
 * `busy` swaps the label for a spinner without changing the button's size.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'dark' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const BASE =
  'relative inline-flex items-center justify-center gap-2 rounded-full border-2 font-semibold leading-none transition duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50'

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'border-primary bg-primary text-on-primary hover:bg-primary-hover hover:scale-105 active:bg-primary-active active:scale-95 disabled:bg-primary-muted disabled:text-mute',
  secondary: 'border-border bg-transparent text-ink hover:bg-surface-muted',
  dark: 'border-ink bg-ink text-white hover:bg-secondary-hover',
  ghost: 'border-transparent bg-transparent text-ink hover:bg-surface-muted',
  danger: 'border-danger bg-danger text-on-danger hover:bg-danger-hover active:bg-danger-active',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-base',
  md: 'h-11 px-6 text-lg',
  lg: 'h-14 px-8 text-lg',
}

const BUSY_TONES: Record<ButtonVariant, 'ink' | 'onPrimary' | 'onDark'> = {
  primary: 'onPrimary',
  secondary: 'ink',
  dark: 'onDark',
  ghost: 'ink',
  danger: 'onDark',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Shows a spinner and blocks further clicks; the label keeps its space. */
  busy?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  busy = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      disabled={disabled || busy}
      aria-busy={busy}
      {...props}
    >
      <span className={`inline-flex items-center gap-2 ${busy ? 'invisible' : ''}`}>{children}</span>
      {busy && (
        <span className="absolute inset-0 grid place-items-center">
          <Spinner size="sm" tone={BUSY_TONES[variant]} />
        </span>
      )}
    </button>
  )
}
