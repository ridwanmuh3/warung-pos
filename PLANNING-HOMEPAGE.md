# Homepage SaaS Warung POS — Rencana (revisi: hanya homepage)

> Dokumen perencanaan. **Belum ada kode yang diubah.** Revisi ini menyesuaikan rencana dengan batasan baru: **hanya mengerjakan homepage**; konten/aplikasi utama (kasir, keranjang, checkout, riwayat, laporan, pengaturan) **tidak disentuh** karena ada agent lain yang sedang bekerja di sana.

## 0. Batasan & ringkasan

**Batasan yang mengikat rencana ini:**

1. Fokus hanya homepage pemasaran.
2. **Dilarang mengubah:** `src/routes/index.tsx` (kasir), `AppShell.tsx`, `AuthScreen.tsx`, `checkout.tsx`, `keranjang.tsx`, `laporan.tsx`, `riwayat.*`, `sukses.*`, `TodaySummary.tsx`, `pengaturan.tsx`, `OwnerSetupChecklist.tsx`, dan komponen fitur lain.
3. Karena `/` masih dipakai kasir dan tidak boleh dipindah sekarang, homepage dibangun di **`/beranda`** — URL sementara yang terisolasi. Swap ke `/` masuk fase terpisah setelah pekerjaan agent lain selesai (§7 Phase D).

**Yang boleh disentuh:**

| Berkas | Sifat |
| --- | --- |
| `src/routes/beranda.tsx` *(baru)* | Halaman homepage |
| `src/components/marketing/*` *(baru)* | Header, footer, section |
| `src/data/marketing.ts` *(baru)* | Copy: fitur, langkah, fakta, FAQ, tautan footer |
| `src/data/site.ts` *(baru)* | Nama situs, deskripsi, URL, tautan |
| `src/lib/public-routes.ts` *(baru)* | Allowlist rute publik + `isPublicPath()` |
| `src/routes/__root.tsx` | **Hanya** pemisahan gerbang sesi (§6.1) — diff kecil, tanpa mengubah perilaku rute aplikasi |
| `src/routes/sitemap.tsx`, `privasi.tsx`, `ketentuan.tsx` *(baru)* | Halaman publik pelengkap |
| `src/routes/sitemap[.]xml.ts`, `robots[.]txt.ts` *(baru)* | Server route SEO |
| `tests/public-routes.test.ts`, `tests/marketing-data.test.ts` *(baru)* | Unit test |

**Tidak ada dependency baru.**

## 1. Temuan yang membentuk rencana

| # | Fakta | Bukti | Konsekuensi |
| --- | --- | --- | --- |
| 1 | `/` adalah halaman kasir, `ssr: false` | `src/routes/index.tsx` (`createFileRoute('/')`, `MenuPage`) | Homepage tidak bisa memakai `/` tanpa memindahkan kasir — **ditunda** |
| 2 | Gerbang sesi menutup semua rute | `src/routes/__root.tsx:38-63` | Homepage butuh pengecualian di root; tanpa itu pengunjung melihat layar masuk |
| 3 | Sesi baru resolve di klien | `src/lib/useSession.ts` (`isSessionResolved()`, fetch di `useEffect`); `src/lib/auth.session.ts` (`resolved = false`) | Root SSR merender spinner. Jika homepage tetap melewati hook sesi, HTML server berisi konten penuh. Ini alasan teknis utama pemisahan komponen root |
| 4 | Repo GitHub belum publik | `curl https://github.com/ridwanmuh3/warung-pos` → **404** tanpa login | Tautan GitHub di footer akan mati; tahan sampai repo publik |
| 5 | Tidak ada `robots.txt`/`sitemap.xml` | `public/` hanya `favicon.svg`, `icons.svg` | Dibuat sebagai server route (origin tidak perlu di-hardcode) |
| 6 | `/panduan` butuh sesi | `src/routes/panduan.tsx` (`ssr:false`, role dari sesi) | Footer memberi label "perlu masuk", bukan janji halaman publik |
| 7 | Tidak ada pernyataan uji coba di UI | Tidak ada teks beta/harga di `src/` | Klaim "gratis selama uji coba" dibuat eksplisit + batasnya jujur |
| 8 | Tidak ada data pengguna nyata | Tidak ada analytics/metrik di repo | Section facts hanya memakai angka yang bisa dibuktikan; tanpa testimoni |
| 9 | `/masuk` sudah default redirect ke `/` (kasir) | `AuthScreen.tsx:97` | CTA "Coba gratis" cukup ke `/masuk?mode=register`; **tidak perlu** ubah auth |

