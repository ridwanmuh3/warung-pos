import { createFileRoute } from '@tanstack/react-router'
import { LegalList, LegalPage, LegalSection } from '../components/marketing/LegalPage'
import { SITE } from '../data/site'

const SECTIONS = [
  { id: 'definisi', title: 'Definisi' },
  { id: 'akun', title: 'Akun dan kelayakan' },
  { id: 'uji-coba', title: 'Masa uji coba dan biaya' },
  { id: 'penggunaan', title: 'Penggunaan yang dilarang' },
  { id: 'data', title: 'Kepemilikan data' },
  { id: 'batas', title: 'Batas layanan' },
  { id: 'ketersediaan', title: 'Ketersediaan dan perubahan' },
  { id: 'penangguhan', title: 'Penangguhan dan penghentian' },
  { id: 'tanggung-jawab', title: 'Penafian dan batas tanggung jawab' },
  { id: 'perubahan', title: 'Perubahan ketentuan' },
  { id: 'hukum', title: 'Hukum yang berlaku' },
  { id: 'kontak', title: 'Kontak' },
] as const

export const Route = createFileRoute('/ketentuan')({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: `Ketentuan layanan — ${SITE.name}` },
      {
        name: 'description',
        content:
          'Ketentuan pemakaian Warung POS: akun, masa uji coba gratis, penggunaan yang dilarang, kepemilikan data, batas layanan, dan tanggung jawab.',
      },
      { name: 'robots', content: 'index, follow' },
    ],
  }),
})

