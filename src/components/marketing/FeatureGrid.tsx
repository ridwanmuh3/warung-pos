import { FEATURES } from '../../data/marketing'

export function FeatureGrid() {
  return (
    <section id="fitur" className="scroll-mt-24 border-t border-divider bg-surface">
      <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-link">Fitur unggulan</p>
          <h2 className="mt-3 font-display text-3xl font-black leading-[0.95] text-ink sm:text-4xl">
            Yang dipakai setiap hari, bukan sekadar daftar fitur.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-body">
            Dari kasir sampai tutup buku. Semua jalan di browser, dengan perhitungan uang yang
            dilakukan di server saat checkout.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ title, body, Icon }) => (
            <article
              key={title}
              className="rounded-[30px] border border-border-subtle bg-surface p-6 shadow-level1 transition duration-200 hover:-translate-y-0.5 hover:shadow-level3 motion-reduce:transform-none"
            >
              <span className="grid size-11 place-items-center rounded-2xl bg-primary-subtle text-on-primary">
                <Icon size={22} stroke={2} aria-hidden />
              </span>
              <h3 className="mt-4 text-lg font-bold leading-tight text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-body">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
