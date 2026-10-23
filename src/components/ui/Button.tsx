import type { ButtonHTMLAttributes } from 'react'
import { Spinner } from './Spinner'
import { buttonStyles, type ButtonJustify, type ButtonSize, type ButtonVariant } from './buttonStyles'

/**
 * Wise button: pill shape, 2px border, paired on-fill text tokens.
 * Primary is the signature green-on-green: lime fill, dark-green label.
 * `busy` swaps the label for a spinner without changing the button's size.
 */
const BUSY_TONES: Record<ButtonVariant, 'ink' | 'onPrimary' | 'onDark'> = {
  primary: 'onPrimary',
  secondary: 'ink',
  dark: 'onDark',
  ghost: 'ink',
  danger: 'onDark',
  'danger-outline': 'ink',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  justify?: ButtonJustify
  /** Shows a spinner and blocks further clicks; the label keeps its space. */
  busy?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  justify = 'center',
  busy = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonStyles({ variant, size, justify, className })}
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
