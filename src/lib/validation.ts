import { z } from 'zod'

/**
 * Central input validation and sanitisation.
 *
 * Every value that reaches storage, a URL, or a server function passes through
 * one of these schemas. Two layers protect against HTML/script injection:
 *
 * 1. **Sanitise on input** (this module) — control characters and angle
 *    brackets are removed, whitespace collapsed, length bounded. Stored data is
 *    therefore already inert.
 * 2. **Escape on output** — React escapes all interpolated text, and the app
 *    never uses `dangerouslySetInnerHTML`, so markup can never be interpreted.
 *
 * Layer 1 alone would be enough for stored XSS; layer 2 is what makes the
 * escaping guarantee independent of this file.
 */

/** Longest accepted free-text field. Keeps storage bounded and UI intact. */
const MAX_TEXT = 120
const MAX_NOTE = 240
const MAX_EMAIL = 254

/**
 * Removes characters that carry no legitimate meaning in a shop label but do
 * enable markup, control-sequence, and homoglyph tricks: `<`, `>`, backticks,
 * and C0/C1 control characters (including NUL and newlines).
 */
function stripUnsafe(value: string): string {
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
    .replace(/[<>`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Bounded, markup-free single-line text. Optional fields collapse to
 * `undefined` when empty so storage stays tidy.
 */
export function cleanText(max = MAX_TEXT) {
  return z
    .string()
    .transform(stripUnsafe)
    .pipe(z.string().max(max, `Maksimal ${max} karakter`))
    .transform((value) => (value === '' ? undefined : value))
}

/** Bounded, markup-free text that must be present. */
export function requiredText(max = MAX_TEXT, label = 'Wajib diisi') {
  return z
    .string()
    .transform(stripUnsafe)
    .pipe(z.string().min(1, label).max(max, `Maksimal ${max} karakter`))
}

/** Multi-line note: newlines preserved, markup still removed. */
export const noteText = z
  .string()
  .transform((value) =>
    value
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, ' ')
      .replace(/[<>`]/g, '')
      .split('\n')
      .map((line) => line.replace(/[ \t]+/g, ' ').trim())
      .join('\n')
      .trim(),
  )
  .pipe(z.string().max(MAX_NOTE, `Maksimal ${MAX_NOTE} karakter`))
  .transform((value) => (value === '' ? undefined : value))

/** Whole rupiah, non-negative, within a sane bound for a warung. */
export const rupiah = z
  .number({ error: 'Harus berupa angka' })
  .int('Harus bilangan bulat')
  .min(0, 'Tidak boleh negatif')
  .max(1_000_000_000, 'Nilai terlalu besar')

/** Positive whole rupiah, for prices. */
export const priceRupiah = rupiah.min(1, 'Harga harus lebih dari 0')

/** Quantity: positive whole number. */
export const quantity = z.number().int('Harus bilangan bulat').min(1, 'Minimal 1')

/** Numeric form field: accepts the raw string, yields a validated number. */
export function numberField(schema: z.ZodType<number, number>) {
  return z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(1, 'Wajib diisi'))
    .transform((value) => Number(value))
    .pipe(schema)
}

/** Percent discount: 0–100. */
export const discountPercent = z
  .number()
  .int('Harus bilangan bulat')
  .min(0, 'Tidak boleh negatif')
  .max(100, 'Maksimal 100%')

/** Email, lower-cased and length-bounded. */
export const email = z
  .string()
  .transform((value) => value.trim().toLowerCase())
  .pipe(z.string().min(1, 'Email wajib diisi').max(MAX_EMAIL, 'Email terlalu panjang'))
  .pipe(z.email('Format email tidak valid'))

export const paymentMethod = z.enum(['tunai', 'qris', 'transfer'])

/**
 * The ONE wire schema for a line-item snapshot (cart saves, legacy import).
 * Display-only data: checkout re-prices from the catalog (ADR-0003).
 */
export const orderItemSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1),
  emoji: z.string(),
  price: z.number().int().min(0),
  qty: z.number().int().min(1),
  cost: z.number().int().min(0),
})
export const salesChannel = z.enum(['dine-in', 'bungkus', 'ojol'])
export const productCategory = z.enum(['makanan', 'minuman', 'snack'])
export const dayKey = z.string().regex(/^\d{1,4}-\d{1,2}-\d{1,2}$/, 'Format tanggal tidak valid')

