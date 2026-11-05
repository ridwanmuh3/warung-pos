import { Link } from '@tanstack/react-router'
import { IconArrowRight } from '@tabler/icons-react'
import { buttonStyles } from '../ui/buttonStyles'
import { SectionEyebrow } from './SectionEyebrow'

export function CtaBand() {
  return (
    <section id="coba" className="scroll-mt-24 bg-ink text-white">
      <div className="mx-auto flex max-w-[1200px] flex-col items-start gap-8 px-4 py-16 sm:px-6 sm:py-24 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div data-reveal className="panel-in">
          <SectionEyebrow index="07" tone="dark">
            Mulai
          </SectionEyebrow>
          <h2 className="mt-5 font-display text-3xl font-black leading-[0.95] sm:text-4xl lg:text-5xl">
            Coba Warung POS di warung Anda.
          </h2>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/70">
            Buat warung, tambahkan beberapa produk, dan jalankan transaksi pertama dalam hitungan
            menit. Gratis selama masa uji coba.
          </p>
        </div>

        <div data-reveal className="panel-in flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <Link
            to="/login"
            search={{ mode: 'register' }}
            className={buttonStyles({ size: 'lg', className: 'w-full sm:w-auto' })}
          >
            Coba gratis
            <IconArrowRight size={18} stroke={2.5} />
          </Link>
          <Link
            to="/login"
            className="inline-flex h-14 w-full items-center justify-center rounded-full border-2 border-white/20 px-8 text-lg font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto"
          >
            Sudah punya akun? Masuk
          </Link>
        </div>
      </div>
    </section>
  )
}
