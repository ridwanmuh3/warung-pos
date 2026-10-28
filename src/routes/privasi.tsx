import { createFileRoute } from '@tanstack/react-router'
import { LegalList, LegalPage, LegalSection } from '../components/marketing/LegalPage'
import { SITE } from '../data/site'

const SECTIONS = [
  { id: 'pengendali', title: 'Siapa yang mengendalikan data' },
  { id: 'data', title: 'Data yang diproses' },
  { id: 'cookie', title: 'Cookie dan penyimpanan browser' },
  { id: 'tujuan', title: 'Tujuan dan dasar pemrosesan' },
  { id: 'akses', title: 'Siapa yang dapat mengakses' },
  { id: 'pihak-ketiga', title: 'Penyedia pihak ketiga' },
  { id: 'retensi', title: 'Berapa lama data disimpan' },
  { id: 'hak', title: 'Hak Anda' },
  { id: 'keamanan', title: 'Keamanan' },
  { id: 'anak', title: 'Anak dan akun staf' },
  { id: 'perubahan', title: 'Perubahan kebijakan' },
  { id: 'kontak', title: 'Kontak' },
] as const

export const Route = createFileRoute('/privasi')({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: `Kebijakan privasi — ${SITE.name}` },
      {
        name: 'description',
        content:
          'Data apa yang diproses Warung POS, cookie sesi, penyedia pihak ketiga, masa simpan, dan cara memakai hak akses, koreksi, ekspor, serta penghapusan data.',
      },
      { name: 'robots', content: 'index, follow' },
    ],
  }),
})

