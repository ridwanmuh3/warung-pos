import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import {
  IconBuildingStore,
  IconChartBar,
  IconDatabaseImport,
  IconFileText,
  IconHistory,
  IconLogout,
  IconPackage,
  IconShoppingCart,
  IconUser,
  IconUsers,
} from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useCart } from '../lib/cart'
import { logout } from '../lib/auth.session'
import type { PublicUser } from '../lib/auth.server'
import { hasLegacyData } from '../lib/legacy'
import { useTenant } from '../lib/useTenant'

const NAV_ITEMS = [
  { to: '/', label: 'Kasir', Icon: IconShoppingCart },
  { to: '/produk', label: 'Produk', Icon: IconPackage },
  { to: '/riwayat', label: 'Riwayat', Icon: IconHistory },
  { to: '/ringkasan', label: 'Ringkasan', Icon: IconChartBar },
  { to: '/laporan', label: 'Laporan', Icon: IconFileText },
] as const

export function AppShell({ children, session }: { children: ReactNode; session: PublicUser | null }) {
  const { count } = useCart()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const navigating = useRouterState({ select: (state) => state.isLoading })
  const [menuOpen, setMenuOpen] = useState(false)
  const [legacyAvailable, setLegacyAvailable] = useState(false)
  const tenant = useTenant()

  useEffect(() => {
    setLegacyAvailable(hasLegacyData())
  }, [])

  function signOut() {
    setMenuOpen(false)
    void logout().then(() => navigate({ to: '/masuk' }))
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        {navigating && (
          <div className="absolute inset-x-0 top-0 h-[3px] overflow-hidden" aria-hidden>
            <div className="h-full w-1/4 animate-nav-progress rounded-full bg-primary" />
          </div>
        )}
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 md:justify-normal">
          <Link to="/" className="flex items-center gap-2 font-display font-black text-ink">
            <span className="grid size-8 place-items-center rounded-md bg-primary text-on-primary">
              <IconBuildingStore size={18} stroke={2} />
            </span>
            <span className="hidden sm:inline">Warung POS</span>
          </Link>

          <nav className="hidden flex-1 items-center gap-1 md:flex">
            {NAV_ITEMS.map(({ to, label, Icon }) => {
              const active = to === '/' ? pathname === '/' : pathname.startsWith(to)
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    active ? 'bg-ink text-white' : 'text-body hover:bg-surface-muted'
                  }`}
                >
                  <Icon size={16} stroke={2} />
                  <span className="hidden md:inline">{label}</span>
                </Link>
              )
            })}
          </nav>

          <Link
            to="/keranjang"
            className="flex items-center gap-2 rounded-full border-2 border-primary bg-primary px-4 py-1.5 text-sm font-semibold text-on-primary transition duration-150 ease-out hover:bg-primary-hover"
          >
            <IconShoppingCart size={18} stroke={2} />
            <span className="hidden sm:inline">Keranjang</span>
            <span className="tabular rounded-full bg-on-primary/10 px-1.5 py-0.5 text-xs">{count}</span>
          </Link>

          {session && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                data-testid="account-menu"
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <span className="grid size-6 place-items-center rounded-full bg-ink text-[11px] font-bold text-white">
                  {session.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden max-w-24 truncate lg:inline">{session.name}</span>
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-30 mt-2 w-56 rounded-md border border-border-subtle bg-surface p-1.5 shadow-level3"
                >
                  <div className="flex items-center gap-2 px-2.5 py-2">
                    <IconUser size={16} stroke={2} className="shrink-0 text-slate-400" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{session.name}</p>
                      <p className="truncate text-xs text-slate-500">{session.email}</p>
                    </div>
                  </div>

                  {tenant.context && (
                    <div className="px-2.5 pb-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-mute">
                        Toko · {tenant.context.role}
                      </p>
                      {tenant.memberships.length > 1 ? (
                        <select
                          value={tenant.context.tenantId}
                          onChange={(event) => void tenant.switchTenant(event.target.value)}
                          aria-label="Pilih toko"
                          data-testid="tenant-switcher"
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 outline-none focus:border-brand-500"
                        >
                          {tenant.memberships.map((membership) => (
                            <option key={membership.tenantId} value={membership.tenantId}>
                              {membership.tenantName} · {membership.role}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="truncate text-sm font-medium text-slate-700">
                          {tenant.context.tenantName}
                        </p>
                      )}
                    </div>
                  )}

                  {tenant.context?.role === 'owner' && (
                    <Link
                      to="/anggota"
                      onClick={() => setMenuOpen(false)}
                      role="menuitem"
                      data-testid="account-members-link"
                      className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                    >
                      <IconUsers size={16} stroke={2} />
                      Anggota Toko
                    </Link>
                  )}

                  {legacyAvailable && (
                    <Link
                      to="/pulihkan"
                      onClick={() => setMenuOpen(false)}
                      role="menuitem"
                      data-testid="account-restore-link"
                      className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
                    >
                      <IconDatabaseImport size={16} stroke={2} />
                      Pulihkan Data Lama
                    </Link>
                  )}

                  <div className="my-1 border-t border-slate-100" />
                  <button
                    onClick={signOut}
                    role="menuitem"
                    data-testid="logout-button"
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <IconLogout size={16} stroke={2} />
                    Keluar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 md:pb-6">{children}</main>

      {/* Mobile bottom tab bar */}
      <nav className="no-print safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-5xl items-stretch justify-around px-2 pt-1.5">
          {NAV_ITEMS.map(({ to, label, Icon }) => {
            const active = to === '/' ? pathname === '/' : pathname.startsWith(to)
            return (
              <Link
                key={to}
                to={to}
                className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-full px-2 py-1.5 text-[11px] font-medium transition-colors ${
                  active ? 'bg-primary text-on-primary' : 'text-mute'
                }`}
              >
                <Icon size={20} stroke={2} />
                <span className="truncate">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      <footer className="no-print hidden border-t border-divider py-4 text-center text-xs text-mute md:block">
        Warung POS — MVP kasir sederhana
      </footer>
    </div>
  )
}
