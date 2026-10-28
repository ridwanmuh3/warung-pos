import { IconPlus } from '@tabler/icons-react'
import { FAQ } from '../../data/marketing'

/**
 * Native disclosure widgets: keyboard support and open/close state come from
 * the browser, so the FAQ works before hydration.
 */
export function Faq() {
  return (
    <section id="faq" className="scroll-mt-24 bg-surface-bone">
      <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-link">FAQ</p>
            <h2 className="mt-3 font-display text-3xl font-black leading-[0.95] text-ink sm:text-4xl">
              Pertanyaan yang paling sering muncul.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-body">
              Kalau yang Anda cari belum ada di sini, panduan pengguna membahas alur kasir dan
              pemilik langkah demi langkah.
            </p>
          </div>

          <div className="space-y-2.5">
            {FAQ.map((item) => (
              <details
                key={item.question}
                className="group rounded-2xl border border-border-subtle bg-surface px-5 py-4 shadow-level1 open:shadow-level3"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-semibold text-ink [&::-webkit-details-marker]:hidden">
                  <span>{item.question}</span>
                  <IconPlus
                    size={18}
                    stroke={2.5}
                    className="shrink-0 text-mute transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none"
                    aria-hidden
                  />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-body">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
