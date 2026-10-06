import { Link } from '@tanstack/react-router'
import { EmptyState } from './EmptyState'

export function NotFoundPage() {
  return (
    <EmptyState
      emoji="🤷"
      title="Halaman tidak ditemukan"
      description="Alamat yang kamu buka tidak tersedia."
      action={
        <Link to="/" className="rounded-full border-2 border-primary bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition duration-150 ease-out hover:bg-primary-hover">
          Kembali ke Kasir
        </Link>
      }
    />
  )
}
