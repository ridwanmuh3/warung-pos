import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

function Label({ htmlFor, children, hint }: { htmlFor: string; children: ReactNode; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{children}</span>
      {hint && <span className="ml-1 text-xs font-normal normal-case text-slate-400">{hint}</span>}
    </label>
  )
}

const controlClass =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100'

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
      <input id={id} className={controlClass} {...props} />
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
      <select id={id} className={controlClass} {...props}>
        {children}
      </select>
    </div>
  )
}