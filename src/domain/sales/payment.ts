import type { PaymentMethod, SettlementStatus } from '../../types'
import { AppError } from '../../shared/lib/app-error'

/**
 * Payment rules — cash cover, change, and the credit axis.
 *
 * ADR-0008: credit is a separate axis from order status. A `credit` sale is a
 * valid paid sale that leaves the drawer untouched and creates a receivable.
 *
 * Pure: the caller supplies the authoritative total. Change is derived here,
 * never trusted from the client. Expected failures throw `AppError` with code
 * `payment-invalid` so the checkout RPC can return a typed outcome.
 */

export interface PaymentIntent {
  paymentMethod: PaymentMethod
  /** Server-computed order total. */
  total: number
  /** Cash tendered; ignored for non-cash methods. */
  amountPaid?: number | null
  /** Required for `credit`, ignored otherwise. */
  customerName?: string | null
}

export interface ValidatedPayment {
  amountPaid: number | null
  change: number | null
  /** Trimmed name; empty string when not a credit sale. */
  customerName: string
  settlementStatus: SettlementStatus
}

/**
 * Methods a new checkout may use. `transfer` stays in the type and database
 * enum so historical rows still render, but it is no longer offered or
 * accepted: the MVP is cash, Xendit QRIS, and credit.
 */
export const ENABLED_PAYMENT_METHODS = ['cash', 'qris', 'credit'] as const

export function isEnabledPaymentMethod(method: PaymentMethod): boolean {
  return (ENABLED_PAYMENT_METHODS as readonly PaymentMethod[]).includes(method)
}

export function validatePayment({
  paymentMethod,
  total,
  amountPaid,
  customerName,
}: PaymentIntent): ValidatedPayment {
  const isCash = paymentMethod === 'cash'
  const isCredit = paymentMethod === 'credit'
  const name = customerName?.trim() ?? ''

  if (!isEnabledPaymentMethod(paymentMethod)) {
    throw new AppError('payment-invalid', 'Metode pembayaran ini sudah tidak tersedia')
  }

  if (isCredit && name === '') {
    throw new AppError('payment-invalid', 'Nama pelanggan wajib diisi untuk pembayaran ngutang')
  }

  const tendered = amountPaid ?? null
  if (isCash && (tendered === null || tendered < total)) {
    throw new AppError('payment-invalid', 'Uang diterima kurang dari total bayar')
  }

  return {
    amountPaid: isCash ? tendered : null,
    change: isCash && tendered !== null ? tendered - total : null,
    customerName: name,
    settlementStatus: isCredit ? 'unsettled' : 'settled',
  }
}