## 2. Keputusan rute (sementara)

| URL | Isi | Status |
| --- | --- | --- |
| `/` | Kasir (tidak diubah) | tetap, milik agent lain |
| **`/beranda`** | **Homepage publik** | dikerjakan sekarang |
| `/sitemap`, `/privasi`, `/ketentuan` | Halaman publik pelengkap | dikerjakan sekarang |
| `/masuk` | Login/daftar | sudah ada, tidak diubah |
| `/kasir` | Rencana jangka panjang | **belum dibuat**; jangan ditautkan dari homepage |

**Kenapa bukan alternatif lain:**

- **`/` bercabang menurut sesi** — butuh mengubah root jauh lebih dalam dan tetap berisiko flash/SEO; juga mencampur dua halaman dalam satu URL selama fitur kasir masih digarap.
- **Pindahkan kasir ke `/kasir` sekarang** — melanggar batasan (menyentuh `index.tsx` + 10 berkas tautan) dan berkonflik dengan agent lain.
- **Homepage statis di `public/`** — nol sentuhan kode, tetapi menduplikasi token desain, tidak bisa memakai komponen React yang ada, dan menyulitkan swap nanti.

**Rencana swap (Phase D, ditunda):** pindahkan kasir `index.tsx` → `kasir.tsx`, homepage `beranda.tsx` → `index.tsx`, perbarui tautan `to="/"` di 7 berkas, redirect login, `README`, canonical, dan `robots`. Semua itu **tidak** dikerjakan pada fase ini.

## 3. Struktur halaman (urutan section)

| # | Section | Anchor | Isi | Bukti/klaim |
| --- | --- | --- | --- | --- |
| 1 | Header | — | Logo, Fitur · Cara pakai · Gratis · FAQ · GitHub; "Masuk" + "Coba gratis" | — |
| 2 | Hero | `#atas` | Badge "Masa uji coba — gratis", H1, subjudul, 2 CTA, 3 poin kepercayaan, mockup UI dari CSS | Alur kasir nyata (search, keranjang, checkout, struk) |
| 3 | Masalah & tujuan | `#tujuan` | 3 kartu masalah + 1 paragraf tujuan produk | `README.md` §1, `CONTEXT.md` |
| 4 | Fitur unggulan | `#fitur` | 6 kartu: kasir & barcode; checkout & kembalian; stok otomatis; kas & shift; laporan & margin; tim & peran | `README.md` §2 |
| 5 | Cara pakai | `#cara-pakai` | 4 langkah bernomor | Alur onboarding nyata |
| 6 | Masa uji coba | `#gratis` | Pita gratis + 3 poin + catatan harga menyusul | Status produk; tanpa janji tanggal |
| 7 | Fakta | `#fakta` | 4 angka terverifikasi + catatan sumber | §4.4 |
| 8 | FAQ | `#faq` | 8 pertanyaan, `<details>` tanpa JS | Batas produk yang jujur |
| 9 | CTA penutup | `#coba` | Band gelap + CTA utama/sekunder | — |
| 10 | Footer | — | 4 kolom + baris bawah beta/sitemap | §6.4 |

Prinsip: **setiap klaim punya pasangan di kode/README.** Tanpa testimoni, jumlah pengguna, rating, atau logo mitra.

## 4. Draf copy

### 4.1 Hero

> **Badge:** Masa uji coba — gratis
>
> **H1:** Kasir warung yang langsung bisa dipakai.
>
> **Sub:** Catat penjualan, kurangi stok, dan tahu uang di laci — dalam satu alur. Tanpa instal, tanpa kartu kredit, gratis selama masa uji coba.
>
> **CTA utama:** Coba gratis → `/masuk?mode=register`
> **CTA sekunder:** Lihat cara pakai → `#cara-pakai`
>
> **Baris kepercayaan:** Untuk warung makan & kelontong · Data tiap warung terpisah · Bisa dipakai di HP, tablet, dan laptop

Alternatif H1: "Jualan lebih rapi, tanpa buku catatan ganda." / "Dari pesanan ke laporan, satu aplikasi."

### 4.2 Tujuan

- **Masalah:** penjualan di buku, stok di kepala, uang laci dihitung ulang tiap malam — angkanya tidak pernah cocok.
- **Tujuan:** satu tempat untuk transaksi, stok, kas, dan laba harian, supaya pemilik tahu kondisi warung tanpa menyalin catatan.
- **Untuk siapa:** warung makan, warung kelontong, dan kafe kecil dengan 1–3 orang bergantian jaga kasir.

### 4.3 Fitur (6 kartu)

