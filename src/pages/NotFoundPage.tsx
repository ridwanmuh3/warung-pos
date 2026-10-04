import { Link } from '@tanstack/react-router'
import { EmptyState } from '../components/EmptyState'

export function NotFoundPage() {
  return (
    <EmptyState
      emoji="🤷"
      title="Halaman tidak ditemukan"
      description="Alamat yang kamu buka tidak tersedia."
      action={
        <Link to="/" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
          Kembali ke Kasir
        </Link>
      }
    />
  )
}
