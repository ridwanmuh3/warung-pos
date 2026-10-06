import type { HTMLAttributes } from 'react'

/**
 * Wise card: 30px radius, ring elevation (level1), subtle border.
 * The style owns the radius dimension — 30px, not the generic 12–16px.
 */
export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-border-subtle bg-surface text-ink shadow-level1 ${className}`}
      {...props}
    />
  )
}

export function CardHeader({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`border-b border-divider px-6 py-4 ${className}`}
      {...props}
    />
  )
}

export function CardBody({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-6 ${className}`} {...props} />
}

export function CardFooter({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`border-t border-divider px-6 py-4 ${className}`}
      {...props}
    />
  )
}
