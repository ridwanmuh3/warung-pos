/**
 * Crawler-facing files. Both are generated per request so the absolute URLs
 * match the deployment that served them — no hardcoded domain, and no stale
 * sitemap after a move to a custom domain.
 *
 * Only public pages are listed. `/login` is deliberately absent: it is a form,
 * not content.
 */
import { FAQ } from '../data/marketing'
import { SITE } from '../data/site'

export const PUBLIC_PAGES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/sitemap', changefreq: 'monthly', priority: '0.3' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
  { path: '/terms', changefreq: 'yearly', priority: '0.3' },
] as const

function originOnly(origin: string): string {
  return origin.replace(/\/+$/, '')
}

export function sitemapXml(origin: string, lastmod: string): string {
  const base = originOnly(origin)
  const urls = PUBLIC_PAGES.map(
    (page) =>
      `  <url>\n` +
      `    <loc>${base}${page.path}</loc>\n` +
      `    <lastmod>${lastmod}</lastmod>\n` +
      `    <changefreq>${page.changefreq}</changefreq>\n` +
      `    <priority>${page.priority}</priority>\n` +
      `  </url>`,
  ).join('\n')

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${urls}\n` +
    `</urlset>\n`
  )
}

/**
 * Structured data for the homepage. The FAQ entries are the same array the
 * page renders, so the markup can never claim an answer the visitor cannot see.
 */
export function homeStructuredData(url?: string) {
  const software = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE.name,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: SITE.description,
    ...(url ? { url } : {}),
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'IDR',
      description: 'Gratis selama masa uji coba',
    },
  }

  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  }

  return [software, faq] as [typeof software, typeof faq]
}

export function robotsTxt(origin: string): string {
  const base = originOnly(origin)
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /cashier',
    'Disallow: /login',
    'Disallow: /beranda',
    'Disallow: /ringkasan',
    'Disallow: /products',
    'Disallow: /cart',
    'Disallow: /checkout',
    'Disallow: /reports',
    'Disallow: /orders',
    'Disallow: /order-success',
    'Disallow: /members',
    'Disallow: /settings',
    'Disallow: /restore',
    'Disallow: /guide',
    'Disallow: /api/',
    `Sitemap: ${base}/sitemap.xml`,
    '',
  ].join('\n')
}
