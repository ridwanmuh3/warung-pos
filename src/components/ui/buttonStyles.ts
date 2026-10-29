/**
 * Shared button vocabulary. Kept outside the component file so links can use
 * the exact same geometry as `<Button>` without duplicating Tailwind classes.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'dark' | 'ghost' | 'danger' | 'danger-outline'
export type ButtonSize = 'sm' | 'md' | 'lg'
export type ButtonJustify = 'center' | 'start' | 'end' | 'between'

export const BUTTON_BASE =
  'relative inline-flex items-center gap-2 whitespace-nowrap rounded-full border-2 font-semibold leading-none transition duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50'

const JUSTIFY: Record<ButtonJustify, string> = {
  center: 'justify-center',
  start: 'justify-start',
  end: 'justify-end',
  between: 'justify-between',
}

export const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'border-primary bg-primary text-on-primary hover:bg-primary-hover hover:scale-105 active:bg-primary-active active:scale-95 disabled:bg-primary-muted disabled:text-mute',
  secondary: 'border-border bg-transparent text-ink hover:bg-surface-muted',
  dark: 'border-ink bg-ink text-white hover:bg-secondary-hover',
  ghost: 'border-transparent bg-transparent text-ink hover:bg-surface-muted',
  danger: 'border-danger bg-danger text-on-danger hover:bg-danger-hover active:bg-danger-active',
  'danger-outline':
    'border-danger/40 bg-transparent text-danger hover:bg-danger/5 active:bg-danger/10',
}

/**
 * One three-step scale for every primary/secondary surface. `sm` is for dense
 * chrome (toolbars, headers, dialog footers), `md` is the default for form
 * submits and page actions, and `lg` is reserved for the main checkout CTA.
 * Variants only change colour; box metrics stay identical so paired buttons
 * always line up.
 */
export const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-11 px-4 text-sm',
  md: 'h-11 px-6 text-base',
  lg: 'h-14 px-8 text-lg',
}

export interface ButtonStyleOptions {
  variant?: ButtonVariant
  size?: ButtonSize
  justify?: ButtonJustify
  className?: string
}

/** Shared classes for real buttons and links that must look like buttons. */
export function buttonStyles({
  variant = 'primary',
  size = 'md',
  justify = 'center',
  className = '',
}: ButtonStyleOptions = {}) {
  return `${BUTTON_BASE} ${JUSTIFY[justify]} ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${className}`.trim()
}
