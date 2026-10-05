import { IconBuildingStore } from '@tabler/icons-react'
import { CHANNEL_LABELS, PAYMENT_LABELS } from '../data/products'
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

      <dl className="space-y-1 text-xs text-slate-500">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd className="tabular">{formatIDR(order.subtotal)}</dd>
        </div>
        {order.discount > 0 && (
          <div className="flex justify-between text-red-600">
            <dt>Diskon</dt>
            <dd data-testid="receipt-discount" className="tabular">
              −{formatIDR(order.discount)}
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-900">Total</span>
        <span data-testid="receipt-total" className="tabular text-xl font-bold text-brand-600">
          {formatIDR(order.total)}
        </span>
      </div>

      <dl className="mt-2 space-y-1 text-xs text-slate-500">
        <div className="flex justify-between">
          <dt>Metode</dt>
          <dd>{PAYMENT_LABELS[order.paymentMethod]}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Jenis</dt>
          <dd data-testid="receipt-channel">{CHANNEL_LABELS[order.channel]}</dd>
        </div>
        {order.cashier && (
          <div className="flex justify-between">
            <dt>Kasir</dt>
            <dd>{order.cashier}</dd>
          </div>
        )}
        {order.amountPaid !== null && (
          <div className="flex justify-between">
            <dt>Tunai</dt>
            <dd data-testid="receipt-paid" className="tabular">
              {formatIDR(order.amountPaid)}
            </dd>
          </div>
        )}
        {order.change !== null && (
          <div className="flex justify-between font-semibold text-slate-700">
            <dt>Kembalian</dt>
            <dd data-testid="receipt-change" className="tabular">
              {formatIDR(order.change)}
            </dd>
          </div>
        )}
      </dl>

      <p className="mt-5 text-center text-xs text-slate-400">Terima kasih telah berbelanja</p>
    </div>
  )
}