/** Human name: letters, digits, and common punctuation only. */
export const personName = z
  .string()
  .transform(stripUnsafe)
  .pipe(
    z
      .string()
      .min(2, 'Minimal 2 karakter')
      .max(60, 'Maksimal 60 karakter')
      .regex(/^[\p{L}\p{N} .,'’-]+$/u, 'Hanya huruf, angka, dan tanda baca umum'),
  )

/**
 * Password policy. Not trimmed and not sanitised: whitespace is meaningful and
 * removing characters would silently weaken a legitimate passphrase.
 */
export const password = z
  .string()
  .min(8, 'Minimal 8 karakter')
  .max(128, 'Maksimal 128 karakter')

/** SKU / barcode: short, printable, no separators that break storage keys. */
export const skuCode = z
  .string()
  .transform((value) => value.replace(/[^A-Za-z0-9-]/g, '').toUpperCase())
  .pipe(z.string().max(32, 'Maksimal 32 karakter'))
  .transform((value) => (value === '' ? undefined : value))

export const barcodeCode = z
  .string()
  .transform((value) => value.replace(/[^0-9]/g, ''))
  .pipe(z.string().max(32, 'Maksimal 32 karakter'))
  .transform((value) => (value === '' ? undefined : value))

/* ------------------------------------------------------------------ *
 * Form schemas
 * ------------------------------------------------------------------ */

export const productDraftSchema = z.object({
  name: requiredText(MAX_TEXT, 'Nama produk wajib diisi'),
  price: numberField(priceRupiah),
  cost: numberField(rupiah),
  category: productCategory,
  emoji: cleanText(8).transform((value) => value ?? '📦'),
  stock: z
    .string()
    .transform((value) => value.trim())
    .transform((value) => (value === '' ? null : Number(value)))
    .pipe(z.union([z.null(), rupiah])),
  lowStockThreshold: numberField(rupiah),
  sku: skuCode,
  barcode: barcodeCode,
})
export type ProductDraft = z.infer<typeof productDraftSchema>

export const checkoutSchema = z
  .object({
    paymentMethod,
    channel: salesChannel,
    cashier: cleanText(60),
    discountAmount: rupiah,
    discountPercent: z.union([discountPercent, z.null()]),
    /** Cash tendered; required only for cash payments. */
    cashTendered: z.union([rupiah, z.null()]),
    total: rupiah,
  })
  .refine((value) => value.paymentMethod !== 'tunai' || value.cashTendered !== null, {
    message: 'Uang diterima wajib diisi untuk pembayaran tunai',
    path: ['cashTendered'],
  })
  .refine(
    (value) =>
      value.paymentMethod !== 'tunai' ||
      value.cashTendered === null ||
      value.cashTendered >= value.total,
    { message: 'Uang diterima kurang dari total bayar', path: ['cashTendered'] },
  )
export type CheckoutInput = z.infer<typeof checkoutSchema>

/**
 * Wire form of the checkout payload.
 *
 * The browser sends what the form actually holds — strings — and the server
 * converts them with `checkoutSchema` before touching the database. Keeping the
 * two apart means the transport type never has to equal the domain type.
 */
export const checkoutFormSchema = z.object({
  paymentMethod,
  channel: salesChannel,
  cashier: z.string().max(200),
  discountMode: z.enum(['rupiah', 'persen']),
  discountInput: z.string().max(20),
  cashInput: z.string().max(20),
  total: rupiah,
})

/** Converts the raw form payload into the validated domain value. */
export function parseCheckoutForm(form: z.infer<typeof checkoutFormSchema>): CheckoutInput {
  const parsedNumber = (raw: string): number => {
    const trimmed = raw.trim()
    if (trimmed === '') return 0
    const value = Number(trimmed)
    return Number.isFinite(value) ? value : Number.NaN
  }
  return checkoutSchema.parse({
    paymentMethod: form.paymentMethod,
    channel: form.channel,
    cashier: form.cashier,
    discountAmount: form.discountMode === 'rupiah' ? parsedNumber(form.discountInput) : 0,
    discountPercent: form.discountMode === 'persen' ? parsedNumber(form.discountInput) : null,
    cashTendered: form.cashInput.trim() === '' ? null : parsedNumber(form.cashInput),
    total: form.total,
  })
}

/** Wire form of the shift payloads. */
export const openingCashFormSchema = z.object({ openingCash: z.string().max(20) })
export const shiftCloseFormSchema = z.object({
  countedCash: z.string().max(20),
  note: z.string().max(300),
})

/** Domain forms: the server converts the wire payload with these. */
export const openingCashSchema = z.object({
  openingCash: z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(1, 'Modal awal wajib diisi'))
    .transform((value) => Number(value))
    .pipe(rupiah),
})

export const shiftCloseSchema = z.object({
  countedCash: z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(1, 'Jumlah kas wajib diisi'))
    .transform((value) => Number(value))
    .pipe(rupiah),
  note: noteText,
})

export const registerSchema = z
  .object({
    name: personName,
    email,
    password,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Konfirmasi kata sandi tidak cocok',
    path: ['confirmPassword'],
  })
export type RegisterInput = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Kata sandi wajib diisi'),
})
export type LoginInput = z.infer<typeof loginSchema>
