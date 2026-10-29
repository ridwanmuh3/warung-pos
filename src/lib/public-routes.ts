/**
 * Public pages: reachable without a session and rendered without the app shell.
 *
 * The marketing site lives outside the POS routes; the cashier is at /kasir.
 * /beranda stays public only to serve the legacy redirect to /.
 */
export const PUBLIC_PATHS = [
  '/',
  '/beranda',
  '/sitemap',
  '/privasi',
  '/ketentuan',
  '/masuk',
] as const

export type PublicPath = (typeof PUBLIC_PATHS)[number]

export function isPublicPath(pathname: string): pathname is PublicPath {
  return (PUBLIC_PATHS as readonly string[]).includes(pathname)
}
