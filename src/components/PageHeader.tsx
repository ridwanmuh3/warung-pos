import { Link } from '@tanstack/react-router'
import { IconChevronLeft } from '@tabler/icons-react'
import type { ReactNode } from 'react'

export function PageHeader({
  title,
  subtitle,
  backTo,
  backLabel = 'Kembali',
  action,
}: {
  title: string
  subtitle?: string
  backTo?: string
  backLabel?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div>
        {backTo && (
          <Link
            to={backTo}
            className="mb-1 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
          >
            <IconChevronLeft size={14} stroke={2} />
            {backLabel}
          </Link>
        )}
        <h1 className="font-display text-2xl font-black leading-tight text-ink sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-mute">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
