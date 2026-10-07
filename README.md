# Warung POS

## 1. Ringkasan

Warung POS adalah aplikasi kasir untuk warung, berbahasa Indonesia dan memakai Rupiah. Kasir memilih produk, mengisi keranjang, membayar, lalu mencetak struk. Pemilik toko membaca laporan penjualan, laba, dan selisih kas harian.

Aplikasi berjalan full-stack dengan TanStack Start. Data bisnis tersimpan di Turso (libSQL) lewat Drizzle ORM. Keranjang yang belum di-checkout masih disimpan di `localStorage`.

Setiap toko adalah satu **tenant**. Satu user bisa tergabung ke beberapa tenant lewat membership dengan role `owner`, `manager`, atau `cashier`. Server menolak akses lintas tenant dan akses di bawah role yang dibutuhkan.

## 2. Tech Stack

| Teknologi | Kegunaan |
| --------- | -------- |
| [TanStack Start](https://tanstack.com/start) | Framework full-stack (SSR, server functions, server routes) |
| [TanStack Router](https://tanstack.com/router) | File-based routing, search param tervalidasi, route loader |
| [React 19](https://react.dev/) | Library UI |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [Turso](https://turso.tech/) / libSQL | Database SQLite terkelola |
| [Cloudflare R2](https://developers.cloudflare.com/r2/) | Penyimpanan gambar produk (S3-compatible) |
| [Drizzle ORM](https://orm.drizzle.team/) | Query builder + migrasi skema |
| [Zod v4](https://zod.dev/) | Validasi input di klien dan server |
| [Tailwind CSS v4](https://tailwindcss.com/) | Styling |
| [@tabler/icons-react](https://tabler.io/icons) | Ikon antarmuka |
| [Vite](https://vite.dev/) | Build tool dan dev server |
| [Nitro](https://nitro.build/) | Runtime produksi (Node.js) |
| [Vitest](https://vitest.dev/) | Test |
| [oxlint](https://oxc.rs/) | Linting |
| pnpm | Package manager |

## 3. Fitur

- **Kasir (`/`)** — cari produk lewat nama, SKU, atau barcode; filter kategori; lihat stok; kartu produk habis nonaktif otomatis.
- **Keranjang (`/keranjang`)** — ubah jumlah, hapus item, lihat total berjalan, dan dapatkan peringatan bila harga produk berubah. Keranjang bertahan saat refresh.
- **Checkout (`/checkout`)** — pilih metode bayar (Tunai / QRIS / Transfer), jenis pesanan (Makan di Sini / Bungkus / Ojol), isi nama kasir, dan pasang diskon (Rp atau %). Untuk tunai, ada tombol uang cepat dan kembalian otomatis.
- **Struk (`/sukses/:id`)** — tampilkan subtotal, diskon, tunai diterima, dan kembalian; struk bisa dicetak.
- **Kelola Produk (`/produk`)** — tambah, ubah, hapus produk dengan harga, HPP, stok, batas menipis, SKU, barcode, dan gambar mockup (unggah ke Cloudflare R2); restock cepat; filter kategori dan stok menipis.
- **Riwayat (`/riwayat`)** — kelompokkan pesanan per hari, cari, filter metode/jenis/hari, dan void atau refund transaksi. Void mengembalikan stok dan tetap menyimpan jejaknya.
- **Ringkasan (`/ringkasan`)** — omzet, laba kotor, HPP terjual, margin, jumlah transaksi, penjualan per metode, rincian per kategori, produk terlaris, jam tersibuk, dan tren omzet 7 hari.
- **Laporan (`/laporan`)** — laporan per hari dengan pemilih tanggal, rekonsiliasi kas per shift, daftar transaksi dengan drill-down ke struk, ekspor CSV, dan Z-Report siap cetak.
- **Kas / Shift** — buka kas dengan modal awal, tutup dengan hitungan fisik, lalu lihat selisih kas (lebih / kurang / pas).
- **Anggota (`/anggota`)** — undang user ke tenant dan atur role-nya. Hanya owner yang boleh mengubah keanggotaan.
- **Autentikasi (`/masuk`)** — daftar, login, dan logout. Password di-hash dengan PBKDF2-SHA-256 dan diverifikasi di server; sesi memakai cookie terenkripsi `httpOnly`.
- **Pulihkan (`/pulihkan`)** — impor data lama dari `localStorage` ke database, dan batalkan impor bila perlu.

## 4. Cara Menjalankan

### Prasyarat

- Node.js v20+ (disarankan v22+)
- pnpm
- Database Turso (atau libSQL lokal)

### Langkah

1. Salin `.env.example` menjadi `.env`, lalu isi nilainya.

```bash
TURSO_URL=libsql://<database>-<org>.turso.io
TURSO_ACCESS_TOKEN=<token>
SESSION_SECRET=<random-secret>   # openssl rand -base64 48
```

Untuk gambar produk, isi juga kredensial Cloudflare R2 (lihat `.env.example`). Bucket butuh aturan CORS untuk origin aplikasi; R2 menolak wildcard di `AllowedHeaders`, jadi daftarkan headernya secara literal:

```json
{ "AllowedOrigins": ["http://localhost:3000"], "AllowedMethods": ["GET", "PUT"],
  "AllowedHeaders": ["content-type"], "ExposeHeaders": ["ETag"] }
```

2. Pasang dependency dan buat skema database.

```bash
pnpm install
pnpm db:push
```

3. Unggah gambar seed ke R2 (sekali saja; `src/assets/` → `seed/<nama-file>`).

```bash
pnpm seed:images
```

4. Jalankan dev server.

```bash
pnpm dev        # http://localhost:3000
```

Instalasi baru (0 akun) otomatis diarahkan ke mode Daftar.

### Perintah lain

```bash
pnpm build      # build klien + server ke .output/
pnpm start      # jalankan build produksi: node .output/server/index.mjs
pnpm test       # Vitest
pnpm lint       # oxlint
pnpm seed:images # unggah gambar seed ke R2
pnpm db:studio  # buka Drizzle Studio
```
