import { PROBLEMS } from '../../data/marketing'

export function Purpose() {
  return (
    <section id="tujuan" className="scroll-mt-24 bg-surface">
      <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-link">Kenapa Warung POS</p>
            <h2 className="mt-3 font-display text-3xl font-black leading-[0.95] text-ink sm:text-4xl">
              Catatan warung sering terpisah di tiga tempat.
            </h2>
          </div>
          <div>
            <p className="text-lg leading-relaxed text-body">
              Warung POS menyatukan transaksi, stok, dan uang laci supaya pemilik tahu kondisi
              warung tanpa menyalin buku. Tujuannya sederhana: tutup toko dengan angka yang bisa
              dijelaskan, bukan perkiraan.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {PROBLEMS.map((problem) => (
                <div
                  key={problem.title}
                  className="rounded-2xl border border-border-subtle bg-surface-muted p-4"
                >
                  <h3 className="text-sm font-bold leading-tight text-ink">{problem.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-body">{problem.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
