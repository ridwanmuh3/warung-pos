import type { ReactNode } from 'react'
import { SiteFooter } from './SiteFooter'
import { SiteHeader } from './SiteHeader'

/** Public page chrome. Kept separate from the authenticated AppShell. */
export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full bg-surface text-ink">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Lewati ke konten
      </a>
      <SiteHeader />
      <main id="konten">{children}</main>
      <SiteFooter />
    </div>
  )
}
