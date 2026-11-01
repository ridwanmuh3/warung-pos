# Konvensi API

Aturan penamaan untuk permukaan API Warung POS. Tujuannya satu: apa pun yang
dibaca mesin (URL, query param, payload, nilai enum, nama fungsi) berbahasa
Inggris; apa pun yang dibaca manusia (teks UI, label, pesan validasi) tetap
berbahasa Indonesia.

## Route

- kebab-case dan English: `/order-success/$orderId`, bukan `/sukses/$orderId`.
- Koleksi memakai bentuk plural: `/products`, `/orders`, `/members`.
- Route yang sudah tidak dipakai tidak dihapus diam-diam; tambahkan pemetaan di
  `src/lib/legacy-routes.ts` agar URL lama mendapat redirect permanen 301.
- URL publik (`/privacy`, `/terms`, `/login`) ikut aturan yang sama.

## Query param

- lowerCamelCase dan sama di semua halaman:
  - `q` untuk pencarian teks
  - `day` untuk tanggal (`YYYY-M-D`)
  - `category`, `lowStock` untuk filter katalog
  - `tab=today|daily`, `method`, `channel` untuk laporan/riwayat
- Nilai enum English dan lowercase: `all`, `food`, `drink`, `snack`, `cash`,
  `qris`, `transfer`, `dine-in`, `takeaway`, `delivery`.

## Payload RPC

- lowerCamelCase: `tenantName`, `cashTendered`, `paymentMethod`.
- Server function: `verbNounFn` (`listProductsFn`, `checkoutFn`).
- Skema wire diberi akhiran `FormSchema`; skema domain tanpa akhiran
  (`checkoutFormSchema` → `checkoutSchema`).
- Validasi dan sanitasi tetap di `src/lib/validation.ts`; pesan validasi
  berbahasa Indonesia karena ditampilkan ke pengguna.

## Enum domain

Satu sumber kebenaran, berurutan: `src/types.ts` → `src/lib/validation.ts` →
`src/db/schema.ts`. Nilai yang tersimpan di database sama dengan nilai wire.

| Domain | Nilai |
| --- | --- |
| `ProductCategory` | `food`, `drink`, `snack` |
| `PaymentMethod` | `cash`, `qris`, `transfer` |
| `SalesChannel` | `dine-in`, `takeaway`, `delivery` |
| `OrderStatus` | `paid`, `void`, `refunded` |
| `CartStatus` | `open`, `parked`, `checked_out` |
| `StockMovementReason` | `sale`, `restock`, `adjust`, `void`, `refund` |

Label Indonesia untuk nilai di atas hanya ada di `src/data/products.ts`
(`CATEGORY_LABELS`, `PAYMENT_LABELS`, `CHANNEL_LABELS`).

## Yang tidak diubah

- Tabel dan kolom database sudah English.
- Key `localStorage` `warung-pos.*` dipertahankan agar data pengguna lama tetap
  terbaca; importer memetakan nilai lama ke nilai baru.
- Dokumentasi dan komentar boleh berbahasa Indonesia.
