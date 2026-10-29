import { describe, expect, it } from 'vitest'
import { homeStructuredData, robotsTxt, sitemapXml } from '../src/lib/seo'
import { FAQ } from '../src/data/marketing'

const ORIGIN = 'https://warung.example'
const LAST_MOD = '2026-10-28'

describe('sitemap.xml', () => {
  it('memuat halaman publik dengan URL absolut', () => {
    const xml = sitemapXml(ORIGIN, LAST_MOD)
    for (const path of ['/', '/sitemap', '/privasi', '/ketentuan']) {
      expect(xml).toContain(`<loc>${ORIGIN}${path}</loc>`)
    }
    expect(xml).toContain(`<lastmod>${LAST_MOD}</lastmod>`)
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
  })

  it('tidak membocorkan rute aplikasi atau halaman masuk', () => {
    const xml = sitemapXml(ORIGIN, LAST_MOD)
    expect(xml).not.toContain('/masuk')
    expect(xml).not.toContain('/kasir')
    expect(xml).not.toContain('/checkout')
  })

  it('menormalkan origin yang punya garis miring di akhir', () => {
    expect(sitemapXml(`${ORIGIN}/`, LAST_MOD)).toContain(`<loc>${ORIGIN}/</loc>`)
  })
})

describe('robots.txt', () => {
  it('mengizinkan halaman pemasaran dan menunjuk sitemap absolut', () => {
    const robots = robotsTxt(ORIGIN)
    expect(robots).toContain('Allow: /')
    expect(robots).toContain('Disallow: /kasir')
    expect(robots).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`)
  })
})

describe('structured data homepage', () => {
  it('menyajikan SoftwareApplication gratis selama uji coba', () => {
    const [software] = homeStructuredData(`${ORIGIN}/`)
    expect(software['@type']).toBe('SoftwareApplication')
    expect(software.offers).toMatchObject({ price: '0', priceCurrency: 'IDR' })
    expect(software.url).toBe(`${ORIGIN}/`)
  })

  it('FAQPage memakai pertanyaan yang sama dengan yang terlihat', () => {
    const [, faq] = homeStructuredData()
    expect(faq['@type']).toBe('FAQPage')
    expect(faq.mainEntity).toHaveLength(FAQ.length)
    expect(faq.mainEntity[0]).toMatchObject({ name: FAQ[0].question })
  })
})
