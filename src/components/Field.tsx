import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import { Input } from './ui/Input'

function Label({ htmlFor, children, hint }: { htmlFor: string; children: ReactNode; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{children}</span>
      {hint && <span className="ml-1 text-xs font-normal normal-case text-mute">{hint}</span>}
    </label>
  )
}

const selectClass =
  'mt-1 w-full rounded-sm border-2 border-border bg-surface px-3 py-2 text-sm text-ink outline-none transition duration-150 ease-out focus:border-primary focus:shadow-[0_0_0_3px_rgb(22_51_0/0.15)]'

export function TextField({
  id,
  label,
  hint,
  className = '',
  ...props
}: { id: string; label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={className}>
      <Label htmlFor={id} hint={hint}>
        {label}
      </Label>
      <Input id={id} className="mt-1 h-10 text-sm" {...props} />
    </div>
  )
}

export function SelectField({
  id,
  label,
  className = '',
  children,
  ...props
}: { id: string; label: string } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <select id={id} className={selectClass} {...props}>
        {children}
      </select>
    </div>
  )
}