/**
 * Canonical facts about the marketing site. One place for the name, the
 * description search engines read, and the outbound links the footer renders.
 *
 * `SITE_ORIGIN` is optional: without a configured domain the canonical link is
 * omitted rather than pointing at localhost. `robots.txt` and `sitemap.xml`
 * derive the origin from the incoming request instead.
 */
export const SITE = {
  name: 'Warung POS',
  tagline: 'Kasir warung yang langsung bisa dipakai.',
  description:
    'Kasir warung untuk mencatat penjualan, stok, kas, dan laba harian dalam satu alur. Gratis selama masa uji coba, tanpa kartu kredit.',
  locale: 'id_ID',
  author: 'ridwanmuh3',
  github: 'https://github.com/ridwanmuh3',
  updatedAt: '2026-10-28',
  legalVersion: '1.0',
  legalEffective: '2026-10-28',
} as const

export const SITE_ORIGIN = (
  (import.meta.env.VITE_SITE_URL as string | undefined) ?? ''
).replace(/\/+$/, '')

/** Absolute URL for metadata, or `undefined` when no domain is configured. */
export function absoluteUrl(path: string): string | undefined {
  return SITE_ORIGIN === '' ? undefined : `${SITE_ORIGIN}${path}`
}
