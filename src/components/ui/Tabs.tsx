import type { ButtonHTMLAttributes, HTMLAttributes } from 'react'

/**
 * Wise tabs: 16px pill track, active tab is lime with dark-green label.
 */
export function TabList({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="tablist"
      className={`flex gap-1 rounded-md border border-divider bg-surface-bone p-1 ${className}`}
      {...props}
    />
  )
}

export interface TabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
}

export function Tab({ active = false, className = '', ...props }: TabProps) {
  return (
    <button
      role="tab"
      aria-selected={active}
      className={`flex h-9 items-center justify-center rounded-md px-4 text-base font-semibold leading-none transition duration-150 ease-out ${
        active ? 'bg-primary text-on-primary' : 'text-body hover:bg-surface-muted hover:text-ink'
      } ${className}`}
      {...props}
    />
  )
}