| Fitur | Janji | Dasar |
| --- | --- | --- |
| Kasir cepat | Cari nama/SKU/scan barcode; tap produk masuk keranjang | Search + barcode Enter, filter kategori |
| Checkout & struk | Tunai dengan kembalian otomatis, QRIS/transfer, diskon nominal/persen | `amountPaid`/`change`, `discount`, cetak via browser |
| Stok otomatis | Stok turun saat terjual, kembali saat void/refund, peringatan menipis | `stock_movements`, oversell warn-and-allow |
| Kas & shift | Buka dengan modal, tutup dengan hitungan fisik, lihat selisih | `shifts`, `expectedCash`/`variance` |
| Laporan & margin | Omzet, laba, margin, terlaris, jam sibuk, tren 7 hari, CSV, Z-Report | `/laporan`, `/ringkasan` |
| Tim & peran | Owner/manager/cashier; batas akses ditegakkan di server | `memberships`, role gate |

### 4.4 Fakta

| Angka | Label | Dasar |
| --- | --- | --- |
| **Rp0** | Biaya selama masa uji coba | Status beta; tanpa langganan |
| **3** | Peran akses | `Membership.role` |
| **3 + 3** | Metode bayar & jenis pesanan | `paymentMethod`, `channel` |
| **7 hari** | Tren omzet siap dibaca | `revenueTrend()` |

Jangan memakai "jumlah warung"/"transaksi diproses" sebelum ada data nyata. Jika nanti ada, sertakan periode dan cara menghitung.

### 4.5 Masa uji coba (copy final)

> **Gratis selama masa uji coba.**
> Semua fitur terbuka, tanpa kartu kredit. Kami belum menetapkan tanggal berakhirnya uji coba; kalau nanti ada paket berbayar, kami akan mengumumkannya lebih dulu dan datamu tetap bisa diekspor (CSV/Z-Report).

Tiga poin: (1) semua fitur, bukan versi terbatas; (2) tanpa kartu kredit; (3) batas jujur — butuh internet saat checkout, struk lewat dialog cetak browser, QRIS dicatat manual.

### 4.6 FAQ (8 pertanyaan)

1. **Apakah benar gratis?** Ya, selama masa uji coba; tanpa kartu kredit; belum ada tanggal berakhir.
2. **Perlu instal aplikasi?** Tidak. Buka di browser. Checkout butuh koneksi internet.
3. **Data warung saya tercampur dengan warung lain?** Tidak. Setiap warung tenant terpisah; akses dibatasi role di server.
4. **Bisa dipakai lebih dari satu kasir?** Bisa. Undang anggota, pilih role; satu shift kas aktif per warung.
5. **Bisa cetak ke printer thermal?** Belum terintegrasi; cetak lewat dialog browser (bisa PDF).
6. **QRIS terhubung otomatis?** Belum; QRIS/transfer dicatat sebagai metode bayar.
7. **Bisa ekspor data?** Ya, CSV dan Z-Report teks.
8. **Kalau internet mati?** Keranjang tetap tersimpan di perangkat, tetapi checkout dan laporan butuh server.

### 4.7 CTA penutup

> **Coba Warung POS di warung Anda.**
> Buat warung, tambahkan beberapa produk, dan jalankan transaksi pertama dalam hitungan menit.
> `[Coba gratis]` `[Sudah punya akun? Masuk]`

## 5. Desain

Mengikuti `DESIGN.md` dan token di `src/index.css`, tanpa token baru:

- **Warna:** kanvas putih, selang-seling `surface-bone`/`canvas`, satu band gelap `bg-ink` untuk CTA penutup; aksen tunggal `primary` hanya untuk CTA/aktif; teks di atas hijau memakai `on-primary`.
- **Tipografi:** H1 `font-display font-black leading-[0.85]` responsif; subjudul `text-lg text-body`; tanpa weight tipis untuk display.
- **Bentuk:** CTA pill lewat `Button`/`buttonStyles` yang sudah ada; kartu `rounded-[30px]` + `shadow-level1`.
- **Elevasi:** ring shadow; kartu hover `shadow-level3` + skala halus.
- **Spasi:** section `py-24` desktop, `py-14` mobile; kontainer maks. 1200px.
- **Mockup hero:** HTML/CSS (kartu produk + keranjang + struk), bukan gambar — tidak perlu pipeline aset/R2 dan tidak basi saat UI berubah.
- **Responsif:** 1 kolom < 640px, 2 kolom 640–1023px, 3 kolom ≥ 1024px; target sentuh ≥ 44px; nav jadi menu ringkas di mobile.
- **Gerak:** 150–200ms, `motion-reduce` dihormati; tanpa library animasi.

