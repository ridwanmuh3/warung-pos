import { IconBuildingStore } from '@tabler/icons-react'
import { PAYMENT_LABELS } from '../data/products'
import { formatDateTime, formatIDR } from '../lib/format'
import { lineSubtotal } from '../lib/totals'
import type { Order } from '../types'

export function Receipt({ order }: { order: Order }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-center">
        <p className="flex items-center justify-center gap-1.5 text-lg font-bold">
          <IconBuildingStore size={20} stroke={2} />
          Warung POS
        </p>
        <p className="text-xs text-slate-500">Struk transaksi</p>
        <p className="tabular mt-1 text-xs text-slate-500">
          {order.orderNumber} · {formatDateTime(order.createdAt)}
        </p>
      </div>

      <div className="my-4 border-t border-dashed border-slate-300" />

      <ul className="space-y-2 text-sm">
        {order.items.map((item) => (
          <li key={item.productId}>
            <div className="flex justify-between gap-3">
              <span className="font-medium text-slate-900">{item.name}</span>
              <span className="tabular font-semibold text-slate-900">{formatIDR(lineSubtotal(item))}</span>
            </div>
            <div className="tabular text-xs text-slate-500">
              {formatIDR(item.price)} × {item.qty}
            </div>
          </li>
        ))}
      </ul>

      <div className="my-4 border-t border-dashed border-slate-300" />

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-900">Total</span>
        <span data-testid="receipt-total" className="tabular text-xl font-bold text-brand-600">
          {formatIDR(order.total)}
        </span>
      </div>
      <div className="mt-2 flex justify-between text-xs text-slate-500">
        <span>Metode</span>
        <span>{PAYMENT_LABELS[order.paymentMethod]}</span>
      </div>

      <p className="mt-5 text-center text-xs text-slate-400">Terima kasih telah berbelanja</p>
    </div>
  )
}
