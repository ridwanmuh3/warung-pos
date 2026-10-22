import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * The daily summary now lives inside `/laporan` as the "Hari ini" tab.
 * Kept as a redirect so old bookmarks and links keep working.
 */
export const Route = createFileRoute('/ringkasan')({
  beforeLoad: () => {
    throw redirect({ to: '/laporan', search: { tab: 'hari-ini' }, replace: true })
  },
  component: () => null,
})
