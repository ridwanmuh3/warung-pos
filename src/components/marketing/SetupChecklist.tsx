import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { IconArrowRight, IconCheck } from '@tabler/icons-react'
import { STEPS } from '../../data/marketing'
import { SectionEyebrow } from './SectionEyebrow'

export function SetupChecklist() {
  // ponytail: no cross-device sync; upgrade when onboarding becomes account-backed.
  const [done, setDone] = useState<boolean[]>(STEPS.map(() => false))
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('warung-marketing-steps') ?? 'null')
      if (
        Array.isArray(saved) &&
        saved.length === STEPS.length &&
        saved.every((entry) => typeof entry === 'boolean')
      ) {
        queueMicrotask(() => setDone(saved))
      }
    } catch {
      /* Storage may be unavailable. */
    }
  }, [])
  const count = done.filter(Boolean).length

  function toggle(index: number) {
    const next = done.map((value, position) => (position === index ? !value : value))
    setDone(next)
    try {
      localStorage.setItem('warung-marketing-steps', JSON.stringify(next))
    } catch {
      /* Non-persistent fallback. */
    }
  }

  return (
    <section id="cara-pakai" className="scroll-mt-24 bg-surface-bone px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <div className="mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div data-reveal>
          <SectionEyebrow index="04">Cara pakai</SectionEyebrow>
          <h2 className="mt-5 font-display text-4xl font-black leading-[0.95] tracking-tight sm:text-5xl">
            Dari daftar sampai transaksi pertama.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-body">
            Empat langkah singkat untuk mulai berjualan. Tandai langkah yang ingin Anda pelajari;
            checklist ini hanya contoh panduan.
          </p>
          <div className="mt-8 flex items-center gap-3">
            <div
              role="progressbar"
              aria-label="Progres panduan contoh"
              aria-valuenow={count}
              aria-valuemin={0}
              aria-valuemax={STEPS.length}
              className="h-2 flex-1 overflow-hidden rounded-full bg-surface-deep"
            >
              <span
                className="block h-full rounded-full bg-data transition-[width] duration-300 ease-out"
                style={{ width: `${(count / STEPS.length) * 100}%` }}
              />
            </div>
            <span className="font-mono text-sm font-bold">
              {count}/{STEPS.length}
            </span>
          </div>
          <Link
            to="/login"
            search={{ mode: 'register' }}
            className="mt-8 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-link underline underline-offset-4"
          >
            Mulai dengan membuat akun <IconArrowRight size={18} aria-hidden />
          </Link>
        </div>

        <ol data-reveal-group className="space-y-3">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <button
                type="button"
                aria-pressed={done[index]}
                onClick={() => toggle(index)}
                className="flex w-full items-start gap-4 rounded-2xl bg-surface p-5 text-left shadow-level1 transition hover:shadow-level3"
              >
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-full font-mono text-sm font-bold ${
                    done[index] ? 'bg-primary text-on-primary' : 'bg-surface-bone text-ink'
                  }`}
                >
                  {done[index] ? <IconCheck size={20} className="check-pop" /> : index + 1}
                </span>
                <span>
                  <strong className="block text-base">{step.title}</strong>
                  <span className="mt-1 block text-sm leading-relaxed text-body">{step.body}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
