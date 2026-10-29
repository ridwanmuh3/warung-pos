import { useState } from 'react'
import { formatIDR } from '../../lib/format'

function MoneyInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="block text-sm font-semibold">{label}<span className="mt-2 flex items-center rounded-xl border border-divider bg-surface px-3 focus-within:border-link"><span className="font-mono text-sm text-mute">Rp</span><input type="number" inputMode="numeric" min="0" max="1000000000" value={value} onChange={(event) => onChange(Math.max(0, Math.min(1000000000, Number(event.target.value) || 0)))} className="h-12 w-full min-w-0 bg-transparent pl-2 font-mono text-sm outline-none" /></span></label>
}

export function Calculator() {
  const [price, setPrice] = useState(10000)
  const [cost, setCost] = useState(6500)
  const [float, setFloat] = useState(100000)
  const [sales, setSales] = useState(225000)
  const [counted, setCounted] = useState(325000)
  const profit = price - cost
  const expected = float + sales
  const difference = counted - expected
  return <section className="bg-surface px-4 py-20 sm:px-6 sm:py-28 lg:px-8"><div className="mx-auto max-w-[1200px]"><h2 className="max-w-[20ch] font-display text-4xl font-black leading-[0.95] tracking-tight sm:text-5xl">Coba hitung sendiri. Bukan sekadar lihat fitur.</h2><p className="mt-6 max-w-[60ch] text-lg text-body">Ubah angka di bawah. Begini cara harga modal dan kas harian jadi keputusan yang bisa dibaca.</p>
    <div className="mt-12 grid gap-5 lg:grid-cols-2"><div className="rounded-[30px] bg-surface-bone p-6 sm:p-8"><h3 className="text-2xl font-black">Berapa laba per produk?</h3><p className="mt-2 text-sm text-body">Harga jual dikurangi HPP (harga beli).</p><div className="mt-7 grid gap-4 sm:grid-cols-2"><MoneyInput label="Harga jual" value={price} onChange={setPrice} /><MoneyInput label="HPP" value={cost} onChange={setCost} /></div><div className="mt-8 border-t border-divider pt-6"><p className="text-sm text-body">Laba kotor per produk</p><output aria-live="polite" className={`mt-2 block font-mono text-3xl font-bold ${profit < 0 ? 'text-danger' : 'text-ink'}`}>{formatIDR(profit)}</output><p className="mt-1 text-sm text-body">Margin {price > 0 ? Math.round(100 * profit / price) : 0}% dari harga jual{profit < 0 ? ' · rugi' : ''}</p></div></div>
    <div className="rounded-[30px] bg-ink p-6 text-white sm:p-8"><h3 className="text-2xl font-black">Uang di laci cocok?</h3><p className="mt-2 text-sm text-white/80">Modal awal + penjualan tunai = kas seharusnya.</p><div className="mt-7 grid gap-4 sm:grid-cols-3 [&_label]:text-white [&_span]:text-ink"><MoneyInput label="Modal awal" value={float} onChange={setFloat} /><MoneyInput label="Penjualan tunai" value={sales} onChange={setSales} /><MoneyInput label="Uang dihitung" value={counted} onChange={setCounted} /></div><div className="mt-8 border-t border-white/20 pt-6"><p className="text-sm text-white/80">Seharusnya {formatIDR(expected)} · Selisih</p><output aria-live="polite" className="mt-2 block font-mono text-3xl font-bold text-primary">{formatIDR(Math.abs(difference))}</output><p className="mt-1 text-sm text-white/80">{difference === 0 ? 'Pas. Kas sesuai catatan.' : difference > 0 ? 'Uang lebih dari catatan.' : 'Uang kurang dari catatan.'}</p></div></div></div><p className="mt-4 text-sm text-mute">Contoh hitungan saja. Angka tidak disimpan atau dikirim ke server.</p>
  </div></section>
}
