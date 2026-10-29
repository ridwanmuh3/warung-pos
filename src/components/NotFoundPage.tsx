import { Link } from '@tanstack/react-router'
import { IconError404 } from '@tabler/icons-react'
import { EmptyState } from './EmptyState'
import { buttonStyles } from './ui/buttonStyles'

export function NotFoundPage() {
  return (
    <EmptyState
      icon={IconError404}
      title="Halaman tidak ditemukan"
      description="Alamat yang kamu buka tidak tersedia."
      action={
        <Link to="/kasir" className={buttonStyles({ size: 'md' })}>
          Kembali ke Kasir
        </Link>
      }
    />
  )
}
