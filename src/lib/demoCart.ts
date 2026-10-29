export const DEMO_PRODUCTS = [
  { id: 'indomie', name: 'Indomie Goreng', price: 3500, image: 'indomie' },
  { id: 'aqua', name: 'Aqua 600ml', price: 4000, image: 'aqua' },
  { id: 'chitato', name: 'Chitato 68g', price: 11000, image: 'chitato' },
  { id: 'cokelat', name: 'Cadbury Dairy Milk', price: 15000, image: 'cokelat' },
] as const

export type DemoId = (typeof DEMO_PRODUCTS)[number]['id']
export type DemoCart = Partial<Record<DemoId, number>>

export function changeQty(cart: DemoCart, id: DemoId, delta: number): DemoCart {
  const qty = Math.max(0, Math.min(99, (cart[id] ?? 0) + delta))
  const next = { ...cart }
  if (qty === 0) delete next[id]
  else next[id] = qty
  return next
}

export function demoTotal(cart: DemoCart): number {
  return DEMO_PRODUCTS.reduce((sum, product) => sum + product.price * (cart[product.id] ?? 0), 0)
}

export function demoChange(cart: DemoCart, cash: number): number {
  return Math.max(0, cash - demoTotal(cart))
}
