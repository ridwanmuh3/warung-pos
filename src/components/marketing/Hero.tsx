import { Link } from '@tanstack/react-router'
import { IconArrowDown, IconArrowRight, IconCheck } from '@tabler/icons-react'
import { HERO } from '../../data/marketing'
import { buttonStyles } from '../ui/buttonStyles'
import { PosDemo } from './PosDemo'
import { SectionEyebrow } from './SectionEyebrow'

export function Hero() {
  return (
    <section id="atas" data-hero className="relative overflow-hidden bg-surface">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          data-hero-blob
          className="animate-blob-breathe absolute -right-40 -top-56 size-[38rem] rounded-full bg-hero-warm/55 blur-3xl"
        />
        <div
          data-hero-blob
          className="absolute right-[6%] top-24 size-[24rem] rounded-full bg-hero-glow/25 blur-3xl"
        />
        <div
          data-hero-blob
          className="animate-blob-breathe absolute -bottom-56 left-[-9rem] size-[34rem] rounded-full bg-hero-pink/80 blur-3xl"
          style={{ animationDelay: '-4.5s' }}
        />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-linear-to-b from-transparent to-surface" />
      </div>

      <div className="relative mx-auto grid max-w-[1200px] items-center gap-12 px-4 pb-20 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[0.82fr_1.18fr] lg:gap-12 lg:px-8 lg:pb-28 lg:pt-28">
        <div>
          <div className="hero-rise">
            <SectionEyebrow index="00">Kasir · stok · kas</SectionEyebrow>
          </div>
          <p className="hero-rise hero-rise-delay-1 mt-4 inline-flex items-center gap-2 rounded-full bg-primary-subtle px-3 py-1.5 text-xs font-bold text-on-primary">
            <span className="size-2 rounded-full bg-link" aria-hidden />
            {HERO.badge}
          </p>
          <h1 className="hero-rise hero-rise-delay-2 mt-7 max-w-[12ch] font-display text-[clamp(3rem,5.1vw,5.75rem)] font-black leading-[0.93] tracking-[-0.035em] text-ink">
            Kasir warung.{' '}
            <span className="text-link">
              Langsung{' '}
              <span className="relative inline-block">
                jalan.
                <span
                  aria-hidden
                  className="absolute -bottom-1 left-0 h-2.5 w-full rounded-full bg-primary sm:h-3"
                />
              </span>
            </span>
          </h1>
          <p className="hero-rise hero-rise-delay-3 mt-6 max-w-[55ch] text-lg leading-relaxed text-body">
            Catat penjualan, kurangi stok, dan tahu uang di laci — dalam satu alur. Coba langsung
            sebelum daftar.
          </p>
          <div className="hero-rise hero-rise-delay-4 mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/login"
              search={{ mode: 'register' }}
              className={buttonStyles({ size: 'lg', className: 'w-full sm:w-auto' })}
            >
              Coba gratis <IconArrowRight size={19} aria-hidden />
            </Link>
            <Link
              to="/"
              hash="fitur"
              className={buttonStyles({
                variant: 'secondary',
                size: 'lg',
                className: 'w-full sm:w-auto',
              })}
            >
              Lihat fitur <IconArrowDown size={17} aria-hidden />
            </Link>
          </div>
          <p className="hero-rise hero-rise-delay-4 mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-body">
            <span className="inline-flex items-center gap-1.5">
              <IconCheck size={17} className="text-link" aria-hidden />
              Tanpa kartu kredit
            </span>
            <span className="inline-flex items-center gap-1.5">
              <IconCheck size={17} className="text-link" aria-hidden />
              Tanpa instal
            </span>
          </p>
        </div>

        <div className="hero-rise hero-rise-delay-2 relative min-w-0">
          <div
            data-hero-chip
            aria-hidden
            className="pointer-events-none absolute -top-12 left-6 z-10 hidden -rotate-2 rounded-2xl bg-surface px-4 py-3 shadow-level3 lg:block"
          >
            <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-mute">
              Stok
            </p>
            <p className="mt-1 font-mono text-lg font-bold text-ink">
              38 <span className="text-xs text-link">−2</span>
            </p>
          </div>
          <div
            data-hero-chip
            aria-hidden
            className="pointer-events-none absolute -top-8 right-8 z-10 hidden rotate-2 rounded-2xl bg-surface px-4 py-3 shadow-level3 lg:block"
          >
            <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-mute">
              Kas laci
            </p>
            <p className="mt-1 font-mono text-lg font-bold text-ink">Rp107.000</p>
          </div>

          <PosDemo />
          <p className="mt-3 text-center text-xs text-mute">
            Demo terpisah dari aplikasi. Tidak menyimpan transaksi.
          </p>
        </div>
      </div>
    </section>
  )
}
