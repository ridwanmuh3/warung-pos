import { useRef, useState } from 'react'
import {
  IconArrowRight,
  IconCash,
  IconChartBar,
  IconPackage,
  IconReceipt,
  IconShoppingCart,
} from '@tabler/icons-react'
import { FEATURES } from '../../data/marketing'
import { formatIDR } from '../../lib/format'
import { SectionEyebrow } from './SectionEyebrow'

const PREVIEWS = [
  { label: 'Cari cepat', headline: 'Indomie Goreng', detail: 'SKU MKN-001 · Rp3.500', Icon: IconShoppingCart },
  { label: 'Pembayaran tunai', headline: 'Rp30.000', detail: 'Tunai Rp50.000 · Kembalian Rp20.000', Icon: IconReceipt },
  { label: 'Pergerakan stok', headline: '39 tersisa', detail: '40 awal · 1 terjual · otomatis tercatat', Icon: IconPackage },
  { label: 'Tutup kas', headline: formatIDR(325000), detail: 'Contoh uang seharusnya di laci setelah shift', Icon: IconCash },
  { label: 'Laporan harian', headline: '7 hari', detail: 'Omzet, laba kotor, dan produk terlaris', Icon: IconChartBar },
]

export function CapabilityTabs() {
  const [active, setActive] = useState(0)
  const refs = useRef<Array<HTMLButtonElement | null>>([])

  function navigate(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const next =
      event.key === 'ArrowRight'
        ? (index + 1) % PREVIEWS.length
        : event.key === 'ArrowLeft'
          ? (index + PREVIEWS.length - 1) % PREVIEWS.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? PREVIEWS.length - 1
              : -1
    if (next < 0) return
    event.preventDefault()
    setActive(next)
    refs.current[next]?.focus()
  }

  const preview = PREVIEWS[active]
  const feature = FEATURES[active]

  return (
    <section id="fitur" className="scroll-mt-24 bg-surface px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <div className="mx-auto max-w-[1200px]">
        <div data-reveal className="max-w-[62ch]">
          <SectionEyebrow index="01">Fitur</SectionEyebrow>
          <h2 className="mt-5 font-display text-4xl font-black leading-[0.95] tracking-tight sm:text-5xl">
            Dari pesanan sampai laporan. Satu alur, bukan lima aplikasi.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-body">
            Mulai di kasir. Setiap penjualan langsung tersambung ke stok, kas, dan angka harian.
          </p>
        </div>

        <div className="mt-12 overflow-hidden rounded-[30px] bg-surface shadow-level1 lg:grid lg:grid-cols-[0.85fr_1.15fr]">
          <div
            role="tablist"
            aria-label="Jelajahi fitur"
            className="flex overflow-x-auto border-b border-divider p-3 lg:flex-col lg:border-b-0 lg:border-r lg:p-5"
          >
            {FEATURES.slice(0, 5).map((item, index) => (
              <button
                key={item.title}
                ref={(element) => {
                  refs.current[index] = element
                }}
                role="tab"
                id={`feature-tab-${index}`}
                aria-selected={active === index}
                aria-controls="feature-panel"
                tabIndex={active === index ? 0 : -1}
                onKeyDown={(event) => navigate(event, index)}
                onClick={() => setActive(index)}
                className={`flex min-h-12 shrink-0 items-center gap-3 rounded-2xl px-4 text-left text-sm font-bold transition-colors lg:w-full lg:text-base ${
                  active === index
                    ? 'bg-primary text-on-primary'
                    : 'text-body hover:bg-surface-muted'
                }`}
              >
                <item.Icon size={20} aria-hidden />
                {item.title}
                <IconArrowRight size={16} aria-hidden className="ml-auto hidden lg:block" />
              </button>
            ))}
          </div>

          <div
            role="tabpanel"
            id="feature-panel"
            aria-labelledby={`feature-tab-${active}`}
            className="flex min-h-[310px] bg-surface-bone p-6 sm:p-10 lg:p-14"
          >
            <div key={active} className="panel-in flex w-full flex-col justify-between">
              <div>
                <p className="text-sm font-semibold text-link">{preview.label}</p>
                <h3 className="mt-4 max-w-[14ch] font-display text-3xl font-black leading-tight sm:text-4xl">
                  {feature.title}
                </h3>
                <p className="mt-4 max-w-[55ch] text-base leading-relaxed text-body">
                  {feature.body}
                </p>
              </div>
              <div className="mt-10 flex items-center gap-5 rounded-2xl bg-surface p-5 shadow-level1 sm:gap-8">
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary-subtle text-on-primary">
                  <preview.Icon size={28} stroke={1.8} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="font-mono text-xl font-bold sm:text-2xl">{preview.headline}</p>
                  <p className="mt-1 text-sm text-body">{preview.detail}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-4 text-sm text-mute">
          Angka di atas ilustrasi alur, bukan data transaksi nyata.
        </p>
      </div>
    </section>
  )
}
