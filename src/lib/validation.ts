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

/** Upper bounds for values that cross an RPC boundary. */
export const MAX_ENTITY_ID = 100
export const MAX_LINE_ITEMS = 200
export const MAX_LINE_QTY = 10_000
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

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

/** Quantity: positive whole number, bounded so one line cannot exhaust integer space. */
export const quantity = z
  .number()
  .int('Harus bilangan bulat')
  .min(1, 'Minimal 1')
  .max(MAX_LINE_QTY, `Maksimal ${MAX_LINE_QTY}`)

/** Numeric form field: accepts the raw string, yields a validated number. */
export function numberField(schema: z.ZodType<number, number>) {
  return z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(1, 'Wajib diisi'))
    .transform((value) => Number(value))
    .pipe(schema)
}

/** Numeric form field where a blank input means zero (e.g. optional HPP). */
export function blankAsZeroField(schema: z.ZodType<number, number>) {
  return z
    .string()
    .transform((value) => value.trim())
    .transform((value) => (value === '' ? 0 : Number(value)))
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

export const paymentMethod = z.enum(['cash', 'qris', 'transfer'])

/** Opaque row id from the database; bounded before it reaches a query. */
export const entityId = z
  .string()
  .trim()
  .min(1, 'ID wajib diisi')
  .max(MAX_ENTITY_ID, 'ID terlalu panjang')

/**
 * R2 object key. Product uploads live under `products/`, shared seed images
 * under `seed/`; traversal and foreign schemes are rejected before storage.
 */
export const imageKeySchema = z
  .string()
  .trim()
  .max(200, 'Kunci gambar terlalu panjang')
  .regex(/^(?:seed|products)\/[A-Za-z0-9][A-Za-z0-9/_.-]*$/, 'Kunci gambar tidak valid')
  .refine((value) => !value.includes('..') && !value.includes('//'), 'Kunci gambar tidak valid')
  .nullable()

/** Query-string redirect target: only an internal absolute path is allowed. */
export function safeInternalPath(value: string | null | undefined): string | null {
  if (!value) return null
  const path = value.trim()
  if (path.length === 0 || path.length > 2048) return null
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return null
  if (/%2f|%5c/i.test(path)) return null
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F]/.test(path)) return null
  return path
}

export const redirectPath = z
  .string()
  .max(2048)
  .transform((value) => safeInternalPath(value) ?? undefined)
  .optional()
  .catch(undefined)

/**
 * The ONE wire schema for a line-item snapshot (cart saves, legacy import).
 * Display-only data: checkout re-prices from the catalog (ADR-0003).
 */
export const orderItemSchema = z.object({
  productId: entityId,
  name: requiredText(MAX_TEXT, 'Nama item wajib diisi'),
  imageKey: imageKeySchema,
  price: rupiah,
  qty: quantity,
  cost: rupiah,
})

/** A cart or an imported order can never contain an unbounded line list. */
export const orderItemsSchema = z.array(orderItemSchema).max(MAX_LINE_ITEMS, 'Terlalu banyak item')
export const salesChannel = z.enum(['dine-in', 'takeaway', 'delivery'])
export const productCategory = z.enum(['food', 'drink', 'snack'])
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
  cost: blankAsZeroField(rupiah),
  category: productCategory,
  /** R2 object key; null removes the image. */
  imageKey: imageKeySchema.optional().default(null),
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
  .refine((value) => value.paymentMethod !== 'cash' || value.cashTendered !== null, {
    message: 'Uang diterima wajib diisi untuk pembayaran tunai',
    path: ['cashTendered'],
  })
  .refine(
    (value) =>
      value.paymentMethod !== 'cash' ||
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
  discountMode: z.enum(['amount', 'percent']),
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
    discountAmount: form.discountMode === 'amount' ? parsedNumber(form.discountInput) : 0,
    discountPercent: form.discountMode === 'percent' ? parsedNumber(form.discountInput) : null,
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

/** Shop label shown across the app and on receipts. */
export const tenantName = requiredText(60, 'Nama warung wajib diisi')

export const registerSchema = z
  .object({
    name: personName,
    email,
    password,
    confirmPassword: z.string().max(128, 'Maksimal 128 karakter'),
    /** Optional so older clients (and tests) can still register. */
    tenantName: cleanText(60).optional(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Konfirmasi kata sandi tidak cocok',
    path: ['confirmPassword'],
  })
export type RegisterInput = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  email,
  password: z
    .string()
    .min(1, 'Kata sandi wajib diisi')
    .max(128, 'Maksimal 128 karakter'),
})
export type LoginInput = z.infer<typeof loginSchema>

/**
 * Destructive account deletion needs both the current password and a typed
 * word, so a stray click can never remove an account.
 */
export const deleteAccountSchema = z.object({
  password: z
    .string()
    .min(1, 'Kata sandi wajib diisi')
    .max(128, 'Maksimal 128 karakter'),
  confirmation: z
    .string()
    .trim()
    .refine((value) => value.toUpperCase() === 'HAPUS', 'Ketik HAPUS untuk melanjutkan'),
})
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>
