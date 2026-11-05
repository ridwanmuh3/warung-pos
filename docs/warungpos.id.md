# Warung POS — Aplikasi Kasir untuk Warung Indonesia

Alur kasir berbasis web yang menyatukan penjualan, stok, kas laci bersama, dan laporan harian. Aturan pembukuan dibuat eksplisit, bukan diserahkan kepada kumpulan halaman CRUD yang terpisah.

| | |
| --- | --- |
| **Jenis** | Proyek full-stack / showcase rekayasa perangkat lunak |
| **Peran** | Solo — alur produk, UI, aturan domain, backend, model data, pengujian |
| **Stack** | React 19 · TanStack Start / Router · TypeScript · Tailwind CSS 4 · Turso / libSQL · Drizzle ORM · Cloudflare R2 · Xendit |
| **Status** | Aplikasi terimplementasi; integrasi pembayaran perlu verifikasi end-to-end sebelum dipakai untuk uang sungguhan |
| **Repo** | [`warung-pos`](https://github.com/ridwanmuh3/warung-pos) |

---

## 1. Gambaran Proyek

Penjualan di warung bisa selesai dalam hitungan detik, tetapi pemilik masih harus mencocokkan tiga catatan pada malam hari: apa yang terjual, berapa sisa di rak, dan berapa uang yang seharusnya ada di laci. Warung POS menggabungkan ketiganya dalam satu alur operasional. Kasir memilih produk, menerima pembayaran, dan mencetak struk; pemilik melihat omzet, HPP, piutang, serta selisih antara kas seharusnya dan kas fisik.

Tantangannya bukan menampilkan angka total. Yang penting adalah membedakan **penjualan dari uang yang sudah diterima**, **stok tercatat dari batas stok yang pasti**, serta **void saat laci masih terbuka dari pengembalian uang setelah laci ditutup**. Perbedaan ini dimodelkan secara eksplisit, tidak ditebak dari satu label pembayaran.

Keputusan utamanya adalah checkout yang **otoritatif di server**. Keranjang browser tetap cepat dan bertahan saat refresh, tetapi server membaca ulang harga dan HPP produk, menghitung total, mengonsumsi keranjang terbuka, memberi nomor pesanan, dan mencatat pergerakan stok. Batasan unik `orders.cart_id` mencegah checkout ulang keranjang yang sama menghasilkan penjualan kedua.

### Ringkasan cepat

| Dimensi | Implementasi |
| --- | --- |
| Aplikasi | Satu aplikasi TanStack Start: homepage publik dan POS dengan autentikasi |
| Multi-tenant | Satu tenant per warung; user bergabung sebagai `owner`, `manager`, atau `cashier` |
| Checkout | Tunai, QRIS Xendit jika dikonfigurasi, dan Ngutang (`credit`) |
| QRIS | Permintaan bayar nominal tetap, pesanan menunggu, webhook, cek status, perbarui/batalkan QR |
| Inventori | Stok terpantau atau `null` bila tidak dilacak; histori perubahan di stock movements |
| Kas | Satu shift laci bersama per tenant; modal awal, kas seharusnya, kas dihitung, selisih |
| Laporan | Omzet dan laba harian, metode bayar, terlaris, jam ramai, CSV, dan Z-report |
| Verifikasi | Suite Vitest, TypeScript, oxlint, pemeriksa isolasi tenant dan batas impor |

### Batas yang disengaja

Ini aplikasi yang berjalan, bukan klaim bahwa warung aman memproses uang sungguhan tanpa verifikasi deployment. Checkout butuh koneksi server; bukan POS offline. QR mode uji belum membuktikan penerbitan QR dan pengiriman callback pada akun Xendit produksi. Ngutang dilunasi penuh, tanpa cicilan. Struk memakai dialog cetak browser, bukan integrasi langsung printer thermal. Tidak ada klaim hasil load test, ketersediaan multi-region, atau SLA produksi.

---

## 2. Fitur

### Alur kasir

- **Cari dan pilih produk** — cari berdasarkan nama, SKU, atau barcode; pemindai yang bertindak sebagai keyboard dapat mengirim kode diikuti Enter. Filter kategori dan label stok menipis membantu kasir.
- **Keranjang responsif** — interaksi local-first bertahan saat refresh; keranjang terbuka disinkronkan ke server dan dapat ditahan lalu dilanjutkan. Perubahan harga katalog ditampilkan sebelum checkout.
- **Pembayaran tunai** — nominal uang cepat, kembalian otomatis, diskon rupiah atau persentase, dan struk yang dapat dicetak lewat browser.
- **QRIS dinamis** — jika dikonfigurasi, Xendit membuat QR dengan nominal tetap untuk pesanan berstatus `pending`. Layar pembayaran memantau status lokal serta menyediakan cek langsung ke penyedia, pembuatan QR baru, atau pembatalan. Tombol simulasi hanya muncul dengan kunci uji.
- **Ngutang** — penjualan tercatat dengan nama pelanggan dan saldo belum lunas. Pelunasan nanti menyimpan metode pembayaran dan, jika tunai, laci penerimanya. Omzet dihitung sekali saat penjualan; piutang ditampilkan terpisah.
- **Konteks pesanan** — jenis pesanan (`dine-in`, `takeaway`, `delivery`) dan nama kasir opsional muncul di struk serta riwayat.

### Alur pemilik dan manajer

- **Katalog dan stok** — kelola harga, HPP, stok opsional, ambang restock, SKU, barcode, dan gambar produk di Cloudflare R2. Tiap perubahan stok yang dilacak menghasilkan movement.
- **Kas laci bersama** — buka dengan modal awal, lalu tutup dengan hitungan fisik. Kas seharusnya menghitung penjualan tunai dan pelunasan/refund tunai yang relevan; omzet non-tunai tidak otomatis dianggap uang di laci.
- **Laporan harian** — omzet, HPP, laba kotor setelah diskon, margin, metode bayar, kategori, produk terlaris, jam ramai, jenis pesanan, dan tren tujuh hari. Tersedia CSV serta Z-report siap cetak.
- **Koreksi berjejak** — void penjualan lunas saat shift asal masih terbuka; sesudah shift ditutup, catat refund terhadap laci yang mengeluarkan uang. Stok yang dilacak dikembalikan; pesanan asli dan alasannya tetap ada.
- **Akses tim** — owner mengatur membership; pemeriksaan role dilakukan di server. Satu user dapat bergabung ke beberapa tenant.

### Perilaku platform

- **Homepage publik, POS privat** — halaman pemasaran dirender tanpa sesi; route aplikasi memeriksa cookie terenkripsi `httpOnly` dan membership di server.
- **Onboarding tanpa penjualan palsu** — owner baru mendapat katalog kosong dan checklist awal, bukan transaksi contoh.
- **Pemulihan data lama** — jalur impor eksplisit memindahkan data versi lama dari browser ke database milik tenant.
- **Gambar langsung dari browser** — server menandatangani unggahan ke R2; pembacaan gambar secara default melalui proxy same-origin `/img`.

---

## 3. Tech Stack

| Lapisan | Teknologi | Alasan dipakai |
| --- | --- | --- |
| **UI dan routing** | React 19, TypeScript, TanStack Start / Router | SSR halaman publik, route dan loader bertipe, server function untuk mutasi |
| **Gaya dan animasi** | Tailwind CSS 4, Tabler Icons, animasi CSS, GSAP | UI mobile dan desktop; animasi masuk CSS bekerja sebelum runtime gerak opsional dimuat |
| **Domain dan validasi** | Aturan TypeScript murni, Zod 4 | Satu tempat bagi aturan harga, siklus pembayaran, kas, dan laporan; validasi di batas server |
| **Data** | Turso / libSQL, Drizzle ORM, skema SQLite | Pesanan, keranjang, pergerakan stok, membership, dan percobaan pembayaran dalam satu database |
| **Pembayaran** | Xendit Payments API v3, route webhook, `qrcode.react` | QRIS nominal tetap dan tampilannya; pelunasan asinkron serta rekonsiliasi manual |
| **Gambar** | Cloudflare R2, unggah bertanda tangan | Foto produk tanpa melewatkan berkas unggahan melalui server aplikasi |
| **Deployment** | Vite, Netlify Functions | Build full-stack dan route server dalam satu origin |
| **Pemeriksaan** | Vitest, TypeScript, oxlint, skrip penjaga repo | Uji aturan domain dan integrasi, pemeriksaan tipe, cakupan tenant dan batas impor |

---

## 4. Arsitektur

### Bentuk sistem

Warung POS adalah monolit modular, bukan jaringan microservice. Browser berkomunikasi dengan origin TanStack Start. Loader route dan server function memanggil modul data yang dibatasi tenant; modul tersebut memakai Drizzle untuk mengakses libSQL. Pembuatan dan pengecekan pembayaran menghubungi Xendit dari server, sedangkan gambar produk diunggah langsung ke R2 melalui permintaan yang ditandatangani server.

```text
Browser → route / server function TanStack → aturan domain + data per tenant → Turso
                                         ├→ permintaan bayar Xendit
Xendit → /api/xendit/callback ───────────┘
Browser → PUT bertanda tangan → Cloudflare R2; baca gambar → proxy /img → R2
```

| Batas | Tanggung jawab |
| --- | --- |
| `src/routes/` | Halaman publik, route privat, loader, endpoint callback |
| `src/features/` | Layar checkout, katalog, penjualan, shift, beserta server function |
| `src/domain/` | Aturan murni harga, siklus penjualan, kas, laporan, dan business day |
| `src/lib/data/*.server.ts` | SQL dan transaksi per tenant; sebagian infrastruktur lama masih berada di `src/lib/` |
| `src/db/schema.ts` | Tabel, indeks, dan batasan relasi |
| `src/server/payments/xendit.server.ts` | Format API Xendit, autentikasi, pembuatan QR, dan cek status |

### Satu checkout dan pembayarannya

1. Browser memperbarui keranjang lokal; sinkronisasi keranjang menyimpan keranjang terbuka milik user dan tenant yang sedang aktif.
2. Sebelum checkout, keranjang dikirim ke server. Server membaca harga dan HPP terbaru, memvalidasi permintaan, menghitung nominal, lalu secara transaksional membuat order, mengonsumsi keranjang, dan mencatat perubahan stok yang dilacak.
3. Tunai dan Ngutang langsung menyelesaikan penjualan di aplikasi, tetapi memiliki makna arus kas berbeda. QRIS membuat order `pending` dan meminta QR ke Xendit. Penjualan `pending` **tidak** dihitung sebagai omzet lunas.
4. Xendit mengembalikan aksi `QR_STRING` untuk ditampilkan kepada pelanggan. Callback memverifikasi token dan mencocokkan `reference_id` yang unik secara global dengan percobaan pembayaran tersimpan; tenant tidak dipercaya dari isi webhook.
5. Capture berhasil dengan nominal tepat menandai pembayaran dan order lunas. Polling membaca status di database; tombol cek status meminta keadaan langsung dari Xendit saat callback terlambat atau hilang.

Pembuatan QR dan pengiriman callback adalah dua langkah berbeda. Konfigurasi callback saja tidak akan menampilkan QR: permintaan awal ke penyedia harus berhasil dan menghasilkan QR string.

### Konsistensi dan kegagalan

| Kejadian | Perilaku dan batas |
| --- | --- |
| Checkout berulang / dua tab | `orders.cart_id` unik; checkout memakai ulang order dari keranjang yang sudah dikonsumsi |
| Harga produk berubah | Server memakai harga katalog terbaru; UI memberi peringatan harga keranjang yang basi |
| Penjualan melebihi stok | Warn-and-allow: stok terpantau dapat negatif karena hitungan rak mungkin tertinggal; movement mencatat delta sebenarnya |
| Permintaan QR gagal | Order tetap pending; attempt gagal; kasir dapat membuat QR baru atau membatalkan tanpa memasukkan barang ulang |
| QR kedaluwarsa | Layar menawarkan pembaruan atau pembatalan; konfirmasi terlambat tetap dapat melunasi attempt yang kedaluwarsa |
| Callback ganda atau hilang | Sinyal berulang tidak boleh menggandakan pelunasan; rekonsiliasi langsung dapat memperbaiki callback yang hilang |
| Uang masuk sesudah pembatalan | Order void tidak diam-diam menjadi lunas; anomali dicatat dan refund harus ditangani manual |
| Refund sesudah shift ditutup | Dicatat terhadap laci yang mengeluarkan uang; ini koreksi kas/inventori internal, **bukan** refund Xendit otomatis |

---

## 5. Model Data

Satu database libSQL menyimpan data bisnis warung. Sumber kebenarannya ialah [`src/db/schema.ts`](../src/db/schema.ts); teks ERD lama mungkin belum memasukkan tabel `payments` untuk QRIS.

| Entitas | Peran bisnis |
| --- | --- |
| `users`, `tenants`, `memberships` | Identitas login global, batas warung, serta role per warung |
| `products`, `stock_movements` | Katalog dan jejak perubahan inventori; `stock = null` berarti tidak dilacak |
| `carts`, `cart_items` | Keranjang terbuka, keranjang ditahan, dan snapshot input penjualan |
| `orders`, `order_items`, `counters` | Penjualan bernomor, snapshot baris, nomor monotonik per tenant |
| `shifts` | Modal awal, kas dihitung, kas seharusnya, dan selisih laci bersama |
| `payments` | Percobaan QRIS: referensi internal, ID Xendit, QR string, nominal, expiry, dan status |

### Constraint yang membawa makna bisnis

| Constraint / aturan | Tujuan |
| --- | --- |
| `UNIQUE (tenant_id, order_number)` dan counter `(tenant_id, key)` | Nomor tidak bentrok atau dipakai ulang sesudah void |
| `UNIQUE (cart_id)` pada `orders` | Satu keranjang menjadi paling banyak satu order |
| `UNIQUE (tenant_id, user_id)` pada `memberships` | Satu role per user pada tiap warung |
| `UNIQUE (tenant_id, sku)` dan `(tenant_id, barcode)` | Kode produk tidak ganda dalam satu warung, tetapi boleh sama di warung lain |
| `UNIQUE (reference_id)` pada `payments` | Temukan attempt callback tanpa menerima tenant yang diberikan pengirim |
| Nominal QRIS harus sama persis dalam integer rupiah | Capture yang tidak cocok tidak diam-diam melunasi order |

Baris pesanan menyimpan snapshot nama, kunci gambar, harga, dan HPP agar perubahan katalog tidak mengubah struk atau laba historis. Uang disimpan dalam rupiah bulat. Setiap kolom `tenant_id` adalah `NOT NULL`; isolasi diberlakukan oleh query server yang difilter tenant dan pengujiannya, bukan oleh row-level security di database. Beberapa referensi sengaja berupa teks tanpa foreign key.

---

## 6. Trade-off

| Keputusan | Yang didapat | Yang dibayar | Cara dibatasi |
| --- | --- | --- | --- |
| **Satu aplikasi full-stack** alih-alih microservice | Jalur pendek dari UI kasir ke transaksi penjualan | Aplikasi dan database berbagi batas kegagalan dan skala | Pemisahan feature/domain; modul server-only |
| **Keranjang local-first, checkout otoritatif di server** | Respons cepat dan tahan refresh tanpa percaya harga browser | Sinkronisasi dan harga basi perlu ditangani; tidak bisa checkout offline | Flush sebelum bayar, hitung ulang di server, constraint satu cart-satu order |
| **Oversell warn-and-allow** | Penjualan nyata tetap terjadi meski hitungan rak tertinggal | Stok bisa negatif | Peringatan terlihat dan ledger delta tepat; selisih ditinjau belakangan |
| **QRIS Xendit asinkron** | Nominal tetap per order dan konfirmasi dari penyedia | QR gagal dibuat, expiry, callback telat, dan pengecualian manual | Attempt pending, cek status, buat ulang, catat anomali |
| **Catatan refund internal setelah tutup shift** | Kas dan stok bisa dijelaskan tanpa integrasi pembayaran kedua | Tidak otomatis mengembalikan dana lewat Xendit | Dibedakan jelas; refund eksternal perlu alur operator |
| **Satu laci bersama per tenant** | Selisih kas jelas tanpa bergantung pada siapa yang membuat penjualan | Tidak mewakili beberapa laci fisik bersamaan | Satu shift terbuka per tenant dalam logika aplikasi |
| **Business day menurut jam server** | Satu sumber waktu yang konsisten dalam kode saat ini | Zona waktu warung bisa berbeda dari zona waktu server | Helper domain menerima clock; pengaturan zona waktu tenant masih terbuka |
| **Rate limit login per proses** | Perlindungan dasar tanpa layanan tambahan | Batas tidak terakumulasi di seluruh instance serverless | Perlu limiter bersama atau WAF untuk deployment lebih besar |

### Sebelum dipakai untuk operasi dengan uang sungguhan

- Uji penerbitan QR, pengiriman callback, pelunasan, expiry, dan kasus pengecualian secara end-to-end pada akun Xendit target. API key dan callback yang terpasang belum membuktikan QR bisa dipindai.
- Tetapkan alur refund penyedia untuk pembayaran QRIS; refund order saat ini mencatat status internal dan dampak pada laci, bukan memanggil refund Xendit.
- Tambahkan zona waktu per tenant dan rate limiter bersama atau WAF bila deployment memiliki beberapa instance.
- Uji backup, migrasi, restore, dan smoke test deployment pada lingkungan terpisah. Tidak ada klaim high availability maupun hasil load test di sini.

---

## 7. Kesimpulan

Warung POS berangkat dari satu prinsip: **kasir boleh menuntaskan penjualan dengan cepat, tetapi catatan harus tetap bisa menjelaskan apa yang terjadi pada stok, piutang, dan uang kas.**

Keranjang bisa responsif tanpa dipercaya menentukan harga. Order bisa dihitung sebagai penjualan saat utangnya belum lunas. QRIS yang menunggu boleh mengunci stok tanpa diklaim sebagai omzet lunas. Void dan refund dapat sama-sama mengoreksi penjualan sambil mencatat pengaruh berbeda terhadap laci. Karena itulah aplikasi memisahkan order, attempt pembayaran, pergerakan stok, shift, dan status pelunasan, bukan hanya memiliki satu flag “paid” yang bisa berubah.

Cakupannya tetap terbatas: kesiapan pembayaran nyata, zona waktu, dan pemulihan operasional membutuhkan bukti di lingkungan deployment. Arsitektur ini memperlihatkan batas tersebut, bukan menganggap layar yang berfungsi sebagai bukti bahwa seluruh arus uang sudah selesai.

### Bacaan lanjutan

- [`README.md`](../README.md) — pengaturan dan gambaran fitur (sebagian teks pembayaran lebih tua daripada integrasi Xendit)
- [`CONTEXT.md`](../CONTEXT.md) — bahasa domain dan celah business day
- [`src/db/schema.ts`](../src/db/schema.ts) — skema saat ini, termasuk percobaan pembayaran
- [`docs/architecture.md`](architecture.md) — arsitektur dan isolasi tenant (sebagian path mendahului pemisahan feature)
- [`docs/erd.md`](erd.md) — relasi entitas utama (attempt pembayaran belum digambar)
- [`docs/adr/`](adr/) — keputusan tentang snapshot, checkout, stok, dan refund