Komponen: `src/components/marketing/{SiteHeader,SiteFooter,Hero,FeatureGrid,Steps,BetaBand,Facts,Faq,CtaBand,Section}.tsx`. Copy/data di `src/data/marketing.ts` mengikuti pola `src/data/guide.ts`.

## 6. Teknis

### 6.1 Gerbang sesi & SSR (satu-satunya perubahan di berkas lama)

`src/lib/public-routes.ts`:

```ts
export const PUBLIC_PATHS = ['/beranda', '/sitemap', '/privasi', '/ketentuan', '/masuk'] as const
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname as (typeof PUBLIC_PATHS)[number])
}
```

`src/routes/__root.tsx` — ekstraksi mekanis, perilaku rute aplikasi tidak berubah:

```tsx
function RootComponent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  if (isPublicPath(pathname)) return <Outlet />   // homepage SSR penuh, tanpa hook sesi
  return <RequireSession pathname={pathname} />
}

function RequireSession({ pathname }: { pathname: string }) {
  const session = useSession()
  // ...blok spinner, isAuthRoute, AuthScreen, AppShell yang sudah ada, dipindah apa adanya
}
```

Alasan: `useSession` tidak boleh dipanggil kondisional, dan rute publik tidak boleh menunggu sesi — jika tidak, HTML server hanya berisi spinner (temuan #3) dan homepage tidak terindeks. Diff sengaja kecil agar mudah di-rebase dengan pekerjaan agent lain.

### 6.2 Meta & SEO

- `src/data/site.ts`: nama, tagline, deskripsi, `SITE_URL` (env + fallback dev), tautan sosial/kontak.
- `head()` homepage: title, description, canonical, OG/Twitter (`og:locale=id_ID`). Root tetap jadi fallback.
- JSON-LD: `SoftwareApplication` (`BusinessApplication`, `Web`, `offers.price: 0`, `IDR`, "Gratis selama masa uji coba") + `FAQPage` yang isinya **persis** teks FAQ terlihat.
- `lang="id"` sudah ada di `RootDocument`.
- Tanpa analytics (tidak diminta, belum ada alatnya).

### 6.3 `robots.txt` & `sitemap.xml`

Server route mengikuti pola `src/routes/api.health.ts` (tidak melewati gerbang UI):

| Rute | Isi |
| --- | --- |
| `src/routes/robots[.]txt.ts` | `User-agent: *`, `Allow: /beranda`, `Disallow: /`, `/masuk`, `/keranjang`, `/checkout`, `/laporan`, `/riwayat`, `/anggota`, `/pengaturan`, `/pulihkan`, `/sukses`, `/api/`, + `Sitemap: <origin>/sitemap.xml` |
| `src/routes/sitemap[.]xml.ts` | Hanya `/beranda`, `/sitemap`, `/privasi`, `/ketentuan`; `lastmod` dari konstanta rilis |

Catatan: `Disallow: /` + `Allow: /beranda` benar untuk fase sementara; saat swap, urutannya dibalik (`Allow: /`, `Disallow:` rute aplikasi).
Halaman **`/sitemap`** (HTML) memetakan bagian publik dan bagian aplikasi ("perlu masuk"), dari `src/data/site.ts`.

### 6.4 Footer

| Kolom | Isi |
| --- | --- |
| Produk | Fitur `#fitur` · Cara pakai `#cara-pakai` · Gratis `#gratis` · FAQ `#faq` · Coba gratis `/masuk?mode=register` |
| Sumber daya | Sitemap `/sitemap` · Panduan `/panduan` (label "perlu masuk") |
| Developer | GitHub `https://github.com/ridwanmuh3/warung-pos` — **tampilkan hanya setelah repo publik** (sekarang 404); Issue untuk laporan bug |
| Legal | Privasi `/privasi` · Ketentuan `/ketentuan` |
| Baris bawah | `© 2026 Warung POS` · "Masih dalam masa uji coba" · "Dibuat oleh ridwanmuh3" · Sitemap |

Privasi/ketentuan: ringkasan jujur (Turso, cookie sesi `httpOnly`, R2, kontak pemilik), ditandai "ringkasan, bukan nasihat hukum" sampai ditinjau pemilik. **Jangan** membuat tautan ke halaman yang belum ada.

## 7. Tahapan & acceptance criteria

| Phase | Pekerjaan | AC |
| --- | --- | --- |
| **B0. Gerbang publik** | `public-routes.ts` + ekstraksi root | `pnpm build`/`lint`/`test` hijau; `/` tetap layar kasir seperti sekarang; `/beranda` (placeholder) terbuka tanpa sesi dan HTML-nya dirender server |
| **B1. Homepage** | Section 1–10, `marketing.ts`, komponen marketing, header/footer, nav mobile, mockup CSS | Semua anchor ada; satu `<h1>`; tanpa overflow horizontal di 320px; FAQ bisa dibuka keyboard |
| **B2. SEO** | `head()`, JSON-LD, `robots[.]txt`, `sitemap[.]xml`, `/sitemap`, OG image | `curl /beranda` memuat teks hero (bukan spinner); XML valid; JSON-LD lolos `JSON.parse`; meta unik |
| **B3. Footer & legal** | Privasi, ketentuan, aktivasi GitHub, kontak | Keempat kolom berfungsi; tidak ada tautan 404 |
| **B4. Verifikasi** | Jalankan §8, perbaiki temuan | Semua lulus atau dicatat sebagai keterbatasan |
| **D. Swap ke `/` (ditunda)** | Pindah kasir ke `/kasir`, homepage ke `/`, 301 `/beranda`, perbarui tautan/README/canonical | **Tidak dikerjakan** sampai pekerjaan agent lain selesai |

Perkiraan fase B: B0 ±1–2 jam; B1 ±1–1,5 hari; B2 ±0,5 hari; B3 ±0,5 hari.

## 8. Verifikasi

1. `pnpm lint`, `pnpm test`, `pnpm build` — harus hijau.
2. `pnpm dev`, lalu:
   - `curl -s localhost:3000/beranda | grep -c "Kasir warung yang langsung"` → ≥ 1 (konten ada di HTML server).
   - `/beranda` tanpa cookie → 200 halaman pemasaran; `/` tanpa cookie → layar masuk seperti sebelumnya.
   - `/robots.txt` → 200 `text/plain` dengan `Disallow: /` + `Allow: /beranda`; `/sitemap.xml` → 200 `application/xml`, hanya rute publik.
   - `/sitemap`, `/privasi`, `/ketentuan`, `/masuk?mode=register` → 200.
3. Regresi: `git diff --stat` hanya menyentuh `__root.tsx` + berkas baru; `rg 'to="/"' src` tidak berubah; alur login → kasir tetap sama.
4. A11y manual: landmark, urutan heading, focus ring, `<details>` keyboard, kontras token ≥ 4.5:1.
5. Responsif manual: 320px, 768px, 1280px.
6. Unit test: `tests/public-routes.test.ts` (`/beranda` publik; `/`, `/checkout`, `/berandax` privat) dan `tests/marketing-data.test.ts` (tanpa id duplikat, tautan internal diawali `/`).

Tidak menambah test renderer (tanpa `@testing-library`); perilaku visual diverifikasi lewat HTTP + DOM.

## 9. Risiko

| Risiko | Mitigasi |
| --- | --- |
| Perubahan root berkonflik dengan agent lain | Diff hanya ekstraksi `RequireSession` + 2 baris allowlist; rebase sebelum mulai; tidak menyentuh route/komponen fitur |
| Homepage ter-render sebagai spinner | Rute publik tidak memanggil `useSession`; dibuktikan `curl` (AC B2) |
| URL `/beranda` sementara bocor ke publik | Copy & metadata menyebut "Warung POS"; swap terjadwal; `robots` menunjuk `/beranda` agar tidak ada URL mati di indeks |
| Tautan GitHub 404 | Tahan sampai repo publik; jangan pasang ikon mati |
| Klaim gratis jadi janji permanen | "selama masa uji coba" + komitmen pengumuman; tanpa tanggal |
| Angka facts dianggap karangan | Hanya 4 angka §4.4, semuanya turunan fitur |
| Legal tertinggal | Halaman ringkas + label tinjauan pemilik; kontak wajib diisi sebelum rilis |
| `/panduan` tampak publik | Label "perlu masuk" |

## 10. Pertanyaan terbuka

1. **Domain produksi** untuk canonical/sitemap/OG? (belum ada di repo)
2. **Repo GitHub** akan dipublikasikan? Jika tidak, kolom Developer diisi apa?
3. **Kanal kontak** publik (email/WhatsApp/Instagram)? Belum ada di README.
4. Panduan perlu versi publik untuk footer, atau cukup label "perlu masuk"?
5. Nama penanggung jawab untuk footer legal, dan perlu versi lengkap privasi/ketentuan?
6. Setuju homepage sementara di **`/beranda`** lalu swap ke `/` setelah fitur kasir selesai?
