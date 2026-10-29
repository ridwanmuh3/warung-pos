import { Link } from '@tanstack/react-router'
import { IconArrowDown, IconArrowRight, IconCheck } from '@tabler/icons-react'
import { HERO } from '../../data/marketing'
import { buttonStyles } from '../ui/buttonStyles'
import { PosDemo } from './PosDemo'

export function Hero() {
  return (
    <section id="atas" className="relative overflow-hidden bg-surface">
      <div className="pointer-events-none absolute right-[-14rem] top-[-16rem] size-[35rem] rounded-full bg-primary-subtle blur-3xl" aria-hidden />
      <div className="relative mx-auto grid max-w-[1200px] items-center gap-12 px-4 pb-20 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[0.82fr_1.18fr] lg:gap-12 lg:px-8 lg:pb-28 lg:pt-28">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-primary-subtle px-3 py-1.5 text-xs font-bold text-on-primary"><span className="size-2 rounded-full bg-link" aria-hidden />{HERO.badge}</p>
          <h1 className="mt-7 max-w-[12ch] font-display text-[clamp(3rem,5.1vw,5.75rem)] font-black leading-[0.93] tracking-[-0.035em] text-ink">Kasir warung. <span className="text-link">Langsung jalan.</span></h1>
          <p className="mt-6 max-w-[55ch] text-lg leading-relaxed text-body">Catat penjualan, kurangi stok, dan tahu uang di laci — dalam satu alur. Coba langsung sebelum daftar.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/masuk" search={{ mode: 'register' }} className={buttonStyles({ size: 'lg', className: 'w-full sm:w-auto' })}>Coba gratis <IconArrowRight size={19} aria-hidden /></Link>
            <Link to="/" hash="fitur" className={buttonStyles({ variant: 'secondary', size: 'lg', className: 'w-full sm:w-auto' })}>Lihat fitur <IconArrowDown size={17} aria-hidden /></Link>
          </div>
          <p className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-body"><span className="inline-flex items-center gap-1.5"><IconCheck size={17} className="text-link" aria-hidden />Tanpa kartu kredit</span><span className="inline-flex items-center gap-1.5"><IconCheck size={17} className="text-link" aria-hidden />Tanpa instal</span></p>
        </div>
        <div className="min-w-0"><PosDemo /><p className="mt-3 text-center text-xs text-mute">Demo terpisah dari aplikasi. Tidak menyimpan transaksi.</p></div>
      </div>
    </section>
  )
}
