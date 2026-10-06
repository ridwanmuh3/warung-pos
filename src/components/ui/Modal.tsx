import type { HTMLAttributes, ReactNode } from 'react'

/**
 * Wise modal: 40px radius, ring + soft elevation, ink overlay.
 * Rendered inline (fixed positioning); the caller controls visibility.
 */
export function Modal({
  children,
  onClose,
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement> & { onClose?: () => void; children: ReactNode }) {
  return (
    <div
      className="no-print fixed inset-0 z-[300] grid place-items-center bg-overlay p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose?.()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`z-[400] flex w-full max-w-sm flex-col rounded-3xl bg-surface p-6 text-ink shadow-level3 ${className}`}
        {...props}
      >
        {children}
      </div>
    </div>
  )
}

export function ModalTitle({ className = '', ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={`font-display text-2xl font-black leading-tight tracking-tight ${className}`}
      {...props}
    />
  )
}
