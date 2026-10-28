import { FACTS } from '../../data/marketing'

/**
 * Facts, not traction. Every figure describes the product itself, so the
 * section stays true without customer data. Do not swap these for invented
 * usage counts or testimonials.
 */
export function Facts() {
  return (
    <section id="fakta" className="scroll-mt-24 border-y border-divider bg-surface">
      <div className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-link">Fakta singkat</p>
            <h2 className="mt-2 font-display text-2xl font-black leading-tight text-ink sm:text-3xl">
              Angkanya bisa Anda periksa sendiri.
            </h2>
          </div>
          <p className="max-w-sm text-sm text-mute">
            Belum ada angka pemakaian yang kami tampilkan — kami menunggu data nyata, bukan
            memperkirakan.
          </p>
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {FACTS.map((fact) => (
            <div
              key={fact.label}
              className="rounded-2xl border border-border-subtle bg-surface-muted p-5"
            >
              <dt className="text-xs font-semibold tracking-wide text-mute">
                {fact.label}
              </dt>
              <dd>
                <span className="tabular mt-2 block font-display text-4xl font-black leading-none text-ink sm:text-5xl">
                  {fact.value}
                </span>
                <span className="mt-2 block text-xs leading-relaxed text-mute">{fact.note}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
