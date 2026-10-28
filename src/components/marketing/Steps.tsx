import { STEPS } from '../../data/marketing'

export function Steps() {
  return (
    <section id="cara-pakai" className="scroll-mt-24 bg-surface-bone">
      <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-link">Cara pakai</p>
          <h2 className="mt-3 font-display text-3xl font-black leading-[0.95] text-ink sm:text-4xl">
            Dari daftar sampai transaksi pertama.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-body">
            Tidak ada instalasi dan tidak ada pelatihan panjang. Empat langkah ini cukup untuk
            mulai melayani pembeli.
          </p>
        </div>

        <ol className="mt-10 grid gap-4 sm:grid-cols-2">
          {STEPS.map(({ title, body, Icon }, index) => (
            <li
              key={title}
              className="flex gap-4 rounded-[30px] border border-border-subtle bg-surface p-6 shadow-level1"
            >
              <div className="flex flex-col items-center gap-2">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary font-display text-base font-black text-on-primary">
                  {index + 1}
                </span>
                <Icon size={18} stroke={2} className="text-link" aria-hidden />
              </div>
              <div>
                <h3 className="text-lg font-bold leading-tight text-ink">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-body">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
