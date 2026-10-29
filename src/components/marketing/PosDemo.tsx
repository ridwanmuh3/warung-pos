import { useEffect, useState } from 'react'
import { IconCheck, IconMinus, IconPlus, IconRefresh, IconSearch, IconShoppingCart } from '@tabler/icons-react'
import { changeQty, demoChange, DEMO_PRODUCTS, demoTotal } from '../../lib/demoCart'
import type { DemoCart } from '../../lib/demoCart'
import { formatIDR } from '../../lib/format'
import indomie from '../../assets/indomie-goreng.png'
import aqua from '../../assets/aqua.jpg'
import chitato from '../../assets/chitato.jpg'
import cokelat from '../../assets/diary-milk.jpeg'

const IMAGES = { indomie, aqua, chitato, cokelat }
const INITIAL: DemoCart = { indomie: 1, aqua: 1 }

/** Isolated browser demo. Never reads or writes the real cart or shop data. */
export function PosDemo() {
  const [cart, setCart] = useState<DemoCart>(INITIAL)
  const [query, setQuery] = useState('')
  const [cash, setCash] = useState('20000')
  const [paid, setPaid] = useState(false)
  const [touched, setTouched] = useState(false)
  const [visible, setVisible] = useState(false)
  const total = demoTotal(cart)
  const cashValue = Number(cash) || 0
  const filtered = DEMO_PRODUCTS.filter((product) => product.name.toLowerCase().includes(query.toLowerCase()))
  const count = Object.values(cart).reduce((sum, qty) => sum + (qty ?? 0), 0)

  useEffect(() => {
    const node = document.getElementById('pos-demo')
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.3 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (touched || !visible || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let step = 0
    const timer = window.setInterval(() => {
      setCart(step++ % 2 === 0 ? { indomie: 2, aqua: 1 } : INITIAL)
    }, 2600)
    return () => window.clearInterval(timer)
  }, [touched, visible])

  function update(id: (typeof DEMO_PRODUCTS)[number]['id'], delta: number) {
    setTouched(true)
    setPaid(false)
    setCart((previous) => changeQty(previous, id, delta))
  }

  return (
    <div id="pos-demo" className="overflow-hidden rounded-[30px] bg-surface shadow-level3" aria-label="Demo kasir interaktif; data hanya contoh">
      <div className="flex items-center justify-between gap-2 border-b border-divider px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-on-primary"><IconShoppingCart size={18} aria-hidden /></span>
          <span className="min-w-0"><span className="block truncate text-sm font-bold">Warung Sari</span><span className="block text-xs text-mute">Demo interaktif · tidak membuat transaksi</span></span>
        </div>
        <span className="shrink-0 rounded-full bg-primary-subtle px-2.5 py-1 text-xs font-bold text-on-primary">Kasir aktif</span>
      </div>
      <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(180px,0.72fr)]">
        <div className="min-w-0 p-3 sm:p-4">
          <label className="relative block">
            <IconSearch size={17} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
            <span className="sr-only">Cari produk demo</span>
            <input value={query} onChange={(event) => { setTouched(true); setQuery(event.target.value) }} type="search" placeholder="Cari produk…" className="h-11 w-full rounded-xl border border-divider bg-surface-muted pl-9 pr-3 text-sm outline-none placeholder:text-mute focus:border-link" />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {filtered.map((product) => (
              <button key={product.id} type="button" onClick={() => update(product.id, 1)} aria-label={`Tambah ${product.name}, ${formatIDR(product.price)}`} className="group min-w-0 rounded-2xl border border-divider bg-surface p-2 text-left transition duration-150 hover:-translate-y-0.5 hover:shadow-level3 motion-reduce:transform-none">
                <img src={IMAGES[product.image]} alt="" loading="eager" className="aspect-[4/3] w-full rounded-xl bg-surface-muted object-cover" />
                <span className="mt-2 block truncate text-xs font-bold">{product.name}</span>
                <span className="block font-mono text-xs font-semibold text-link">{formatIDR(product.price)}</span>
              </button>
            ))}
          </div>
          {filtered.length === 0 && <p className="py-10 text-center text-sm text-mute">Produk tidak ditemukan. Coba nama lain.</p>}
        </div>
        <div className="flex min-w-0 flex-col border-t border-divider bg-surface-muted p-3 sm:p-4 md:border-l md:border-t-0">
          <div className="flex items-center justify-between"><p className="text-sm font-bold">Keranjang</p><span className="font-mono text-xs text-mute">{count} produk</span></div>
          <div className="mt-4 min-h-20 flex-1 space-y-3">
            {DEMO_PRODUCTS.filter((product) => cart[product.id]).map((product) => (
              <div key={product.id} className="flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0"><p className="truncate font-semibold">{product.name}</p><p className="font-mono text-mute">{formatIDR(product.price)}</p></div>
                <div className="flex shrink-0 items-center gap-1 rounded-full bg-surface shadow-level1">
                  <button type="button" onClick={() => update(product.id, -1)} aria-label={`Kurangi ${product.name}`} className="grid size-9 place-items-center rounded-full hover:bg-primary-subtle"><IconMinus size={14} /></button>
                  <span className="min-w-3 text-center font-mono font-bold">{cart[product.id]}</span>
                  <button type="button" onClick={() => update(product.id, 1)} aria-label={`Tambah ${product.name}`} className="grid size-9 place-items-center rounded-full hover:bg-primary-subtle"><IconPlus size={14} /></button>
                </div>
              </div>
            ))}
            {count === 0 && <p className="text-sm text-mute">Ketuk produk untuk mulai.</p>}
          </div>
          <div className="mt-5 border-t border-divider pt-3">
            <div className="flex items-center justify-between font-bold"><span>Total</span><output aria-live="polite" className="font-mono">{formatIDR(total)}</output></div>
            <label className="mt-3 block text-xs font-semibold" htmlFor="demo-cash">Tunai diterima</label>
            <div className="mt-1 flex items-center rounded-xl border border-divider bg-surface px-3 focus-within:border-link"><span className="font-mono text-sm text-mute">Rp</span><input id="demo-cash" inputMode="numeric" type="number" min="0" value={cash} onChange={(event) => { setTouched(true); setPaid(false); setCash(event.target.value) }} className="h-11 w-full min-w-0 bg-transparent pl-2 font-mono text-sm font-bold outline-none" /></div>
            <p className="mt-2 flex justify-between text-xs"><span>Kembalian</span><output aria-live="polite" className="font-mono font-bold">{formatIDR(demoChange(cart, cashValue))}</output></p>
            <button type="button" disabled={total === 0 || cashValue < total} onClick={() => { setTouched(true); setPaid(true) }} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-bold text-white hover:bg-secondary-hover disabled:cursor-not-allowed disabled:opacity-40">{paid ? <><IconCheck size={17} /> Transaksi contoh selesai</> : 'Bayar (demo)'}</button>
            {total > 0 && cashValue < total && <p className="mt-2 text-xs text-danger" role="status">Tunai kurang {formatIDR(total - cashValue)}. Tambah nominal untuk membayar.</p>}
            {paid && <button type="button" onClick={() => { setTouched(true); setCart({}); setCash(''); setPaid(false) }} className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-1 text-xs font-semibold text-link"><IconRefresh size={15} /> Transaksi contoh baru</button>}
          </div>
        </div>
      </div>
    </div>
  )
}
