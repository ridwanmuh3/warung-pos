# Warung POS

## 1. Project Overview

**Warung POS** adalah aplikasi kasir (point-of-sale) sederhana untuk warung, berbahasa Indonesia dan menggunakan mata uang Rupiah. Aplikasi ini dibangun sebagai *single-page application* (SPA) yang berjalan sepenuhnya di browser — semua data produk dan pesanan disimpan di `localStorage`, tanpa perlu server atau koneksi internet.

Proyek ini merupakan **MVP (Minimum Viable Product)**: fungsionalitas inti kasir sudah berjalan end-to-end (pilih produk → keranjang → checkout → struk → riwayat), namun fitur lanjutan seperti login, backend/database, diskon/pajak, dan sinkronisasi antar perangkat belum termasuk scope.

UI-nya *responsive*: nyaman dipakai di **mobile** (dengan tab bar bawah), **tablet**, maupun **desktop**.

## 2. Tech Stack

| Teknologi | Kegunaan |
| --------- | -------- |
| [Vite](https://vite.dev/) | Build tool & dev server |
| [React 19](https://react.dev/) | Library UI |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [TanStack Router](https://tanstack.com/router) | Routing antar halaman |
| [Tailwind CSS v4](https://tailwindcss.com/) | Styling (via `@tailwindcss/vite`) |
| [@tabler/icons-react](https://tabler.io/icons) | Ikon antarmuka |
| [oxlint](https://oxc.rs/docs/guide/usage/linter) | Linting |
| pnpm | Package manager |

## 3. Features

- **Kasir (`/`)** — pilih produk dari grid, difilter per kategori, dengan badge jumlah item yang sudah masuk keranjang. Tombol keranjang melayang di mobile.
- **Keranjang (`/keranjang`)** — ubah jumlah item, hapus item, lihat total berjalan. Bar total *sticky* di mobile dan panel ringkasan di desktop.
- **Checkout (`/checkout`)** — tinjau rincian pesanan, pilih metode pembayaran (Tunai / QRIS / Transfer), dan konfirmasi pesanan.
- **Sukses & Struk (`/sukses/:id`)** — pesanan berhasil dibuat, struk bisa dicetak.
- **Kelola Produk (`/produk`)** — tambah, edit, hapus produk, filter per kategori, dan reset katalog ke daftar awal.
- **Riwayat (`/riwayat`)** — transaksi dikelompokkan per hari, masing-masing bisa dilihat struknya (`/riwayat/:id`).
- **Ringkasan (`/ringkasan`)** — omzet hari ini, jumlah transaksi, item terjual, rata-rata transaksi, penjualan per metode pembayaran, dan transaksi terbesar.
- **UX mobile** — tab bar navigasi di bawah layar mobile, bar aksi sticky (keranjang/bayar), dan dukungan area aman (*safe area*) untuk notch/home indicator.

## 4. Cara Menjalankan Proyek

### Prasyarat

- [Node.js](https://nodejs.org/) v18+ (disarankan v20+)
- [pnpm](https://pnpm.io/) (instal via `npm install -g pnpm` jika belum ada)

### Langkah-langkah

1. **Clone / masuk ke folder proyek**

   ```bash
   cd warung-pos
   ```

2. **Instal dependencies**

   ```bash
   pnpm install
   ```

3. **Jalankan dev server**

   ```bash
   pnpm dev
   ```

   Buka <http://localhost:5173> di browser.

4. **(Opsional) Perintah lain**

   ```bash
   pnpm build    # typecheck + build produksi ke folder dist/
   pnpm preview  # pratinjau hasil build produksi
   pnpm lint     # cek linting dengan oxlint
   ```

> Data produk dan pesanan disimpan di `localStorage` browser. Data akan hilang jika cache browser dibersihkan atau berpindah perangkat.
