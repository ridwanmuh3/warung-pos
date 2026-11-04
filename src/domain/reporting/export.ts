import type { PaymentMethod, SalesChannel } from '../../types'
import { formatDateTime, formatIDR } from '../../lib/format'
import type { SalesSummary } from './summary'
import { systemClock, type Clock } from '../time/business-day'

/**
 * Reporting exports: spreadsheet CSV and the printed Z-report.
 *
 * Both are pure string builders. Labels are injected by the caller because
 * domain modules must not import UI text; the same rule keeps a future report
 * language or tenant label override out of the money rules.
 */

export interface ReportLabels {
  payment: Record<PaymentMethod, string>
  channel: Record<SalesChannel, string>
}

/**
 * Escapes one CSV field.
 *
 * Numbers stay numbers (so negative rupiah values remain numeric), while text
 * beginning with a spreadsheet formula introducer gets a leading apostrophe.
 * This is the CSV-injection defence: a product named `=HYPERLINK(...)` is data,
 * not a formula. Quotes/commas/newlines are still quoted per RFC 4180.
 */
export function csvField(value: string | number): string {
  if (typeof value === 'number') return String(value)
  const guarded = /^[\u0000-\u0020]*[=+\-@]|^[\t\r]/.test(value) ? `'${value}` : value // eslint-disable-line no-control-regex
  return /[",\n\r]/.test(guarded) ? `"${guarded.replaceAll('"', '""')}"` : guarded
}

function csvRow(values: Array<string | number>): string {
  return values.map(csvField).join(',')
}

/** Line-item CSV for spreadsheet analysis of one day. */
export function dailyOrdersCsv(report: SalesSummary, labels: ReportLabels): string {
  const lines = [
    csvRow([
      'Nomor',
      'Waktu',
      'Status',
      'Metode',
      'Jenis',
      'Kasir',
      'Produk',
      'Qty',
      'Harga',
      'HPP',
      'Subtotal',
      'Diskon',
      'Total',
      'Laba',
    ]),
  ]
  for (const order of report.orders) {
    for (const item of order.items) {
      lines.push(
        csvRow([
          order.orderNumber,
          formatDateTime(order.createdAt),
          order.status,
          labels.payment[order.paymentMethod],
          labels.channel[order.channel],
          order.cashier ?? '',
          item.name,
          item.qty,
          item.price,
          item.cost,
          item.price * item.qty,
          order.discount,
          order.total,
          order.profit,
        ]),
      )
    }
  }
  return lines.join('\n')
}

/** Human-readable Z-report: the printed end-of-day summary. */
export function zReportText(
  report: SalesSummary,
  dayLabel: string,
  labels: ReportLabels,
  clock: Clock = systemClock,
): string {
  const lines = [
    'WARUNG POS — LAPORAN TUTUP HARIAN',
    `Tanggal   : ${dayLabel}`,
    `Dicetak   : ${formatDateTime(clock.now().toISOString())}`,
    '',
    `Transaksi : ${report.paid.length} (void: ${report.voided.length}, refund: ${report.refunded.length})`,
    `Item      : ${report.itemCount} pcs`,
    '',
    `Omzet     : ${formatIDR(report.revenue)}`,
    `HPP       : ${formatIDR(report.costTotal)}`,
    `Laba      : ${formatIDR(report.profit)}`,
    `Diskon    : ${formatIDR(report.discountTotal)}`,
    `Piutang   : ${formatIDR(report.receivableTotal)} (${report.receivables.length} transaksi)`,
    '',
    'PEMBAYARAN',
  ]
  for (const row of report.byPayment) {
    lines.push(
      `  ${labels.payment[row.method].padEnd(14)} ${String(row.count).padStart(3)}x  ${formatIDR(row.total)}`,
    )
  }
  lines.push('', 'JENIS PESANAN')
  for (const row of report.byChannel) {
    lines.push(
      `  ${labels.channel[row.channel].padEnd(14)} ${String(row.count).padStart(3)}x  ${formatIDR(row.total)}`,
    )
  }
  if (report.shifts.length > 0) {
    lines.push('', 'KAS')
    lines.push(`  Kas seharusnya : ${formatIDR(report.cashExpected)}`)
    lines.push(`  Kas dihitung   : ${formatIDR(report.cashCounted)}`)
    lines.push(`  Selisih        : ${report.cashVariance > 0 ? '+' : ''}${formatIDR(report.cashVariance)}`)
  }
  lines.push('', `Total bersih: ${formatIDR(report.revenue)}`)
  return lines.join('\n')
}
