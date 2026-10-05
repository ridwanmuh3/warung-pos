import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import {
  IconBuildingStore,
  IconChartBar,
  IconFileText,
  IconHistory,
  IconLogout,
  IconPackage,
  IconShoppingCart,
  IconUser,
} from '@tabler/icons-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { useCart } from '../lib/cart'
import { logout } from '../lib/auth.session'
import type { PublicUser } from '../lib/auth.server'

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
  const [menuOpen, setMenuOpen] = useState(false)

  function signOut() {
    setMenuOpen(false)
    void logout().then(() => navigate({ to: '/masuk' }))
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 md:justify-normal">
          <Link to="/" className="flex items-center gap-2 font-bold text-slate-900">
            <span className="grid size-8 place-items-center rounded-lg bg-brand-600 text-white">
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
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
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
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            <IconShoppingCart size={18} stroke={2} />
            <span className="hidden sm:inline">Keranjang</span>
            <span className="tabular rounded bg-white/25 px-1.5 py-0.5 text-xs">{count}</span>
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
                <span className="grid size-6 place-items-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                  {session.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden max-w-24 truncate lg:inline">{session.name}</span>
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-30 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
                >
                  <div className="flex items-center gap-2 px-2.5 py-2">
                    <IconUser size={16} stroke={2} className="shrink-0 text-slate-400" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{session.name}</p>
                      <p className="truncate text-xs text-slate-500">{session.email}</p>
                    </div>
                  </div>
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
                className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors ${
                  active ? 'text-brand-700' : 'text-slate-500'
                }`}
              >
                <Icon size={20} stroke={2} />
                <span className="truncate">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      <footer className="no-print hidden border-t border-slate-200 py-4 text-center text-xs text-slate-400 md:block">
        Warung POS — MVP kasir sederhana
      </footer>
    </div>
  )
}