function TermsPage() {
  return (
    <LegalPage
      title="Ketentuan layanan"
      intro="Ketentuan ini mengatur pemakaian Warung POS selama masa uji coba: apa yang boleh dilakukan, apa yang tidak, dan batas tanggung jawab masing-masing pihak."
      summary={[
        'Layanan gratis selama masa uji coba; tidak ada penagihan otomatis.',
        'Data warung tetap milik pemilik warung. Kami hanya memprosesnya untuk menjalankan layanan.',
        'Ini alat operasional, bukan sistem akuntansi resmi atau payment gateway.',
        'Selama uji coba, layanan diberikan tanpa jaminan ketersediaan (SLA).',
      ]}
      sections={[...SECTIONS]}
    >
      <LegalSection id="definisi" title="Definisi">
        <LegalList>
          <li><strong>Layanan</strong> — aplikasi web Warung POS beserta halaman publiknya.</li>
          <li><strong>Akun</strong> — identitas masuk dengan email dan kata sandi.</li>
          <li><strong>Warung</strong> — tenant berisi katalog, transaksi, stok, kas, dan laporan.</li>
          <li><strong>Pemilik</strong> — pengguna dengan peran owner pada suatu warung.</li>
          <li><strong>Data Warung</strong> — seluruh data yang Anda atau tim masukkan ke Layanan.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="akun" title="Akun dan kelayakan">
        <LegalList>
          <li>
            Anda harus cakap hukum menurut hukum Indonesia. Jika mendaftar untuk badan usaha,
            pastikan Anda berwenang mewakilinya.
          </li>
          <li>Gunakan data akun yang benar dan satu akun untuk satu orang. Jangan berbagi kata sandi.</li>
          <li>
            Pemilik bertanggung jawab atas anggota yang diundang, peran yang diberikan, dan
            tindakan mereka di warung tersebut.
          </li>
          <li>
            Beri tahu kami segera jika akun atau kata sandi diduga disalahgunakan. Kami dapat
            mengakhiri sesi aktif sebagai tindakan pengamanan.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="uji-coba" title="Masa uji coba dan biaya">
        <p>
          Selama masa uji coba, Layanan dapat dipakai tanpa biaya dan tanpa kartu kredit. Tidak ada
          penagihan otomatis. Fitur, tampilan, dan batas pemakaian dapat berubah karena produk
          masih dikembangkan.
        </p>
        <p>
          Jika nanti ada paket berbayar, kami akan mengumumkannya sebelum berlaku. Kami tidak akan
          menagih tanpa persetujuan Anda, dan Data Warung tetap dapat diekspor.
        </p>
      </LegalSection>

      <LegalSection id="penggunaan" title="Penggunaan yang dilarang">
        <p>Anda tidak boleh menggunakan Layanan untuk:</p>
        <LegalList>
          <li>kegiatan yang melanggar hukum, termasuk mencatat transaksi untuk tujuan penipuan;</li>
          <li>mengakses data warung lain, mencoba melewati pembatasan peran, atau menguji keamanan tanpa izin;</li>
          <li>mengunggah gambar atau konten yang bukan hak Anda, bersifat melanggar, atau berisi malware;</li>
          <li>mengganggu layanan, melakukan pemindaian beban, scraping otomatis, atau serangan lainnya;</li>
          <li>menjual kembali, menyewakan, atau membangun layanan pesaing dari Layanan tanpa izin tertulis;</li>
          <li>mengirim undangan anggota secara massal kepada orang yang tidak berkepentingan.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="data" title="Kepemilikan data">
        <p>
          Data Warung tetap milik pemilik warung. Anda memberi Warung POS izin terbatas untuk
          menyimpan, memproses, dan menampilkan data tersebut semata-mata agar Layanan berfungsi —
          termasuk pencadangan operasional dan pembuatan laporan.
        </p>
        <p>
          Perangkat lunak, desain, merek, dan dokumentasi Warung POS tetap milik pengelola Layanan.
          Masukan yang Anda kirim dapat kami gunakan untuk memperbaiki produk tanpa kewajiban
          kompensasi.
        </p>
      </LegalSection>

      <LegalSection id="batas" title="Batas layanan">
        <LegalList>
          <li>
            Warung POS adalah alat operasional penjualan harian, bukan sistem akuntansi, pajak, atau
            pembukuan resmi. Laporan tidak menggantikan pencatatan yang diwajibkan hukum.
          </li>
          <li>
            QRIS dan transfer dicatat sebagai metode pembayaran tanpa verifikasi dana otomatis.
            Aplikasi bukan payment gateway dan tidak memproses data kartu.
          </li>
          <li>
            Struk dicetak melalui dialog cetak browser, bukan integrasi langsung dengan printer
            thermal.
          </li>
          <li>
            Checkout, stok, dan laporan memerlukan koneksi ke server. Tidak tersedia mode offline
            penuh; keranjang hanya tersimpan di perangkat.
          </li>
          <li>
            Penjualan melebihi stok diizinkan dengan peringatan (warn-and-allow), karena hitungan
            stok warung bisa tertinggal. Stok dapat menjadi negatif.
          </li>
          <li>
            Satu warung memiliki satu shift kas aktif, dan "hari ini" pada laporan mengikuti jam
            server, bukan zona waktu warung.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="ketersediaan" title="Ketersediaan dan perubahan">
        <p>
          Selama masa uji coba, Layanan disediakan apa adanya dan tanpa jaminan ketersediaan (SLA).
          Kami dapat melakukan pemeliharaan, memperbarui fitur, atau menghentikan bagian tertentu
          dengan pemberitahuan yang wajar bila memungkinkan.
        </p>
        <p>
          Kami menyarankan Anda mengekspor laporan penting secara berkala (CSV atau Z-Report)
          sebagai salinan mandiri.
        </p>
      </LegalSection>

      <LegalSection id="penangguhan" title="Penangguhan dan penghentian">
        <p>
          Kami dapat menangguhkan atau menghentikan akses bila ada pelanggaran ketentuan, risiko
          keamanan, atau kewajiban hukum — dengan pemberitahuan bila memungkinkan. Anda dapat
          berhenti memakai Layanan kapan saja.
        </p>
        <p>
          Anda dapat menghapus akun sendiri melalui <strong>Pengaturan → Hapus akun</strong> dengan
          memasukkan kata sandi dan mengetik HAPUS. Akun dan keanggotaan dihapus; warung yang Anda
          satu-satunya anggotanya ikut terhapus beserta datanya. Jika warung masih memiliki anggota
          lain, Anda harus mengangkat owner pengganti terlebih dahulu agar warung tidak kehilangan
          admin. Ekspor laporan yang masih dibutuhkan sebelum menghapus akun.
        </p>
        <p>
          Setelah penghentian, Data Warung yang tersisa dapat diminta untuk diekspor dalam waktu
          yang wajar sebelum dihapus, kecuali penyimpanan diwajibkan oleh hukum.
        </p>
      </LegalSection>

      <LegalSection id="tanggung-jawab" title="Penafian dan batas tanggung jawab">
        <p>
          Layanan disediakan "sebagaimana adanya". Sejauh diizinkan hukum yang berlaku, Warung POS
          tidak bertanggung jawab atas kerugian tidak langsung, kehilangan keuntungan, kehilangan
          data yang tidak Anda ekspor, atau keputusan bisnis yang diambil berdasarkan laporan.
        </p>
        <p>
          Anda bertanggung jawab atas kebenaran data yang dimasukkan, penggunaan akun oleh tim, dan
          kepatuhan warung terhadap kewajiban pajak serta pencatatan. Tidak ada bagian dari
          ketentuan ini yang menghapus hak yang tidak dapat dikesampingkan menurut hukum Indonesia.
        </p>
      </LegalSection>

      <LegalSection id="perubahan" title="Perubahan ketentuan">
        <p>
          Ketentuan ini dapat diperbarui seiring perubahan produk. Versi dan tanggal berlaku
          tercantum di bagian atas. Perubahan penting akan diumumkan di aplikasi; jika Anda tidak
          setuju, Anda dapat berhenti memakai Layanan dan meminta penghapusan data.
        </p>
      </LegalSection>

      <LegalSection id="hukum" title="Hukum yang berlaku">
        <p>
          Ketentuan ini diatur oleh hukum Republik Indonesia. Perselisihan diupayakan diselesaikan
          secara musyawarah terlebih dahulu; bila tidak tercapai, diselesaikan melalui pengadilan
          yang berwenang di Indonesia.
        </p>
      </LegalSection>

      <LegalSection id="kontak" title="Kontak">
        <p>
          Pertanyaan tentang ketentuan ini dapat disampaikan melalui kanal kontak pada bagian akhir
          halaman. Sertakan email akun dan nama warung agar permintaan dapat diverifikasi.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
