import { IconArrowDownRight, IconArrowUpRight, IconCircleCheck } from '@tabler/icons-react'

const ROWS = [
  { time: '09:14', type: 'SALE', detail: 'Indomie Goreng × 2', amount: '+Rp7.000', Icon: IconArrowUpRight },
  { time: '09:14', type: 'STOCK', detail: 'Indomie Goreng', amount: '−2 unit', Icon: IconArrowDownRight },
  { time: '09:22', type: 'SALE', detail: 'Aqua 600ml × 1', amount: '+Rp4.000', Icon: IconArrowUpRight },
  { time: '17:03', type: 'SHIFT', detail: 'Kas ditutup · cocok', amount: 'Rp0 selisih', Icon: IconCircleCheck },
]

export function LedgerBand() {
  return <section className="bg-ink text-white"><div className="mx-auto grid max-w-[1200px] gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-2 lg:items-center lg:gap-20 lg:px-8">
    <div><h2 className="max-w-[13ch] font-display text-4xl font-black leading-[0.95] tracking-tight sm:text-5xl">Setiap angka punya cerita.</h2><p className="mt-6 max-w-[50ch] text-lg leading-relaxed text-white/80">Penjualan tercatat. Stok ikut bergerak. Saat tutup kas, selisih terlihat jelas — tanpa menyalin angka dari buku ke buku.</p><p className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-primary"><span className="size-2 rounded-full bg-primary" />Ilustrasi alur transaksi</p></div>
    <div className="overflow-hidden rounded-[30px] border border-white/20 bg-white/5"><div className="flex items-center justify-between border-b border-white/15 px-5 py-4"><span className="font-mono text-xs font-bold uppercase tracking-wider text-white/75">Riwayat aktivitas</span><span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">Hari ini</span></div><div className="divide-y divide-white/10">{ROWS.map((row) => <div key={row.time + row.type} className="flex items-center gap-3 px-4 py-4 sm:px-5"><span className="font-mono text-xs text-white/70">{row.time}</span><span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-primary"><row.Icon size={17} aria-hidden /></span><div className="min-w-0 flex-1"><p className="font-mono text-xs font-bold text-primary">{row.type}</p><p className="truncate text-sm text-white">{row.detail}</p></div><span className="shrink-0 font-mono text-xs text-white">{row.amount}</span></div>)}</div><p className="border-t border-white/15 px-5 py-3 text-xs text-white/70">Data contoh · tidak terhubung ke warung sungguhan</p></div>
  </div></section>
}
