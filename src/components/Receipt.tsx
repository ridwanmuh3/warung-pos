import { IconBuildingStore } from '@tabler/icons-react'
import { CHANNEL_LABELS, PAYMENT_LABELS } from '../data/products'
import { formatDateTime, formatIDR } from '../lib/format'
import { lineSubtotal } from '../lib/totals'
import { useTenant } from '../lib/useTenant'
import type { Order } from '../types'
import { ProductImage } from './ProductImage'

export function Receipt({ order }: { order: Order }) {
  const { context } = useTenant()
  const shopName = context?.tenantName ?? 'Warung POS'

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface p-5 shadow-level1">
      <div className="text-center">
        <p className="flex items-center justify-center gap-1.5 text-lg font-bold">
          <IconBuildingStore size={20} stroke={2} />
          {shopName}
        </p>
        <p className="text-xs text-slate-500">Struk transaksi</p>
        <p className="tabular mt-1 text-xs text-slate-500">
          {order.orderNumber} · {formatDateTime(order.createdAt)}
        </p>
      </div>

      <div className="my-4 border-t border-dashed border-slate-300" />

      <ul className="space-y-2 text-sm">
        {order.items.map((item) => (
          <li key={item.productId} className="flex items-start gap-2.5">
            <ProductImage imageKey={item.imageKey} alt={item.name} className="size-9" iconSize={16} />
            <div className="min-w-0 flex-1">
              <div className="flex justify-between gap-3">
                <span className="font-medium text-slate-900">{item.name}</span>
                <span className="tabular font-semibold text-slate-900">{formatIDR(lineSubtotal(item))}</span>
              </div>
              <div className="tabular text-xs text-slate-500">
                {formatIDR(item.price)} × {item.qty}
              </div>
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
        {order.customerName && (
          <div className="flex justify-between gap-3">
            <dt>Pelanggan</dt>
            <dd className="min-w-0 truncate text-right font-medium text-slate-700">{order.customerName}</dd>
          </div>
        )}
        {order.paymentMethod === 'credit' && (
          <div>
            <div className="flex justify-between gap-3">
              <dt>Status Utang</dt>
              <dd
                data-testid="receipt-settlement"
                className={`font-semibold ${
                  order.settlementStatus === 'settled' ? 'text-brand-700' : 'text-amber-700'
                }`}
              >
                {order.settlementStatus === 'settled' ? 'LUNAS' : 'BELUM DIBAYAR'}
              </dd>
            </div>
            {order.settlementStatus === 'settled' && order.settledAt && (
              <div className="mt-0.5 flex justify-between gap-3 text-[11px] text-mute">
                <dt>Dilunasi</dt>
                <dd className="text-right">
                  {formatDateTime(order.settledAt)}
                  {order.settledPaymentMethod ? ` · ${PAYMENT_LABELS[order.settledPaymentMethod]}` : ''}
                </dd>
              </div>
            )}
          </div>
        )}
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

      <p className="mt-5 text-center text-xs text-mute">Terima kasih telah berbelanja</p>
    </div>
  )
}
