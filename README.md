# Warung POS

## 1. Project Overview

**Warung POS** adalah aplikasi kasir (point-of-sale) sederhana untuk warung, berbahasa Indonesia dan menggunakan mata uang Rupiah. Aplikasi berjalan sebagai **full-stack TanStack Start** dengan **full-document SSR**, sementara data produk dan pesanan tetap **local-first** (`localStorage`) — sesuai model aplikasi yang dipertahankan, belum ada backend/database.

Proyek ini merupakan **MVP**: fungsionalitas inti kasir sudah berjalan end-to-end (pilih produk → keranjang → checkout → struk → riwayat → ringkasan).

UI-nya *responsive*: nyaman dipakai di **mobile** (dengan tab bar bawah), **tablet**, maupun **desktop**.

## 2. Tech Stack

| Teknologi | Kegunaan |
| --------- | -------- |
| [TanStack Start](https://tanstack.com/start) | Framework full-stack (SSR, server functions, server routes) |
| [TanStack Router](https://tanstack.com/router) | **File-based routing** + validated search params + route loaders |
| [Nitro](https://nitro.build/) | Runtime target: Node.js (`.output/server/index.mjs`) |
| [Vite](https://vite.dev/) | Build tool & dev server |
| [React 19](https://react.dev/) | Library UI |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [Zod v4](https://zod.dev/) | Validasi search params & input server function |
| [Tailwind CSS v4](https://tailwindcss.com/) | Styling (via `@tailwindcss/vite`) |
| [@tabler/icons-react](https://tabler.io/icons) | Ikon antarmuka |
| [oxlint](https://oxc.rs/docs/guide/usage/linter) | Linting |
| pnpm | Package manager |

## 3. Arsitektur

### 3.1 Peta route (file-based, `src/routes/`)

| File | URL | Mode SSR | Alasan |
| ---- | --- | -------- | ------ |
| `__root.tsx` | — | `shellComponent` selalu SSR | Shell `<html>`/`<head>`/`<body>` (full-document SSR) |
| `index.tsx` | `/` | `false` | Katalog produk ada di `localStorage` |
| `keranjang.tsx` | `/keranjang` | `false` | State keranjang hanya di klien |
| `checkout.tsx` | `/checkout` | `false` | Bergantung keranjang klien |
| `sukses.$orderId.tsx` | `/sukses/$orderId` | `false` | Order dibaca dari `localStorage` |
| `riwayat.index.tsx` | `/riwayat` | `false` | Order ada di `localStorage`; loader mengembalikan hasil filter |
| `riwayat.$orderId.tsx` | `/riwayat/$orderId` | `false` | Struk dari `localStorage` |
| `produk.tsx` | `/produk` | `false` | Katalog ada di `localStorage` |
| `ringkasan.tsx` | `/ringkasan` | `data-only` | Loader SSR mengambil tanggal laporan otoritatif dari server; komponen (stat dari `localStorage`) dirender di klien |
| `laporan.tsx` | `/laporan` | `data-only` | Tanggal laporan dari server function; angka dari `localStorage` |
| `masuk.tsx` | `/masuk` | `false` | Akun ada di `localStorage`; form hanya bisa dirender di klien |
| `api.health.ts` | `/api/health` | server route | Probe runtime; membuktikan target deployment |

### 3.2 Batas server/client

- **`src/lib/*.server.ts`** — kode server-only (mis. `reporting.server.ts`). Dibungkus `createServerOnlyFn` sehingga pemanggilan dari klien gagal keras, bukan diam-diam bocor ke bundle.
- **`src/lib/*.functions.ts`** — `createServerFn` (RPC typed). Aman diimpor dari mana saja; bundler menggantinya dengan stub di klien.
- **`src/lib/*.ts`** — kode aman-klien (types, format, cart, orders, products).

### 3.3 Search params tervalidasi

- `/riwayat` → `q`, `method`, `channel`, `day`.
- `/produk` → `kategori`, `menipis`.
- `/ringkasan` → `day`; `/laporan` → `tanggal`; `/masuk` → `mode`, `redirect`.
- Semua skema memakai `.catch(...)` supaya nilai rusak **fallback**, bukan menampilkan error.

### 3.4 Streaming

`streamCategoryBreakdown` (server function) adalah **async generator** yang mengalirkan rincian penjualan per kategori satu per satu. Klien mengonsumsi dengan `for await` dan merender tiap baris begitu tiba (`src/routes/ringkasan.tsx` → `CategoryBreakdown`).

### 3.5 Autentikasi & Validasi Input

### Autentikasi

- **Register / Login / Logout** di route `/masuk` (mode `login` | `register`).
- **Server-authoritative:** kata sandi diverifikasi di server (PBKDF2-SHA-256, 210.000 iterasi, salt acak 16 byte per pengguna, perbandingan *constant-time*). Hash tidak pernah dikirim ke browser.
- **Sesi = cookie terenkripsi** (`warung-pos`, `httpOnly`, `sameSite=lax`, `secure` di produksi) yang dikelola TanStack Start. Browser tidak pernah memegang data sesi yang bisa dibaca atau dipalsukan.
- Pesan gagal login **identik** untuk email tidak dikenal dan kata sandi salah (anti-enumerasi akun).
- Instalasi baru (0 akun) otomatis diarahkan ke mode **Daftar**.

### Validasi & anti-injection (`src/lib/validation.ts`)

Seluruh input melewati satu modul Zod, dan **skema yang sama dipakai di klien dan di server**: server function memvalidasi ulang setiap payload, jadi request buatan tangan tidak bisa melewati aturan UI.

Dua lapis pertahanan:
1. **Sanitasi saat input** — karakter kontrol (C0/C1, NUL) dan karakter markup (`<`, `>`, backtick) dibuang, spasi dirapikan, panjang dibatasi.
2. **Escape saat output** — React meng-escape semua interpolasi; aplikasi tidak pernah memakai `dangerouslySetInnerHTML` (diverifikasi grep).

Skema *wire* (`checkoutFormSchema`, `openingCashFormSchema`, `shiftCloseFormSchema`) memisahkan bentuk transport dari bentuk domain (`checkoutSchema`, `openingCashSchema`, `shiftCloseSchema`), sehingga payload mentah dari browser tidak pernah dipercaya apa adanya.

## 4. Fitur

- **Kasir (`/`)** — cari nama/SKU/barcode, scan barcode (Enter menambahkan produk), filter kategori, badge qty, indikator stok, dan kartu **habis** otomatis nonaktif. Filter & kata kunci tersimpan di URL.
- **Keranjang (`/keranjang`)** — ubah jumlah, hapus item, total berjalan, tombol kosongkan, dan peringatan bila harga produk berubah sejak item masuk keranjang. **Keranjang bertahan saat refresh** (tersimpan di `localStorage`).
- **Checkout (`/checkout`)** — tinjau rincian, pilih metode (Tunai / QRIS / Transfer) dan **jenis pesanan** (Makan di Sini / Bungkus / Ojol), isi **nama kasir** (opsional), **diskon nyata** (Rp atau %), dan untuk tunai: tombol uang cepat + **kembalian otomatis**. Tombol konfirmasi terkunci secara sinkron sehingga klik ganda tidak menghasilkan dua pesanan.
- **Sukses & Struk (`/sukses/:id`)** — pesanan dibuat, struk menampilkan subtotal, diskon, jenis pesanan, kasir, tunai diterima, dan kembalian; bisa dicetak.
- **Kelola Produk (`/produk`)** — CRUD produk dengan **HPP, stok, batas menipis, SKU, barcode**, restock cepat (+10), filter kategori & **filter stok menipis** (tersimpan di URL), reset katalog.
- **Riwayat (`/riwayat`)** — dikelompokkan per hari, cari, filter metode/**jenis pesanan**/hari, badge diskon, **void transaksi** (stok dikembalikan, jejak tetap ada), dan total bersih.
- **Ringkasan (`/ringkasan`)** — omzet hari ini (void dikecualikan), **laba kotor, HPP terjual, margin**, transaksi, item terjual, rata-rata, penjualan per metode, transaksi terbesar, rincian per kategori (**streaming dari server**), **pola penjualan** (produk terlaris, jam tersibuk, jenis pesanan, tren 7 hari), dan **panel kas / shift**.
- **Laporan (`/laporan`)** — laporan per hari dengan **pemilih tanggal** (tombol hari + input tanggal), ringkasan omzet/laba/margin/selisih kas, rincian pembayaran & jenis pesanan, **rekonsiliasi kas per shift**, daftar transaksi dengan drill-down ke struk, **ekspor CSV**, dan **Z-Report** siap cetak/unduh.

## 4.1 Pola penjualan

- Setiap order menyimpan `channel` (`dine-in` / `bungkus` / `ojol`) dan `cashier` opsional.
- `src/lib/analytics.ts` menyediakan `topProducts`, `hourHistogram`, `busiestHour`, `channelBreakdown`, dan `revenueTrend` — fungsi murni yang mengabaikan order void.
- Ringkasan menampilkan: **produk terlaris**, **histogram jam** + jam tersibuk, **split jenis pesanan**, dan **tren omzet 7 hari** (hari terpilih ditonjolkan).
- Riwayat bisa difilter per jenis pesanan lewat `?channel=…`.

## 4.2 Inventori

- Produk dapat **dilacak stoknya** (`stock`) atau tidak (`stock: null` → ditampilkan `∞`).
- Stok **berkurang otomatis** saat pesanan dibuat, dan **kembali** saat transaksi di-void.
- Setiap perubahan stok dicatat sebagai `StockMovement` (`sale` / `void` / `restock` / `adjust`) di `warung-pos.stock-movements.v1` (maksimal 500 catatan terbaru).
- Produk dengan `stock ≤ lowStockThreshold` muncul di banner **perlu restock** dan bisa difilter lewat `?menipis=true`.
- Stok tidak pernah negatif: penjualan yang melebihi stok dibatasi di 0, dan produk bersaldo 0 tidak bisa ditambahkan ke keranjang.

## 4.3 Harga, Margin & Arus Kas

- Setiap produk punya `cost` (HPP). Saat item masuk keranjang, HPP **di-snapshot** ke `OrderItem.cost`, dan order menyimpan `costTotal` serta `profit = total − costTotal`.
- **Snapshot ini disengaja:** mengubah HPP di katalog **tidak** mengubah laba transaksi lama (terverifikasi: HPP katalog diubah 11.000 → 20.000, laba historis tetap Rp14.000).
- **Shift kas** (`src/lib/shifts.ts`): buka kas dengan modal awal, lalu tutup dengan hitungan fisik. Kas seharusnya = `modal awal + penjualan tunai − refund tunai (void)`. Selisih = `dihitung − seharusnya`, ditandai *lebih* / *kurang* / *pas*.
- Order yang dibuat saat kas terbuka menyimpan `shiftId`, sehingga penjualan tunai teratribusi ke shift yang tepat.

## 4.4 Laporan Harian & Z-Report

- `src/lib/report.ts` menyediakan `buildDailyReport(day, orders, shifts)` yang menghitung omzet, HPP, laba, diskon, item, pembayaran, jenis pesanan, dan rekonsiliasi kas untuk satu hari kalender.
- **Ekspor CSV** (`dailyOrdersCsv`) berisi satu baris per item dengan nomor, waktu, status, metode, jenis, kasir, produk, qty, harga, HPP, subtotal, diskon, total, dan laba — siap dibuka di spreadsheet.
- **Z-Report** (`zReportText`) adalah ringkasan tutup harian berformat teks untuk dicetak atau diunduh.
- Hari dipilih lewat `?tanggal=<dayKey>`; rentang valid dan hari tanpa data menampilkan empty state, bukan angka basi.

## 4.5 Basis Data (Turso / libSQL + Drizzle)

Seluruh data bisnis kini tersimpan di **Turso (libSQL)** melalui **Drizzle ORM**. `localStorage` hanya menyimpan keranjang yang belum di-checkout.

| Tabel | Isi |
| ----- | --- |
| `users` | Akun: hash PBKDF2 + salt, email unik |
| `products` | Katalog: harga, HPP, stok, SKU/barcode unik |
| `orders` | Pesanan: total, diskon, HPP, laba, status, kanal, kasir, `shift_id`, `user_id` |
| `order_items` | Baris pesanan dengan snapshot nama/harga/HPP |
| `shifts` | Shift kas: modal awal, kas dihitung, kas seharusnya, selisih |
| `stock_movements` | Jejak audit perubahan stok |
| `counters` | Nomor pesanan monotonik (`order_number`) |

**Aturan penting:**
- Uang selalu **integer rupiah**, tidak pernah float.
- Waktu disimpan sebagai string ISO-8601 (urut secara leksikografis, sama seperti kode laporan).
- `order_items` menyimpan **snapshot** harga dan HPP, sehingga mengubah katalog tidak mengubah riwayat.
- Nomor pesanan diambil dari tabel `counters`, jadi menghapus/void pesanan tidak pernah memakai ulang nomor.
- Skema didefinisikan di `src/db/schema.ts`; terapkan dengan `pnpm db:push`.

## 4.6 Batas Server (boundary)

| Pola berkas | Peran |
| ----------- | ----- |
| `src/db/*.server.ts` | Klien database; hanya bisa dijalankan di server (`createServerOnlyFn`) |
| `src/lib/*.server.ts` | Logika server-only (env, auth, sesi, akses data, reporting) |
| `src/lib/*.functions.ts` | `createServerFn` — RPC typed, aman diimpor dari mana saja |
| `src/lib/*.ts` | Aman-klien (tipe, format, analitik, validasi, laporan) |

Verifikasi: bundle klien **tidak** memuat `TURSO_ACCESS_TOKEN`, `passwordHash`, maupun `libsql://` (dicek via grep pada `.output/public`).

## 5. Cara Menjalankan

### Prasyarat

- Node.js v20+ (disarankan v22+)
- pnpm

### Langkah

```bash
pnpm install
pnpm dev        # dev server SSR di http://localhost:3000
```

Perintah lain:

```bash
pnpm build      # build klien + server (Nitro) ke .output/
pnpm start      # jalankan build produksi: node .output/server/index.mjs
pnpm lint       # oxlint
```

> Data produk dan pesanan disimpan di `localStorage` browser. Data hilang jika cache dibersihkan atau berpindah perangkat.
