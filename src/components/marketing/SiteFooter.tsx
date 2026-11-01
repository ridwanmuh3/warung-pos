import { Link } from '@tanstack/react-router'
import { IconBrandGithub, IconBuildingStore } from '@tabler/icons-react'
import { SITE } from '../../data/site'

const linkClass = 'text-sm text-white/75 transition-colors hover:text-white'
const columnTitle = 'text-xs font-semibold uppercase tracking-wide text-white/50'

export function SiteFooter() {
  return (
    <footer className="bg-ink text-white">
      <div className="mx-auto max-w-[1200px] px-4 pb-8 pt-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Link to="/" className="inline-flex items-center gap-2.5 text-white">
              <span className="grid size-9 place-items-center rounded-md bg-primary text-on-primary">
                <IconBuildingStore size={20} stroke={2} />
              </span>
              <span className="font-display text-lg font-black">{SITE.name}</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">
              Kasir, stok, kas, dan laporan warung dalam satu alur. Gratis selama masa uji coba.
            </p>
            <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
              <span className="size-1.5 rounded-full bg-primary" aria-hidden />
              Masih dalam masa uji coba
            </span>
          </div>

          <nav aria-label="Produk">
            <p className={columnTitle}>Produk</p>
            <ul className="mt-4 space-y-2.5">
              <li><Link to="/" hash="fitur" className={linkClass}>Fitur</Link></li>
              <li><Link to="/" hash="cara-pakai" className={linkClass}>Cara pakai</Link></li>
              <li><Link to="/" hash="gratis" className={linkClass}>Masa uji coba</Link></li>
              <li><Link to="/" hash="faq" className={linkClass}>FAQ</Link></li>
              <li>
                <Link to="/login" search={{ mode: 'register' }} className={linkClass}>
                  Coba gratis
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Halaman">
            <p className={columnTitle}>Halaman</p>
            <ul className="mt-4 space-y-2.5">
              <li><Link to="/" className={linkClass}>Beranda</Link></li>
              <li><Link to="/sitemap" className={linkClass}>Sitemap</Link></li>
              <li><Link to="/guide" className={linkClass}>Panduan pengguna</Link></li>
              <li><Link to="/login" className={linkClass}>Masuk</Link></li>
            </ul>
          </nav>

          <nav aria-label="Legal dan lainnya">
            <p className={columnTitle}>Legal</p>
            <ul className="mt-4 space-y-2.5">
              <li><Link to="/privacy" className={linkClass}>Kebijakan privasi</Link></li>
              <li><Link to="/terms" className={linkClass}>Ketentuan layanan</Link></li>
              <li>
                <a href={SITE.github} className={`${linkClass} inline-flex items-center gap-1.5`}>
                  <IconBrandGithub size={16} stroke={2} />
                  GitHub
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/55">
            &copy; 2026 {SITE.name}. Dibuat oleh{' '}
            <a
              href={SITE.github}
              className="underline decoration-white/30 underline-offset-2 hover:text-white"
            >
              {SITE.author}
            </a>
            .
          </p>
          <div className="flex items-center gap-5">
            <Link to="/sitemap" className="text-xs text-white/55 hover:text-white">
              Sitemap
            </Link>
            <Link to="/" hash="faq" className="text-xs text-white/55 hover:text-white">
              FAQ
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
