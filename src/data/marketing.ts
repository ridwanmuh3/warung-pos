import {
  IconBox,
  IconCash,
  IconChartBar,
  IconPackage,
  IconReceipt,
  IconShoppingCart,
  IconUserPlus,
  IconUsers,
} from '@tabler/icons-react'

/**
 * Homepage copy.
 *
 * Rules for this file: every promise must be backed by a shipped feature (see
 * README §2), and no number may imply traction we cannot prove. There is no
 * testimonial or customer count here on purpose.
 */

type MarketingIcon = typeof IconBox

export interface Feature {
  title: string
  body: string
  Icon: MarketingIcon
}

export interface Step {
  title: string
  body: string
  Icon: MarketingIcon
}

export interface Fact {
  value: string
  label: string
  note: string
}

export interface FaqItem {
  question: string
  answer: string
}

export const HERO = {
  badge: 'Masa uji coba — gratis',
  title: 'Kasir warung yang langsung bisa dipakai.',
  body: 'Catat penjualan, kurangi stok, dan tahu uang di laci — dalam satu alur. Tanpa instal, tanpa kartu kredit, gratis selama masa uji coba.',
  primaryCta: 'Coba gratis',
  secondaryCta: 'Lihat cara pakai',
  trust: 'Untuk warung makan & kelontong · Data tiap warung terpisah · Bisa dipakai di HP, tablet, dan laptop',
} as const

export const PROBLEMS = [
  {
    title: 'Penjualan tercatat di buku',
    body: 'Rekap malam sering tidak cocok dengan struk, dan angka kemarin sulit dicari lagi.',
  },
  {
    title: 'Stok dihitung dari ingatan',
    body: 'Barang baru ketahuan habis saat pelanggan memesan, bukan sebelum tutup toko.',
  },
  {
    title: 'Uang laci dihitung ulang',
    body: 'Tanpa catatan tunai masuk dan keluar, selisih kas tidak bisa dijelaskan.',
  },
] as const

export const FEATURES: Feature[] = [
  {
    title: 'Kasir cepat',
    body: 'Cari nama, SKU, atau scan barcode. Ketuk produk untuk masuk keranjang; keranjang tidak hilang saat tab ditutup.',
    Icon: IconShoppingCart,
  },
  {
    title: 'Checkout & struk',
    body: 'Tunai dengan kembalian otomatis, QRIS atau transfer, diskon nominal maupun persen. Struk siap dicetak dari browser.',
    Icon: IconReceipt,
  },
  {
    title: 'Stok otomatis',
    body: 'Stok berkurang saat terjual dan kembali saat transaksi dibatalkan. Peringatan muncul sebelum stok habis.',
    Icon: IconBox,
  },
  {
    title: 'Kas & shift',
    body: 'Buka kas dengan modal awal, tutup dengan hitungan fisik, lalu lihat selisihnya — lebih, kurang, atau pas.',
    Icon: IconCash,
  },
  {
    title: 'Laporan & margin',
    body: 'Omzet, laba kotor, margin, produk terlaris, jam tersibuk, dan tren tujuh hari. Ekspor CSV atau cetak Z-Report.',
    Icon: IconChartBar,
  },
  {
    title: 'Tim & peran',
    body: 'Undang owner, manajer, dan kasir. Hak akses diperiksa di server, bukan sekadar disembunyikan di layar.',
    Icon: IconUsers,
  },
]

export const STEPS: Step[] = [
  {
    title: 'Daftar dan buat warung',
    body: 'Isi nama warung, email, dan kata sandi. Akun pertama langsung menjadi owner. Tidak perlu kartu kredit.',
    Icon: IconUserPlus,
  },
  {
    title: 'Tambahkan produk',
    body: 'Cukup nama dan harga untuk mulai. Lengkapi HPP, stok, SKU, barcode, dan foto bila ingin laporan lebih rinci.',
    Icon: IconPackage,
  },
  {
    title: 'Mulai berjualan',
    body: 'Buka kas, pilih produk, terima pembayaran, lalu cetak atau simpan struk. Kembalian tunai dihitung otomatis.',
    Icon: IconShoppingCart,
  },
  {
    title: 'Tutup kas dan baca laporan',
    body: 'Bandingkan uang fisik dengan angka seharusnya, lalu lihat omzet, laba, dan produk terlaris hari itu.',
    Icon: IconChartBar,
  },
]

export const BETA_POINTS = [
  'Semua fitur terbuka — bukan versi terbatas.',
  'Tanpa kartu kredit dan tanpa biaya tersembunyi.',
  'Butuh internet saat checkout; struk dicetak lewat dialog browser.',
] as const

export const BETA_NOTE =
  'Kami belum menetapkan tanggal berakhirnya uji coba. Kalau nanti ada paket berbayar, kami akan mengumumkannya lebih dulu dan datamu tetap bisa diekspor (CSV/Z-Report).'

export const FACTS: Fact[] = [
  { value: 'Rp0', label: 'Biaya selama uji coba', note: 'Tanpa langganan, tanpa kartu kredit.' },
  { value: '3', label: 'Peran akses', note: 'Owner, manajer, dan kasir.' },
  { value: '3', label: 'Metode bayar', note: 'Tunai, QRIS, dan transfer.' },
  { value: '7 hari', label: 'Tren omzet', note: 'Langsung terbaca di laporan.' },
]

export const FAQ: FaqItem[] = [
  {
    question: 'Apakah benar gratis?',
    answer:
      'Ya. Selama masa uji coba semua fitur terbuka dan tidak ada biaya. Kami belum menetapkan tanggal berakhirnya uji coba; kalau nanti ada paket berbayar, kami akan mengumumkannya lebih dulu.',
  },
  {
    question: 'Apakah perlu instal aplikasi?',
    answer:
      'Tidak. Warung POS dibuka lewat browser di HP, tablet, atau laptop. Checkout dan laporan memerlukan koneksi internet.',
  },
  {
    question: 'Apakah data warung saya tercampur dengan warung lain?',
    answer:
      'Tidak. Setiap warung adalah tenant terpisah, dan akses dibatasi berdasarkan peran yang diperiksa di server — bukan hanya disembunyikan di antarmuka.',
  },
  {
    question: 'Bisa dipakai lebih dari satu kasir?',
    answer:
      'Bisa. Pemilik dapat mengundang anggota dan memilih peran owner, manajer, atau kasir. Satu warung memiliki satu shift kas aktif dalam satu waktu.',
  },
  {
    question: 'Bisa mencetak struk ke printer thermal?',
    answer:
      'Belum terintegrasi langsung dengan printer thermal. Struk dicetak melalui dialog cetak browser dan bisa disimpan sebagai PDF.',
  },
  {
    question: 'Apakah QRIS terhubung otomatis?',
    answer:
      'Belum. QRIS dan transfer dicatat sebagai metode pembayaran; aplikasi ini bukan payment gateway dan tidak memverifikasi dana masuk secara otomatis.',
  },
  {
    question: 'Bisa ekspor data?',
    answer:
      'Bisa. Laporan harian dapat diekspor ke CSV, dan Z-Report tersedia sebagai teks siap cetak atau unduh.',
  },
  {
    question: 'Bagaimana kalau internet mati?',
    answer:
      'Keranjang tetap tersimpan di perangkat, jadi pesanan yang sedang disusun tidak hilang. Checkout, stok, dan laporan memerlukan server, sehingga tidak ada mode offline penuh.',
  },
]
