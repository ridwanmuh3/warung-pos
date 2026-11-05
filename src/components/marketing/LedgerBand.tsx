import { useEffect, useRef, useState } from 'react'
import {
  IconArrowUpRight,
  IconCash,
  IconCircleCheck,
  IconPackage,
} from '@tabler/icons-react'
import { loadMotion, prefersReducedMotion, stepFromProgress } from '../../lib/motion'
import { SectionEyebrow } from './SectionEyebrow'

/**
 * One sale, told as four dependent events: the item leaves the shelf, stock
 * drops, the drawer gains cash, and the shift closes on a number that matches.
 * The copy stays illustrative — this is a marketing diagram, not live data.
 */
const STEPS = [
  {
    time: '09:14',
    type: 'SALE',
    detail: 'Indomie Goreng × 2',
    amount: '+Rp7.000',
    label: 'Terjual',
    note: 'Dua bungkus keluar dari rak.',
    Icon: IconArrowUpRight,
  },
  {
    time: '09:14',
    type: 'STOK',
    detail: 'Indomie Goreng · 40 → 38',
    amount: '−2 unit',
    label: 'Stok turun',
    note: 'Stok ikut bergerak, tanpa catat dua kali.',
    Icon: IconPackage,
  },
  {
    time: '09:14',
    type: 'KAS',
    detail: 'Kas laci · Rp100.000 → Rp107.000',
    amount: '+Rp7.000',
    label: 'Kas naik',
    note: 'Uang masuk ke laci yang sama.',
    Icon: IconCash,
  },
  {
    time: '17:03',
    type: 'SHIFT',
    detail: 'Tutup kas · cocok',
    amount: 'Rp0 selisih',
    label: 'Tutup kas',
    note: 'Hitung laci, selisih langsung terlihat.',
    Icon: IconCircleCheck,
  },
]

export function LedgerBand() {
  const sectionRef = useRef<HTMLElement>(null)
  const [active, setActive] = useState(0)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    if (
      prefersReducedMotion() ||
      window.matchMedia('(max-height: 540px)').matches
    ) {
      return
    }

    let cancelled = false
    let teardown = () => {}

    void loadMotion().then(({ ScrollTrigger }) => {
      if (cancelled) return
      const runway = section.querySelector<HTMLElement>('[data-ledger-runway]')
      if (!runway) return

      // Enables the sticky runway and the row curtain in CSS.
      section.dataset.motion = 'on'

      const update = (progress: number) => {
        setActive(stepFromProgress(progress, STEPS.length))
      }
      const trigger = ScrollTrigger.create({
        trigger: runway,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => update(self.progress),
        onRefresh: (self) => update(self.progress),
      })
      ScrollTrigger.refresh()
      update(trigger.progress)

      teardown = () => {
        trigger.kill()
        delete section.dataset.motion
      }
    })

    return () => {
      cancelled = true
      teardown()
    }
  }, [])

  return (
    <section ref={sectionRef} id="alur" data-ledger className="scroll-mt-24 bg-ink text-white">
      <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div data-reveal className="panel-in max-w-[62ch]">
          <SectionEyebrow index="02" tone="dark">
            Satu transaksi
          </SectionEyebrow>
          <h2 className="mt-5 max-w-[15ch] font-display text-4xl font-black leading-[0.95] tracking-tight sm:text-5xl">
            Setiap angka punya cerita.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-white/80">
            Penjualan tercatat. Stok ikut bergerak. Saat tutup kas, selisih terlihat jelas —
            tanpa menyalin angka dari buku ke buku.
          </p>
        </div>

        <div data-ledger-runway className="relative mt-12 lg:mt-16">
          <div data-ledger-stage className="flex items-center">
            <div className="grid w-full gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-center lg:gap-16">
              <div>
                <div data-ledger-narration className="mb-6 flex items-center justify-between gap-3 lg:hidden">
                  <div className="flex flex-1 gap-1.5" aria-hidden>
                    {STEPS.map((step, index) => (
                      <span
                        key={step.type}
                        className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                          index <= active ? 'bg-primary' : 'bg-white/15'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="shrink-0 font-mono text-xs font-bold tracking-[0.16em] text-white/70">
                    {String(active + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}
                  </span>
                </div>

                <ol data-ledger-narration className="relative hidden lg:block">
                  <span
                    aria-hidden
                    className="absolute bottom-3 left-[15px] top-3 w-px overflow-hidden bg-white/15"
                  >
                    <span
                      className="block h-full origin-top bg-primary transition-transform duration-500 ease-out"
                      style={{ transform: `scaleY(${(active + 1) / STEPS.length})` }}
                    />
                  </span>
                  {STEPS.map((step, index) => {
                    const passed = index <= active
                    const current = index === active
                    return (
                      <li
                        key={step.type}
                        aria-current={current ? 'step' : undefined}
                        className="relative flex gap-4 pb-8 last:pb-0"
                      >
                        <span
                          className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full border font-mono text-xs font-bold transition-colors duration-300 ${
                            passed
                              ? 'border-primary bg-primary text-on-primary'
                              : 'border-white/20 bg-ink text-white/50'
                          }`}
                        >
                          {index < active ? (
                            <IconCircleCheck size={16} aria-hidden />
                          ) : (
                            index + 1
                          )}
                        </span>
                        <span className="min-w-0 pt-0.5">
                          <span
                            className={`block font-mono text-xs font-bold uppercase tracking-[0.18em] transition-colors duration-300 ${
                              passed ? 'text-primary' : 'text-white/45'
                            }`}
                          >
                            {step.label}
                          </span>
                          <span
                            className={`mt-1 block text-sm leading-relaxed transition-colors duration-300 ${
                              current ? 'text-white' : 'text-white/55'
                            }`}
                          >
                            {step.note}
                          </span>
                        </span>
                      </li>
                    )
                  })}
                </ol>

                <div data-ledger-narration className="lg:hidden">
                  <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-primary">
                    {STEPS[active].label}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-white/70">
                    {STEPS[active].note}
                  </p>
                </div>

                <p data-ledger-narration className="mt-8 hidden items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-white/70 lg:flex">
                  <span className="h-px w-8 bg-white/25" aria-hidden />
                  Gulir untuk mengikuti alur
                </p>
              </div>

              <div className="overflow-hidden rounded-[30px] border border-white/20 bg-white/5 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.8)]">
                <div className="flex items-center justify-between border-b border-white/15 px-5 py-4">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-white/75">
                    Riwayat aktivitas
                  </span>
                  <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                    Hari ini
                  </span>
                </div>

                <div className="divide-y divide-white/10">
                  {STEPS.map((step, index) => (
                    <div
                      key={step.type}
                      data-ledger-row
                      data-visible={index <= active ? 'true' : 'false'}
                      className="flex items-center gap-3 px-4 py-4 sm:px-5"
                    >
                      <span className="w-12 shrink-0 font-mono text-xs text-white/70">
                        {step.time}
                      </span>
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-primary">
                        <step.Icon size={17} aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-primary">
                          {step.type}
                        </p>
                        <p className="text-sm leading-snug text-white">{step.detail}</p>
                      </div>
                      <span className="shrink-0 font-mono text-xs text-white">{step.amount}</span>
                    </div>
                  ))}
                </div>

                <p className="border-t border-white/15 px-5 py-3 text-xs text-white/70">
                  Data contoh · tidak terhubung ke warung sungguhan
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