function PrivacyPage() {
  return (
    <LegalPage
      title="Kebijakan privasi"
      intro="Kebijakan ini menjelaskan data pribadi yang diproses Warung POS, alasannya, siapa yang dapat melihatnya, dan pilihan yang Anda miliki. Isinya mengikuti praktik aplikasi saat ini."
      summary={[
        'Kami menyimpan data yang dibutuhkan kasir, stok, kas, dan laporan — bukan data pelanggan untuk iklan.',
        'Hanya ada cookie sesi untuk login. Tidak ada cookie iklan, analitik, atau pelacakan lintas situs.',
        'Setiap warung adalah tenant terpisah; akses diperiksa di server berdasarkan peran.',
        'Data warung tidak dijual. Ekspor laporan tersedia dalam CSV dan Z-Report.',
      ]}
      sections={[...SECTIONS]}
    >
      <LegalSection id="pengendali" title="Siapa yang mengendalikan data">
        <p>
          Warung POS adalah layanan perangkat lunak yang dikelola oleh {SITE.author}. Untuk data
          akun (nama, email, kredensial) dan data teknis, Warung POS bertindak sebagai pengendali
          data.
        </p>
        <p>
          Untuk data operasional warung — produk, harga, transaksi, stok, shift, dan laporan —
          pemilik warung adalah pengendali data, dan Warung POS memproses data tersebut atas
          instruksi mereka untuk menjalankan layanan. Anggota tim yang diundang mengikuti peran
          yang diberikan pemilik warung.
        </p>
      </LegalSection>

      <LegalSection id="data" title="Data yang diproses">
        <LegalList>
          <li>
            <strong>Akun:</strong> nama, email, kata sandi yang sudah di-hash beserta salt, waktu
            pendaftaran, dan peran di setiap warung. Email dipakai sebagai identitas masuk; kami
            tidak mengirim email pemasaran.
          </li>
          <li>
            <strong>Warung dan anggota:</strong> nama warung, daftar anggota, dan peran
            (owner, manajer, kasir).
          </li>
          <li>
            <strong>Operasional:</strong> produk, kategori, harga, harga pokok (HPP), stok, SKU,
            barcode, gambar produk, transaksi beserta item, diskon, jenis pesanan, metode bayar,
            nama kasir yang diketik bebas, shift kas, dan jejak perubahan stok.
          </li>
          <li>
            <strong>Data teknis:</strong> cookie sesi, serta alamat IP dan waktu permintaan yang
            diproses untuk membatasi percobaan login dan pendaftaran. Penyedia hosting dapat
            menyimpan log teknis sesuai kebijakan mereka.
          </li>
          <li>
            <strong>Di perangkat Anda:</strong> keranjang dan preferensi tampilan disimpan di
            penyimpanan browser agar tidak hilang saat halaman dimuat ulang.
          </li>
        </LegalList>
        <p>
          Aplikasi tidak meminta nama, nomor telepon, atau alamat pelanggan. Jika Anda menuliskan
          data pribadi orang lain di kolom bebas (misalnya nama pada nama produk atau nama kasir),
          Anda bertanggung jawab memastikan dasar pemakaiannya.
        </p>
      </LegalSection>

      <LegalSection id="cookie" title="Cookie dan penyimpanan browser">
        <p>
          Warung POS memakai satu cookie sesi bernama <code>warung-pos</code>. Isinya terenkripsi,
          tidak dapat dibaca JavaScript (<code>httpOnly</code>), memakai <code>SameSite=Lax</code>,
          dan dikirim hanya lewat HTTPS di produksi. Masa berlakunya 30 hari dan cookie dihapus
          saat Anda keluar.
        </p>
        <p>
          Penyimpanan browser dipakai untuk keranjang dan preferensi tampilan. Kami tidak memakai
          cookie iklan, pixel pelacak, atau analitik pihak ketiga, dan tidak melacak Anda di situs
          lain.
        </p>
      </LegalSection>

      <LegalSection id="tujuan" title="Tujuan dan dasar pemrosesan">
        <LegalList>
          <li>
            <strong>Menjalankan layanan:</strong> autentikasi, menyusun katalog, menghitung
            pembayaran, mengurangi stok, merekonsiliasi kas, dan menyusun laporan.
          </li>
          <li>
            <strong>Keamanan:</strong> mencegah akses lintas warung, membatasi percobaan login, dan
            menjaga jejak perubahan stok.
          </li>
          <li>
            <strong>Kepatuhan:</strong> menanggapi permintaan sah terkait data dan menaati hukum
            yang berlaku.
          </li>
        </LegalList>
        <p>
          Kami tidak memproses data untuk iklan, profiling, atau penjualan kepada pihak lain.
        </p>
      </LegalSection>

      <LegalSection id="akses" title="Siapa yang dapat mengakses">
        <p>
          Anggota warung hanya dapat membuka data warung tempat mereka terdaftar. Peran menentukan
          tindakan yang diizinkan, dan pemeriksaan dilakukan di server — bukan sekadar
          menyembunyikan tombol. Kasir tidak dapat membuka laporan atau mengubah katalog.
        </p>
        <p>
          Penyedia infrastruktur dapat memproses data sebatas yang diperlukan untuk menjalankan
          layanan (lihat bagian berikut).
        </p>
      </LegalSection>

      <LegalSection id="pihak-ketiga" title="Penyedia pihak ketiga">
        <LegalList>
          <li><strong>Netlify</strong> — hosting aplikasi dan fungsi server.</li>
          <li><strong>Turso (libSQL)</strong> — database tempat data warung disimpan.</li>
          <li><strong>Cloudflare R2</strong> — penyimpanan gambar produk.</li>
        </LegalList>
        <p>
          Data dapat diproses di luar Indonesia oleh penyedia tersebut. Kami mengandalkan
          pengamanan dan ketentuan pemrosesan data dari masing-masing penyedia. QRIS dan transfer
          hanya dicatat sebagai metode pembayaran; tidak ada data kartu atau kredensial perbankan
          yang diproses aplikasi ini.
        </p>
      </LegalSection>

      <LegalSection id="retensi" title="Berapa lama data disimpan">
        <p>
          Data akun dan warung disimpan selama akun aktif agar laporan historis tetap dapat
          dibuka. Keranjang di perangkat Anda tersimpan sampai dibersihkan atau browser menghapus
          datanya.
        </p>
        <p>
          Penghapusan akun dapat dilakukan sendiri melalui <strong>Pengaturan → Hapus akun</strong>.
          Setelah kata sandi diverifikasi, akun dan keanggotaan Anda dihapus. Warung yang Anda
          satu-satunya anggotanya ikut dihapus beserta produk, transaksi, dan laporannya. Warung
          yang masih memiliki anggota lain tetap berjalan; riwayatnya tetap tersimpan untuk pemilik
          warung tersebut, tetapi tidak lagi terhubung ke akun Anda. Jika Anda pemilik terakhir di
          warung yang masih punya anggota, angkat owner pengganti terlebih dahulu — warung tidak
          boleh ditinggalkan tanpa admin.
        </p>
        <p>
          Setelah penghapusan, data dihapus dari database aktif. Salinan cadangan atau log yang
          dikelola penyedia hosting dapat bertahan untuk waktu terbatas sesuai kebijakan penyedia
          tersebut.
        </p>
      </LegalSection>

      <LegalSection id="hak" title="Hak Anda">
        <p>
          Sejauh diatur oleh Undang-Undang Perlindungan Data Pribadi (UU No. 27 Tahun 2022) dan
          hukum lain yang berlaku, Anda dapat:
        </p>
        <LegalList>
          <li>meminta informasi dan salinan data pribadi yang kami proses;</li>
          <li>memperbaiki data yang tidak akurat melalui aplikasi atau dengan menghubungi kami;</li>
          <li>mengekspor data laporan sendiri ke CSV atau Z-Report;</li>
          <li>menghapus akun sendiri melalui Pengaturan, atau meminta penghapusan data warung;</li>
          <li>menarik persetujuan atau menyampaikan keberatan atas pemrosesan tertentu.</li>
        </LegalList>
        <p>
          Pemilik warung dapat mengubah data operasional langsung di aplikasi. Penghapusan akun
          mandiri memerlukan kata sandi agar data tidak terhapus oleh orang yang memakai perangkat
          yang sama. Untuk permintaan lain yang menyangkut akun, kami memverifikasi kepemilikan
          terlebih dahulu agar data tidak diserahkan kepada orang yang salah.
        </p>
      </LegalSection>

      <LegalSection id="keamanan" title="Keamanan">
        <LegalList>
          <li>Kata sandi disimpan sebagai hash PBKDF2-SHA-256 dengan salt unik per akun.</li>
          <li>Cookie sesi terenkripsi, <code>httpOnly</code>, dan hanya dikirim lewat HTTPS di produksi.</li>
          <li>Setiap query data bisnis dibatasi tenant dan diperiksa terhadap peran pengguna.</li>
          <li>Percobaan login dan pendaftaran dibatasi per alamat IP.</li>
          <li>Respons server function memakai <code>Cache-Control: no-store</code> dan header keamanan dasar.</li>
        </LegalList>
        <p>
          Tidak ada sistem yang sepenuhnya bebas risiko. Laporkan dugaan kebocoran atau akses tidak
          sah melalui kontak di bawah agar dapat ditindaklanjuti.
        </p>
      </LegalSection>

      <LegalSection id="anak" title="Anak dan akun staf">
        <p>
          Layanan ini ditujukan untuk pemilik dan staf warung yang cakap hukum. Akun tidak boleh
          dibuat oleh anak di bawah usia yang ditetapkan hukum Indonesia, dan kami tidak dengan
          sengaja mengumpulkan data anak.
        </p>
      </LegalSection>

      <LegalSection id="perubahan" title="Perubahan kebijakan">
        <p>
          Kebijakan ini dapat diperbarui ketika fitur atau praktik data berubah. Versi dan tanggal
          berlaku selalu tercantum di bagian atas halaman. Perubahan penting akan diumumkan di
          aplikasi sebelum berlaku.
        </p>
      </LegalSection>

      <LegalSection id="kontak" title="Kontak">
        <p>
          Pertanyaan tentang data, permintaan salinan, atau penghapusan dapat disampaikan melalui
          kanal kontak pada bagian akhir halaman ini. Sertakan email akun dan nama warung agar
          permintaan dapat diverifikasi.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
