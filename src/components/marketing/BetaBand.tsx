import { Link } from '@tanstack/react-router'
import { IconArrowRight, IconCheck } from '@tabler/icons-react'
import { BETA_NOTE, BETA_POINTS } from '../../data/marketing'
import { buttonStyles } from '../ui/buttonStyles'

export function BetaBand() {
  return (
    <section id="gratis" className="scroll-mt-24 bg-primary text-on-primary">
      <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16 lg:px-8">
        <div data-reveal>
          <span className="inline-flex items-center gap-2 rounded-full bg-on-primary/10 px-3 py-1 text-xs font-semibold">
            <span className="size-1.5 rounded-full bg-on-primary" aria-hidden />
            Masa uji coba
          </span>
          <h2 className="mt-4 font-display text-3xl font-black leading-[0.95] sm:text-4xl lg:text-5xl">
            Gratis selama masa uji coba.
          </h2>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-on-primary/80">
            Semua fitur terbuka, tanpa kartu kredit. Kami masih menyempurnakan produk, dan Anda
            bisa memakainya tanpa biaya selama periode ini.
          </p>

          <ul className="mt-6 space-y-2.5">
            {BETA_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-sm font-medium">
                <IconCheck size={18} stroke={2.5} className="mt-0.5 shrink-0" aria-hidden />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div data-reveal className="rounded-[30px] bg-on-primary/10 p-6 sm:p-8">
          <p className="text-sm leading-relaxed text-on-primary/85">{BETA_NOTE}</p>
          <Link
            to="/login"
            search={{ mode: 'register' }}
            className={buttonStyles({ variant: 'dark', size: 'lg', className: 'mt-6 w-full' })}
          >
            Mulai gratis
            <IconArrowRight size={18} stroke={2.5} />
          </Link>
          <p className="mt-3 text-center text-xs text-on-primary/70">
            Akun pertama otomatis menjadi owner warung.
          </p>
        </div>
      </div>
    </section>
  )
}
