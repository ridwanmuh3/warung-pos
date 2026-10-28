import { createFileRoute, Link } from '@tanstack/react-router'
import { MarketingShell } from '../components/marketing/MarketingShell'
import { SITE } from '../data/site'

export const Route = createFileRoute('/sitemap')({
  component: SitemapPage,
  head: () => ({
    meta: [
      { title: `Sitemap — ${SITE.name}` },
      {
        name: 'description',
        content: 'Peta halaman publik Warung POS dan daftar halaman aplikasi yang memerlukan akun.',
      },
      { name: 'robots', content: 'index, follow' },
    ],
  }),
})

const PUBLIC_LINKS = [
  { label: 'Beranda', href: '/beranda', note: 'Ringkasan produk, fitur, dan masa uji coba.' },
  { label: 'Sitemap', href: '/sitemap', note: 'Halaman ini.' },
  { label: 'Kebijakan privasi', href: '/privasi', note: 'Data yang disimpan dan cara meminta penghapusan.' },
  { label: 'Ketentuan layanan', href: '/ketentuan', note: 'Batas layanan selama masa uji coba.' },
  { label: 'Masuk atau daftar', href: '/masuk', note: 'Akun baru otomatis menjadi owner warung.' },
] as const

const HOME_SECTIONS = [
  { label: 'Fitur unggulan', hash: 'fitur' },
  { label: 'Cara pakai', hash: 'cara-pakai' },
  { label: 'Masa uji coba', hash: 'gratis' },
  { label: 'Fakta singkat', hash: 'fakta' },
  { label: 'FAQ', hash: 'faq' },
] as const

const APP_LINKS = [
  { label: 'Kasir', href: '/', note: 'Pilih produk dan jalankan transaksi.' },
  { label: 'Produk', href: '/produk', note: 'Katalog, harga, HPP, dan stok.' },
  { label: 'Laporan', href: '/laporan', note: 'Omzet, laba, dan rekonsiliasi kas.' },
  { label: 'Riwayat pesanan', href: '/riwayat', note: 'Cari transaksi dan cetak ulang struk.' },
  { label: 'Panduan pengguna', href: '/panduan', note: 'Langkah untuk kasir dan pemilik.' },
  { label: 'Anggota toko', href: '/anggota', note: 'Undang anggota dan atur peran.' },
  { label: 'Pengaturan', href: '/pengaturan', note: 'Nama warung dan preferensi.' },
  { label: 'Pulihkan data lama', href: '/pulihkan', note: 'Impor data dari penyimpanan browser lama.' },
] as const

function SitemapPage() {
  return (
    <MarketingShell>
      <div className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-link">Peta situs</p>
        <h1 className="mt-3 font-display text-3xl font-black leading-[0.95] text-ink sm:text-4xl">
          Semua halaman Warung POS.
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-body">
          Halaman publik bisa dibuka siapa saja. Halaman aplikasi memerlukan akun dan hanya
          menampilkan data warung tempat Anda terdaftar.
        </p>

        <div className="mt-10 grid gap-10 lg:grid-cols-2">
          <section aria-labelledby="sitemap-publik">
            <h2 id="sitemap-publik" className="font-display text-xl font-black text-ink">
              Publik
            </h2>
            <ul className="mt-4 divide-y divide-divider overflow-hidden rounded-2xl border border-border-subtle">
              {PUBLIC_LINKS.map((link) => (
                <li key={link.href} className="bg-surface">
                  <Link to={link.href} className="block px-4 py-3 hover:bg-surface-muted">
                    <span className="block text-sm font-semibold text-ink">{link.label}</span>
                    <span className="mt-0.5 block text-sm text-mute">{link.note}</span>
                  </Link>
                </li>
              ))}
            </ul>

            <h2 className="mt-8 font-display text-xl font-black text-ink">Bagian di beranda</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {HOME_SECTIONS.map((section) => (
                <li key={section.hash}>
                  <Link
                    to="/beranda"
                    hash={section.hash}
                    className="inline-flex rounded-full border border-border-subtle bg-surface px-3.5 py-2 text-sm font-semibold text-body hover:bg-surface-muted"
                  >
                    {section.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="sitemap-aplikasi">
            <h2 id="sitemap-aplikasi" className="font-display text-xl font-black text-ink">
              Aplikasi <span className="text-sm font-semibold text-mute">(perlu masuk)</span>
            </h2>
            <ul className="mt-4 divide-y divide-divider overflow-hidden rounded-2xl border border-border-subtle">
              {APP_LINKS.map((link) => (
                <li key={link.href} className="bg-surface">
                  <a href={link.href} className="block px-4 py-3 hover:bg-surface-muted">
                    <span className="block text-sm font-semibold text-ink">{link.label}</span>
                    <span className="mt-0.5 block text-sm text-mute">{link.note}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <p className="mt-10 text-sm text-mute">
          Untuk mesin pencari, daftar ini juga tersedia di{' '}
          <a href="/sitemap.xml" className="font-semibold text-link underline underline-offset-2">
            /sitemap.xml
          </a>
          .
        </p>
      </div>
    </MarketingShell>
  )
}
