import type { ReactNode } from 'react'
import type { TablerIcon } from '@tabler/icons-react'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: TablerIcon
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <span
        className="grid size-14 place-items-center rounded-full bg-primary-subtle text-brand-700"
        aria-hidden
      >
        <Icon size={28} stroke={1.75} />
      </span>
      <h2 className="mt-3 font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
