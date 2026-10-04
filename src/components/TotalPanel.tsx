import type { ReactNode } from 'react'
import { formatIDR } from '../lib/format'
import { itemsCount, itemsTotal } from '../lib/totals'
import type { OrderItem } from '../types'

/**
 * The running total helper: shows item count, subtotal breakdown and the
 * grand total the admin collects from the customer.
 */
export function TotalPanel({
  items,
  className = '',
  footer,
}: {
  items: OrderItem[]
  className?: string
  footer?: ReactNode
}) {
  const total = itemsTotal(items)
  const itemCount = itemsCount(items)

  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>Jumlah item</span>
        <span className="tabular font-medium text-slate-700">{itemCount} pcs</span>
      </div>
      <div className="mt-2 flex items-center justify-between text-sm text-slate-500">
        <span>Subtotal</span>
        <span className="tabular font-medium text-slate-700">{formatIDR(total)}</span>
      </div>
      <div className="my-3 border-t border-dashed border-slate-200" />
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-900">Total</span>
        <span data-testid="grand-total" className="tabular text-2xl font-bold text-brand-600">
          {formatIDR(total)}
        </span>
      </div>
      {footer && <div className="mt-4">{footer}</div>}
    </div>
  )
}
