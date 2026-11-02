const ITEMS = [
  'PENJUALAN Rp7.000',
  'STOK −2',
  'KAS +Rp7.000',
  'STRUK SIAP CETAK',
  'LAPORAN DIPERBARUI',
  'TANPA INSTAL',
]

/**
 * Thin ledger strip under the hero. Decorative by design: the same story is
 * told properly in the scroll sequence below, so the strip is hidden from AT.
 * `HomeMotion` pauses the loop while it is offscreen.
 */
export function LedgerTicker() {
  return (
    <div
      data-marquee
      aria-hidden="true"
      className="overflow-hidden border-y border-white/10 bg-ink py-3 text-white"
    >
      <div data-marquee-track className="flex w-max items-center">
        {[0, 1].map((copy) => (
          <div
            key={copy}
            data-marquee-duplicate={copy === 1 ? 'true' : undefined}
            className="flex shrink-0 items-center"
          >
            {ITEMS.map((item) => (
              <span
                key={item}
                className="flex items-center gap-2.5 whitespace-nowrap pr-8 font-mono text-xs font-bold uppercase tracking-[0.18em]"
              >
                <span className="size-1.5 rotate-45 bg-primary" aria-hidden />
                {item}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
