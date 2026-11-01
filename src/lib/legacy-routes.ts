/**
 * Permanent redirects from the old Indonesian URLs to the English API surface.
 *
 * Kept in one map so the router only needs a single catch-all route. Dynamic
 * segments are matched by prefix; query keys and enum values are translated to
 * their current English names so old bookmarks keep their filters.
 */

const EXACT_ROUTES: Record<string, string> = {
  '/kasir': '/cashier',
  '/produk': '/products',
  '/keranjang': '/cart',
  '/riwayat': '/orders',
  '/laporan': '/reports',
  '/anggota': '/members',
  '/pengaturan': '/settings',
  '/pulihkan': '/restore',
  '/masuk': '/login',
  '/panduan': '/guide',
  '/privasi': '/privacy',
  '/ketentuan': '/terms',
  '/beranda': '/',
  '/ringkasan': '/reports?tab=today',
}

const PREFIX_ROUTES: ReadonlyArray<readonly [from: string, to: string]> = [
  ['/riwayat/', '/orders/'],
  ['/sukses/', '/order-success/'],
]

const QUERY_KEYS: Record<string, string> = {
  kategori: 'category',
  cari: 'q',
  menipis: 'lowStock',
  tanggal: 'day',
}

const QUERY_VALUES: Record<string, Record<string, string>> = {
  category: { makanan: 'food', minuman: 'drink', semua: 'all' },
  tab: { 'hari-ini': 'today', 'per-hari': 'daily' },
  method: { tunai: 'cash' },
  channel: { bungkus: 'takeaway', ojol: 'delivery' },
}

/** The English URL for a legacy path, or `null` when the path is not legacy. */
export function legacyRedirect(pathname: string, searchStr = ''): string | null {
  // `/kasir/` is the same bookmark as `/kasir`; normalise before matching.
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  let target: string | null = null

  if (Object.hasOwn(EXACT_ROUTES, path)) {
    target = EXACT_ROUTES[path]
  } else {
    for (const [from, to] of PREFIX_ROUTES) {
      if (path.startsWith(from)) {
        target = `${to}${path.slice(from.length)}`
        break
      }
    }
  }

  if (target === null) return null

  const [targetPath, targetQuery = ''] = target.split('?')
  const params = new URLSearchParams(targetQuery)

  for (const [key, value] of new URLSearchParams(searchStr)) {
    const nextKey = QUERY_KEYS[key] ?? key
    const nextValue = QUERY_VALUES[nextKey]?.[value] ?? value
    params.set(nextKey, nextValue)
  }

  const query = params.toString()
  return query ? `${targetPath}?${query}` : targetPath
}
