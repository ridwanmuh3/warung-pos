import type { ReactNode } from 'react'

export function EmptyState({
  emoji,
  title,
  description,
  action,
}: {
  emoji: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <span className="text-4xl" aria-hidden>
        {emoji}
      </span>
      <h2 className="mt-3 font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
