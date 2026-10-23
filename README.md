# Warung POS

Aplikasi kasir berbasis web untuk warung: mencatat penjualan, mengelola stok, merekonsiliasi kas laci, dan membaca laporan harian dalam satu alur kerja.

## 1. Overview

Warung POS dibuat untuk mengurangi pencatatan manual yang terpisah-pisah antara buku penjualan, stok, dan uang kas. Kasir memilih produk, memeriksa keranjang, menerima pembayaran, lalu mencetak struk. Pemilik atau manajer dapat melihat omzet, laba kotor, produk terlaris, dan selisih kas pada laporan harian.

Setiap data bisnis dikaitkan ke satu **tenant** (warung). Akses pengguna ditentukan oleh membership dengan role `owner`, `manager`, atau `cashier`; pembatasan akses dilakukan di server, bukan hanya disembunyikan di antarmuka.

Data bisnis disimpan di Turso/libSQL melalui Drizzle ORM. Keranjang bersifat local-first agar interaksi tetap responsif, lalu disinkronkan ke server setelah pengguna masuk. Checkout dan perhitungan harga akhir dilakukan di server.

Ruang lingkup aplikasi adalah operasional penjualan harian, bukan sistem akuntansi lengkap. QRIS dan transfer dicatat sebagai metode pembayaran, bukan melalui integrasi payment gateway. Cetak struk menggunakan dialog cetak browser, bukan integrasi langsung dengan printer thermal. Checkout memerlukan koneksi ke server; aplikasi tidak menyediakan mode offline penuh.

## 2. Fitur

| Area | Kemampuan |
| --- | --- |
| Kasir & keranjang | Cari produk berdasarkan nama, SKU, atau barcode; filter kategori; lihat stok; ubah jumlah; hapus item; tahan dan lanjutkan pesanan; peringatan ketika harga produk berubah. |
| Checkout & struk | Pilih metode bayar Tunai, QRIS, atau Transfer; pilih jenis pesanan Makan di Sini, Bungkus, atau Ojol; isi nama kasir; terapkan diskon nominal atau persentase; tombol uang cepat dan kembalian otomatis untuk tunai. Struk dapat dicetak melalui browser. |
| Produk & stok | Tambah, ubah, dan hapus produk; atur harga, HPP, stok, batas stok menipis, SKU, dan barcode; unggah gambar produk ke Cloudflare R2; restock cepat; filter produk dengan stok menipis. Produk dengan stok `null` tidak dilacak. |
| Kas & shift | Buka kas dengan modal awal, tutup kas dengan hitungan fisik, dan lihat selisih kas (lebih, kurang, atau pas). Satu tenant memiliki satu shift kas aktif. |
| Laporan | Ringkasan omzet, laba kotor, margin, jumlah transaksi, penjualan per metode, rincian kategori, produk terlaris, jam tersibuk, dan tren omzet tujuh hari. Tersedia ekspor CSV dan Z-Report teks siap cetak. |
| Riwayat | Cari dan filter pesanan berdasarkan hari, metode bayar, atau jenis pesanan; buka detail struk; batalkan transaksi atau proses refund dengan alasan. Stok dikembalikan dan jejak transaksi tetap disimpan. |
| Tim & akses | Undang anggota ke warung dan atur role. Hanya owner yang dapat mengelola anggota; manager dan owner dapat mengelola produk serta membatalkan transaksi. |
| Onboarding | Checklist awal untuk pemilik, panduan penggunaan yang dapat dicetak, pengaturan nama warung, dan halaman pemulihan data lama dari penyimpanan browser. |

## 3. Tech Stack

