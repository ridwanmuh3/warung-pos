import {
  IconBuildingStore,
  IconCash,
  IconChartBar,
  IconLock,
  IconLockOpen,
  IconPackage,
  IconReceipt,
  IconShoppingCart,
  IconUsers,
} from '@tabler/icons-react'

/**
 * In-app usage guide copy.
 *
 * Written for a mixed-age warung team: one action per sentence, no technical
 * vocabulary, and no dependency on a previous screen. The guide page and the
 * first-run sheet read from here so the wording cannot drift.
 */

type GuideIcon = typeof IconCash

export interface GuideStep {
  title: string
  body: string
  Icon: GuideIcon
}

export interface GuideProblem {
  title: string
  body: string
}

export interface RoleRow {
  role: string
  can: string
}

export const KASIR_STEPS: GuideStep[] = [
  {
    title: 'Buka kas',
    body: 'Isi modal awal (uang di laci), lalu tekan Buka Kas. Penjualan tunai baru masuk rekonsiliasi setelah kas dibuka.',
    Icon: IconLockOpen,
  },
  {
    title: 'Pilih produk',
    body: 'Ketuk kartu produk untuk menambah. Ketuk lagi untuk menambah jumlah. Gunakan kolom pencarian atau scan barcode bila perlu.',
    Icon: IconShoppingCart,
  },
  {
    title: 'Periksa keranjang',
    body: 'Buka Keranjang untuk mengubah jumlah atau menghapus produk. Kalau pelanggan belum membayar, tekan Tahan Pesanan.',
    Icon: IconPackage,
  },
  {
    title: 'Bayar',
    body: 'Pilih Tunai, QRIS, atau Transfer. Untuk tunai, tekan Uang Pas atau masukkan uang yang diterima; kembalian muncul otomatis.',
    Icon: IconCash,
  },
  {
    title: 'Konfirmasi',
    body: 'Tekan Konfirmasi Pesanan. Struk muncul; cetak atau tunjukkan ke pelanggan. Stok langsung berkurang.',
    Icon: IconReceipt,
  },
  {
    title: 'Tutup kas',
    body: 'Saat selesai, hitung uang fisik di laci, masukkan jumlahnya, lalu tekan Tutup Kas. Selisih akan tercatat di laporan.',
    Icon: IconLock,
  },
]

export const OWNER_STEPS: GuideStep[] = [
  {
    title: 'Beri nama warung',
    body: 'Buka Pengaturan, isi nama warung, lalu Simpan. Nama ini tampil di struk dan menu akun.',
    Icon: IconBuildingStore,
  },
  {
    title: 'Tambah produk',
    body: 'Buka Produk, tekan tombol Produk, lalu isi nama dan harga. Foto, stok, dan barcode boleh ditambahkan nanti.',
    Icon: IconPackage,
  },
  {
    title: 'Undang anggota',
    body: 'Buka menu akun di kanan atas, pilih Anggota Toko, lalu tentukan siapa yang menjadi manajer atau kasir.',
    Icon: IconUsers,
  },
  {
    title: 'Buka kas dan jualan',
    body: 'Dari halaman Kasir, buka kas dengan modal awal. Setelah itu produk bisa dipilih dan dibayar seperti biasa.',
    Icon: IconLockOpen,
  },
  {
    title: 'Lihat laporan',
    body: 'Buka Laporan untuk melihat penjualan hari ini atau per hari. Laporan memakai transaksi nyata, bukan data contoh.',
    Icon: IconChartBar,
  },
]

/** Three lines for the one-time sheet. Short enough to read on a phone. */
export const QUICK_START: Array<{ title: string; body: string }> = [
  { title: 'Buka kas', body: 'Isi modal awal di laci sebelum melayani pembayaran tunai.' },
  { title: 'Pilih produk, lalu bayar', body: 'Ketuk produk, periksa keranjang, lalu tekan Konfirmasi Pesanan.' },
  { title: 'Tutup kas', body: 'Hitung uang fisik saat selesai agar laporan kas tetap cocok.' },
]

export const TROUBLESHOOTING: GuideProblem[] = [
  {
    title: 'Salah pilih produk',
    body: 'Sebelum dibayar, ubah atau hapus produk di Keranjang. Kalau sudah dibayar, buka Riwayat, cari struknya, lalu Batalkan Transaksi.',
  },
  {
    title: 'Sudah terlanjur bayar',
    body: 'Jangan membuat transaksi baru. Buka Riwayat → struk → Batalkan Transaksi. Hanya manajer dan pemilik yang bisa melakukannya; stok dikembalikan.',
  },
  {
    title: 'Lupa buka kas',
    body: 'Buka kas sekarang lewat panel Kas di halaman Kasir. Penjualan tunai sebelum kas dibuka tidak masuk rekonsiliasi, jadi catat manual bila perlu.',
  },
  {
    title: 'Internet mati',
    body: 'Jangan tutup halaman. Tunggu koneksi kembali, lalu ulangi. Transaksi baru tersimpan setelah server menerimanya.',
  },
  {
    title: 'Lupa tutup kas',
    body: 'Tutup kas dengan hitungan uang fisik. Selisih terhadap jumlah seharusnya akan tercatat di laporan.',
  },
  {
    title: 'Tombol tidak muncul',
    body: 'Berarti fitur itu bukan hak akses Anda. Hubungi pemilik atau manajer warung.',
  },
]

export const ROLE_ROWS: RoleRow[] = [
  {
    role: 'Kasir',
    can: 'Untuk kasir, pelayan, atau staf penjualan: melayani pembayaran, membuka dan menutup kas, melihat produk, serta riwayat transaksi hari ini.',
  },
  {
    role: 'Manajer',
    can: 'Semua tugas kasir, ditambah mengelola produk dan stok, melihat laporan tanggal lain, dan membatalkan transaksi.',
  },
  {
    role: 'Pemilik',
    can: 'Semua tugas manajer, ditambah mengubah nama warung, mengatur anggota, dan membuka Pengaturan.',
  },
]
