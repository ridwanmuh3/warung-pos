import type { ReactNode } from 'react'

/**
 * Small editorial label that gives the marketing page a technical rhythm.
 * `dark` is for the ink bands, where the deep link green loses contrast.
 */
export function SectionEyebrow({
  index,
  children,
  tone = 'light',
}: {
  index: string
  children: ReactNode
  tone?: 'light' | 'dark'
}) {
  return (
    <p
      className={`flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.18em] ${
        tone === 'dark' ? 'text-primary' : 'text-link'
      }`}
    >
      <span className="size-1.5 rounded-[2px] bg-primary" aria-hidden />
      {index} / {children}
    </p>
  )
}
