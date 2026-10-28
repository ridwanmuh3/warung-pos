/**
 * Public pages: reachable without a session and rendered without the app shell.
 *
 * The marketing site lives outside the POS routes on purpose. `/` is still the
 * cashier, so the homepage is served from `/beranda` until the app moves to
 * `/kasir`. Anything not listed here keeps the existing sign-in gate.
 */
export const PUBLIC_PATHS = [
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
