import { Link } from '@tanstack/react-router'
import { IconBuildingStore } from '@tabler/icons-react'
import { buttonStyles } from '../ui/buttonStyles'

const LINKS = [
  { href: '#fitur', label: 'Fitur' },
  { href: '#cara-pakai', label: 'Cara pakai' },
  { href: '#gratis', label: 'Gratis' },
  { href: '#faq', label: 'FAQ' },
]

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-divider bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-3 px-4 sm:h-20 sm:px-6 lg:px-8">
        <Link
          to="/beranda"
          aria-label="Warung POS — beranda"
          className="flex items-center gap-2.5 rounded-md py-1 text-ink"
        >
          <span className="grid size-9 place-items-center rounded-md bg-primary text-on-primary">
            <IconBuildingStore size={20} stroke={2} />
          </span>
          <span className="font-display text-lg font-black">Warung POS</span>
        </Link>

        <nav aria-label="Navigasi halaman" className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-3.5 py-2 text-sm font-semibold text-body transition-colors hover:bg-surface-muted hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/masuk"
            className="hidden rounded-full px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted sm:inline-flex"
          >
            Masuk
          </Link>
          <Link
            to="/masuk"
            search={{ mode: 'register' }}
            className={buttonStyles({ size: 'sm', className: 'px-4 sm:px-5' })}
          >
            Coba gratis
          </Link>
        </div>
      </div>
    </header>
  )
}
