import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { IconBuildingStore, IconMenu2, IconX } from '@tabler/icons-react'
import { buttonStyles } from '../ui/buttonStyles'

const LINKS = [
  { href: '#fitur', label: 'Fitur' },
  { href: '#cara-pakai', label: 'Cara pakai' },
  { href: '#gratis', label: 'Gratis' },
  { href: '#faq', label: 'FAQ' },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const [progress, setProgress] = useState(0)
  const [active, setActive] = useState('')
  useEffect(() => {
    const update = () => setProgress(Math.round(100 * window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight)))
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])
  useEffect(() => {
    if (!open) return
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [open])
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) setActive(`#${entry.target.id}`)
    }, { rootMargin: '-20% 0px -65% 0px' })
    for (const link of LINKS) {
      const element = document.getElementById(link.href.slice(1))
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [])
  return (
    <header className="sticky top-0 z-40 border-b border-divider bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-3 px-4 sm:px-6 lg:h-20 lg:px-8">
        <Link to="/" onClick={() => setOpen(false)} aria-label="Warung POS — beranda" className="flex items-center gap-2.5 rounded-md py-1 text-ink"><span className="grid size-9 place-items-center rounded-md bg-primary text-on-primary"><IconBuildingStore size={20} stroke={2} /></span><span className="font-display text-lg font-black">Warung POS</span></Link>
        <nav aria-label="Navigasi halaman" className="hidden items-center gap-1 md:flex">{LINKS.map((link) => <Link key={link.href} to="/" hash={link.href.slice(1)} aria-current={active === link.href ? 'location' : undefined} className={`rounded-full px-3.5 py-2 text-sm font-semibold transition-colors hover:bg-surface-muted hover:text-ink ${active === link.href ? 'bg-primary-subtle text-on-primary' : 'text-body'}`}>{link.label}</Link>)}</nav>
        <div className="flex items-center gap-2">
          <Link to="/masuk" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-ink hover:bg-surface-muted sm:inline-flex">Masuk</Link>
          <Link to="/masuk" search={{ mode: 'register' }} className={buttonStyles({ size: 'sm', className: 'hidden px-4 sm:inline-flex sm:px-5' })}>Coba gratis</Link>
          <button type="button" className="grid size-11 place-items-center rounded-full text-ink hover:bg-surface-muted md:hidden" aria-label={open ? 'Tutup menu' : 'Buka menu'} aria-controls="marketing-nav" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <IconX size={22} /> : <IconMenu2 size={22} />}</button>
        </div>
      </div>
      {open && <nav id="marketing-nav" aria-label="Navigasi seluler" className="border-t border-divider bg-surface px-4 pb-5 pt-2 md:hidden">{LINKS.map((link) => <Link key={link.href} to="/" hash={link.href.slice(1)} onClick={() => setOpen(false)} className="flex min-h-12 items-center border-b border-divider text-base font-semibold">{link.label}</Link>)}<Link to="/masuk" search={{ mode: 'register' }} onClick={() => setOpen(false)} className={buttonStyles({ size: 'md', className: 'mt-4 w-full' })}>Coba gratis</Link></nav>}
      <div role="presentation" className="h-0.5 bg-primary" style={{ width: `${progress}%` }} />
    </header>
  )
}
