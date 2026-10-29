import { createFileRoute } from '@tanstack/react-router'
import { MarketingShell } from '../components/marketing/MarketingShell'
import { Hero } from '../components/marketing/Hero'
import { CapabilityTabs } from '../components/marketing/CapabilityTabs'
import { SetupChecklist } from '../components/marketing/SetupChecklist'
import { LedgerBand } from '../components/marketing/LedgerBand'
import { Calculator } from '../components/marketing/Calculator'
import { BetaBand } from '../components/marketing/BetaBand'
import { Faq } from '../components/marketing/Faq'
import { CtaBand } from '../components/marketing/CtaBand'
import { absoluteUrl, SITE } from '../data/site'
import { homeStructuredData } from '../lib/seo'

const TITLE = 'Warung POS — Kasir warung, gratis selama masa uji coba'

export const Route = createFileRoute('/')({
  component: HomePage,
  /**
   * The page renders without a session, so this head is present in the HTML the
   * server sends — title, description, social cards, and FAQ structured data.
   */
  head: () => {
    const canonical = absoluteUrl('/')
    return {
      meta: [
        { title: TITLE },
        { name: 'description', content: SITE.description },
        { name: 'robots', content: 'index, follow' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: SITE.name },
        { property: 'og:title', content: TITLE },
        { property: 'og:description', content: SITE.description },
        { property: 'og:locale', content: SITE.locale },
        { name: 'twitter:card', content: 'summary' },
        { name: 'twitter:title', content: TITLE },
        { name: 'twitter:description', content: SITE.description },
      ],
      links: canonical ? [{ rel: 'canonical', href: canonical }] : [],
      scripts: homeStructuredData(canonical).map((entry) => ({
        type: 'application/ld+json',
        children: JSON.stringify(entry),
      })),
    }
  },
})

function HomePage() {
  return (
    <MarketingShell>
      <Hero />
      <CapabilityTabs />
      <LedgerBand />
      <Calculator />
      <SetupChecklist />
      <BetaBand />
      <Faq />
      <CtaBand />
    </MarketingShell>
  )
}
