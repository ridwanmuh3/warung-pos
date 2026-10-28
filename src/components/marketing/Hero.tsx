import { Link } from '@tanstack/react-router'
import { IconArrowRight, IconBuildingStore, IconCheck, IconSearch } from '@tabler/icons-react'
import { HERO } from '../../data/marketing'
import { ProductImage } from '../ProductImage'
import { buttonStyles } from '../ui/buttonStyles'

/** Real product photos served by the app's own image route, not emoji. */
const MOCK_PRODUCTS = [
  { name: 'Indomie Goreng', price: 'Rp3.500', imageKey: 'seed/indomie-goreng.png' },
  { name: 'Aqua 600ml', price: 'Rp4.000', imageKey: 'seed/aqua.jpg' },
  { name: 'Chitato 68g', price: 'Rp11.000', imageKey: 'seed/chitato.jpg' },
  { name: 'Cadbury Dairy Milk', price: 'Rp15.000', imageKey: 'seed/diary-milk.jpeg' },
]

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -right-32 -top-32 size-[30rem] rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -left-44 top-48 size-[26rem] rounded-full bg-primary-subtle blur-3xl" />
      </div>

      <div className="relative mx-auto grid max-w-[1200px] items-center gap-12 px-4 pb-16 pt-12 sm:px-6 sm:pb-24 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-8 lg:pt-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-primary-subtle px-3 py-1 text-xs font-semibold text-on-primary">
            <span className="size-1.5 rounded-full bg-on-primary" aria-hidden />
            {HERO.badge}
          </span>

          <h1 className="mt-5 font-display text-[2.6rem] font-black leading-[0.92] tracking-tight text-ink sm:text-6xl lg:text-7xl">
            {HERO.title}
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-relaxed text-body">{HERO.body}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              to="/masuk"
              search={{ mode: 'register' }}
              className={buttonStyles({ size: 'lg', className: 'w-full sm:w-auto' })}
            >
              {HERO.primaryCta}
              <IconArrowRight size={18} stroke={2.5} />
            </Link>
            <a
              href="#cara-pakai"
              className={buttonStyles({ variant: 'secondary', size: 'lg', className: 'w-full sm:w-auto' })}
            >
              {HERO.secondaryCta}
            </a>
          </div>

          <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-mute">
            <span className="inline-flex items-center gap-1.5">
              <IconCheck size={16} stroke={2.5} className="text-link" aria-hidden />
              Tanpa kartu kredit
            </span>
            <span aria-hidden>·</span>
            <span>Tanpa instal</span>
            <span aria-hidden>·</span>
            <span>Data tiap warung terpisah</span>
          </p>
        </div>

        <div
          role="img"
          aria-label="Contoh tampilan kasir Warung POS: daftar produk, keranjang tiga item, dan total Rp30.000"
          className="relative mx-auto w-full max-w-md lg:max-w-none"
        >
          <div className="rounded-[30px] border border-border-subtle bg-surface p-4 shadow-level3 sm:p-5">
            <div className="flex items-center justify-between gap-3 border-b border-divider pb-3">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-primary text-on-primary">
                  <IconBuildingStore size={18} stroke={2.2} aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-bold leading-tight text-ink">Warung Sari</p>
                  <p className="text-[11px] text-mute">Kasir · Budi</p>
                </div>
              </div>
              <span className="rounded-full bg-primary-subtle px-2.5 py-1 text-[11px] font-semibold text-on-primary">
                Kas terbuka
              </span>
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-xl border border-border-subtle bg-surface-muted px-3 py-2 text-xs text-mute">
              <IconSearch size={14} stroke={2} aria-hidden />
              Cari nama, SKU, atau scan barcode…
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {MOCK_PRODUCTS.map((product) => (
                <div
                  key={product.name}
                  className="rounded-2xl border border-border-subtle bg-surface p-2.5"
                >
                  <ProductImage
                    imageKey={product.imageKey}
                    alt=""
                    className="aspect-square w-full rounded-xl"
                    iconSize={28}
                  />
                  <p className="mt-2 truncate text-xs font-semibold text-ink">{product.name}</p>
                  <p className="tabular text-xs font-bold text-link">{product.price}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-ink px-3 py-2.5 text-white">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-white/60">3 produk</p>
                <p className="tabular text-base font-bold">Rp30.000</p>
              </div>
              <span className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-on-primary">
                Bayar
              </span>
            </div>
          </div>

          <div className="absolute -bottom-5 -left-3 flex items-center gap-2 rounded-2xl border border-border-subtle bg-surface px-3 py-2 shadow-level3 sm:-left-6">
            <span className="grid size-7 place-items-center rounded-full bg-primary-subtle text-on-primary">
              <IconCheck size={14} stroke={3} aria-hidden />
            </span>
            <span className="text-[11px] font-semibold text-ink">
              Kembalian <span className="tabular">Rp20.000</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