| Layer | Teknologi | Peran |
| --- | --- | --- |
| Framework | [TanStack Start](https://tanstack.com/start) + [TanStack Router](https://tanstack.com/router) | SSR, server functions, file-based routing, loader, dan validasi search param. |
| UI | [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/) | Komponen antarmuka dan type safety. |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/), [Tabler Icons](https://tabler.io/icons) | Desain antarmuka dan ikon. |
| Database | [Turso](https://turso.tech/) / libSQL, [Drizzle ORM](https://orm.drizzle.team/) | Penyimpanan data dan akses database. |
| Validasi | [Zod v4](https://zod.dev/) | Validasi input di klien dan server. |
| Penyimpanan gambar | [Cloudflare R2](https://developers.cloudflare.com/r2/) | Upload gambar produk melalui presigned PUT dan proxy gambar same-origin. |
| Build & runtime | [Vite](https://vite.dev/), [Nitro](https://nitro.build/) | Dev server, build, dan runtime produksi Node.js. |
| Kualitas kode | [Vitest](https://vitest.dev/), [oxlint](https://oxc.rs/) | Unit test dan linting. |
| Package manager | pnpm | Instalasi dependency dan menjalankan script. |

## 4. Cara Menjalankan

### Prasyarat

- Node.js 22.12 atau lebih baru.
- pnpm.
- Database Turso, atau libSQL yang kompatibel.
- Akun Cloudflare R2 hanya jika ingin menggunakan unggah gambar produk.

### Langkah

1. Salin konfigurasi environment.

   ```bash
   cp .env.example .env
   ```

2. Isi variabel wajib di `.env`:

   ```bash
   TURSO_URL=libsql://<database>-<org>.turso.io
   TURSO_ACCESS_TOKEN=<token>
   SESSION_SECRET=<secret-acak>
   ```

   Buat `SESSION_SECRET` dengan:

   ```bash
   openssl rand -base64 48
   ```

   `SESSION_SECRET` wajib diisi dan minimal 32 karakter; server menolak nilai yang lebih pendek. Jangan gunakan `TURSO_ACCESS_TOKEN` sebagai pengganti.

   Untuk gambar produk, isi juga `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_BUCKET`, `CLOUDFLARE_ACCESS_KEY_ID`, `CLOUDFLARE_SECRET_KEY`, dan `CLOUDFLARE_S3_URI`. Browser melakukan upload langsung ke R2, sehingga bucket perlu aturan CORS untuk origin aplikasi. Contoh konfigurasi CORS tersedia di `.env.example`.

3. Pasang dependency dan siapkan skema database.

   ```bash
   pnpm install
   pnpm db:push
   ```

4. Jalankan development server.

   ```bash
   pnpm dev
   ```

   Buka `http://localhost:3000`. Jika belum ada akun, aplikasi mengarahkan ke halaman pendaftaran. Setiap akun yang mendaftar membuat warung baru dan menjadi `owner`-nya. Katalog awal kosong; tambahkan produk melalui halaman **Produk** atau ikuti checklist di halaman **Kasir**.

### Keamanan

- Semua input server divalidasi dengan Zod sebelum menyentuh database, URL, atau penyimpanan gambar; akses data selalu dibatasi tenant dan role dari cookie sesi, bukan dari klien.
- Login dibatasi per proses: 5 kegagalan per email + IP dalam 15 menit, maksimum 50 kegagalan per IP, dan 10 pendaftaran per IP per jam.
- Respons server function diberi `Cache-Control: no-store`, dan seluruh respons mendapat header `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, serta CSP dasar. HSTS aktif otomatis di produksi.
- Pembatas laju bersifat per proses. Untuk deployment multi-instance, letakkan limiter bersama (Redis/DB) atau WAF di depan aplikasi.
- Akun demo di bagian berikut hanya untuk instance demo dan tidak boleh dipakai di produksi.

### Perintah lain

| Perintah | Kegunaan |
| --- | --- |
| `pnpm build` | Build klien dan server ke `.output/`. |
| `pnpm start` | Menjalankan hasil build produksi. |
| `pnpm test` | Menjalankan unit test dengan Vitest. |
| `pnpm lint` | Menjalankan oxlint. |
| `pnpm db:generate` | Membuat file migrasi dari perubahan skema. |
| `pnpm db:migrate` | Menjalankan migrasi database. |
| `pnpm db:studio` | Membuka Drizzle Studio. |
| `pnpm check:tenant` | Memeriksa query server agar tetap terikat pada tenant. |

## 5. Akun Demo

Gunakan akun berikut untuk mencoba instance demo:

| Email | Password |
| --- | --- |
| `test@test.com` | `test123123` |

Akun demo tidak dibuat otomatis oleh `pnpm db:push`. Pada instalasi lokal baru, buat akun melalui halaman `/masuk`; akun yang dibuat melalui pendaftaran menjadi owner dari warung baru.
