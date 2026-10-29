import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import {
    IconBook,
    IconBuildingStore,
    IconDatabaseImport,
    IconFileText,
    IconListCheck,
    IconLayoutSidebarLeftCollapse,
    IconLayoutSidebarLeftExpand,
    IconLogout,
    IconPackage,
    IconSettings,
    IconShoppingCart,
    IconUser,
    IconUsers,
} from '@tabler/icons-react'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { useCart } from '../lib/cart'
import { logout } from '../lib/auth.session'
import type { PublicUser } from '../lib/auth.server'
import { hasLegacyData } from '../lib/legacy'
import { hasSeenGuide } from '../lib/onboarding'
import { useTenant } from '../lib/useTenant'
import { FirstRunGuide } from './FirstRunGuide'
import { isActive } from './app-nav'

const NAV_ITEMS = [
    { to: '/kasir', label: 'Kasir', Icon: IconShoppingCart },
    { to: '/produk', label: 'Produk', Icon: IconPackage },
    { to: '/laporan', label: 'Laporan', Icon: IconFileText },
] as const

const MORE_ITEMS = [
    { to: '/riwayat', label: 'Riwayat Pesanan', Icon: IconFileText },
    { to: '/panduan', label: 'Panduan Penggunaan', Icon: IconBook },
    { to: '/anggota', label: 'Anggota Toko', Icon: IconUsers },
    { to: '/pengaturan', label: 'Pengaturan', Icon: IconSettings },
    { to: '/pulihkan', label: 'Pulihkan Data Lama', Icon: IconDatabaseImport },
] as const

const desktopQuery = '(min-width: 1024px)'
function subscribeDesktop(listener: () => void) {
    const query = window.matchMedia(desktopQuery)
    query.addEventListener('change', listener)
    return () => query.removeEventListener('change', listener)
}
function isDesktopViewport() { return window.matchMedia(desktopQuery).matches }

export function AppShell({ children, session }: { children: ReactNode; session: PublicUser | null }) {
    const { count } = useCart()
    const navigate = useNavigate()
    const pathname = useRouterState({ select: (state) => state.location.pathname })
    const navigating = useRouterState({ select: (state) => state.isLoading })
    const [menuOpen, setMenuOpen] = useState(false)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        if (typeof window === 'undefined') return false
        try { return localStorage.getItem('warung.sidebar') === 'collapsed' } catch { return false }
    })
    const [tabletExpanded, setTabletExpanded] = useState(false)
    const isDesktop = useSyncExternalStore(subscribeDesktop, isDesktopViewport, () => false)
    const [guideOpen, setGuideOpen] = useState(false)
    const [legacyAvailable, setLegacyAvailable] = useState(false)
    const dialogRef = useRef<HTMLDialogElement>(null)
    const toggleRef = useRef<HTMLButtonElement>(null)
    const sidebarRef = useRef<HTMLElement>(null)
    const tenant = useTenant()

    useEffect(() => {
        setLegacyAvailable(hasLegacyData())
    }, [])

    useEffect(() => {
        if (!session || !tenant.context || tenant.context.role === 'owner') return
        if (!hasSeenGuide(session.id)) setGuideOpen(true)
    }, [session, tenant.context])

    useEffect(() => {
        const dialog = dialogRef.current
        if (!dialog) return
        if (menuOpen && !dialog.open) dialog.showModal()
        if (!menuOpen && dialog.open) dialog.close()
    }, [menuOpen])

    useEffect(() => {
        if (!tabletExpanded) return
        const close = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setTabletExpanded(false)
                toggleRef.current?.focus()
            }
            if (event.key === 'Tab' && window.matchMedia('(max-width: 1023px)').matches) {
                const focusables = sidebarRef.current?.querySelectorAll<HTMLElement>('a, button, select')
                if (!focusables?.length) return
                const first = focusables[0]
                const last = focusables[focusables.length - 1]
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault()
                    last.focus()
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault()
                    first.focus()
                }
            }
        }
        const viewport = window.matchMedia('(min-width: 1024px)')
        const onResize = () => { if (viewport.matches) setTabletExpanded(false) }
        window.addEventListener('keydown', close)
        viewport.addEventListener('change', onResize)
        return () => {
            window.removeEventListener('keydown', close)
            viewport.removeEventListener('change', onResize)
        }
    }, [tabletExpanded])

    function toggleSidebar() {
        if (window.matchMedia('(max-width: 1023px)').matches) {
            if (!tabletExpanded) requestAnimationFrame(() => sidebarRef.current?.querySelector<HTMLAnchorElement>('a')?.focus())
            setTabletExpanded((open) => !open)
            return
        }
        setSidebarCollapsed((collapsed) => {
            try { localStorage.setItem('warung.sidebar', collapsed ? 'expanded' : 'collapsed') } catch { /* Keep current session preference. */ }
            return !collapsed
        })
    }

    function signOut() {
        setMenuOpen(false)
        void logout().then(() => navigate({ to: '/masuk' }))
    }

    const moreItems = MORE_ITEMS.filter(({ to }) =>
        (to !== '/anggota' || tenant.context?.role === 'owner') &&
        (to !== '/pulihkan' || legacyAvailable),
    )
    const sidebarWide = tabletExpanded || (isDesktop && !sidebarCollapsed)
    const labelClass = tabletExpanded ? '' : sidebarCollapsed ? 'hidden' : 'hidden lg:inline'
    const blockClass = tabletExpanded ? '' : sidebarCollapsed ? 'hidden' : 'hidden lg:block'
    const rail = !sidebarWide
    const closeTabletSidebar = () => setTabletExpanded(false)

    return (
        <div className={`app-layout flex min-h-full flex-col md:pl-[4.5rem] ${sidebarCollapsed ? '' : 'lg:pl-64'}`}>
            {navigating && (
                <div className={`no-print fixed inset-x-0 top-0 z-50 h-[3px] overflow-hidden md:left-[4.5rem] ${sidebarCollapsed ? '' : 'lg:left-64'}`} aria-hidden>
                    <div className="h-full w-1/4 animate-nav-progress rounded-full bg-primary" />
                </div>
            )}

            {tabletExpanded && (
                <button type="button" tabIndex={-1} aria-label="Tutup sidebar" onClick={() => { closeTabletSidebar(); toggleRef.current?.focus() }} className="no-print fixed inset-0 z-20 hidden bg-overlay md:block lg:hidden" />
            )}
            <aside ref={sidebarRef} className={`no-print fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-divider bg-surface transition-[width] duration-200 motion-reduce:transition-none md:flex ${tabletExpanded ? 'w-64' : 'w-[4.5rem]'} ${sidebarCollapsed ? 'lg:w-[4.5rem]' : 'lg:w-64'}`} aria-label="Sidebar aplikasi" aria-modal={tabletExpanded && !isDesktop ? 'true' : undefined} role={tabletExpanded && !isDesktop ? 'dialog' : undefined}>
                <div className={`flex min-h-20 items-center border-b border-divider px-3 ${rail ? 'flex-col justify-center pb-2 pt-5' : 'justify-between'}`}>
                    <Link to="/kasir" onClick={closeTabletSidebar} aria-label="Warung POS — Kasir" title="Warung POS" className="flex min-h-11 items-center gap-3 text-ink">
                    <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary text-on-primary">
                        <IconBuildingStore size={22} stroke={2} />
                    </span>
                    <span className={`font-display text-lg font-black ${labelClass}`}>Warung POS</span>
                    </Link>
                    <button ref={toggleRef} type="button" onClick={toggleSidebar} aria-expanded={sidebarWide} aria-label={sidebarWide ? 'Perkecil sidebar' : 'Perlebar sidebar'} title={sidebarWide ? 'Perkecil sidebar' : 'Perlebar sidebar'} className="grid size-11 shrink-0 place-items-center rounded-md text-body hover:bg-surface-muted">
                        {sidebarWide ? <IconLayoutSidebarLeftCollapse size={20} /> : <IconLayoutSidebarLeftExpand size={20} />}
                    </button>
                </div>

                <div className={`min-h-0 flex-1 overflow-y-auto py-4 ${rail ? 'px-2' : 'px-3'}`}>
                    {tenant.context && (
                        <div className={`mb-5 rounded-md bg-surface-muted px-3 py-2 ${blockClass}`}>
                            {tenant.memberships.length > 1 ? (
                                <select
                                    value={tenant.context.tenantId}
                                    onChange={(event) => void tenant.switchTenant(event.target.value)}
                                    aria-label="Pilih toko"
                                    data-testid="tenant-switcher"
                                    className="min-h-11 w-full rounded-md border border-slate-300 bg-surface px-2 text-sm font-semibold text-ink"
                                >
                                    {tenant.memberships.map((membership) => (
                                        <option key={membership.tenantId} value={membership.tenantId}>{membership.tenantName} · {membership.role}</option>
                                    ))}
                                </select>
                            ) : <p className="truncate text-sm font-bold text-ink">{tenant.context.tenantName}</p>}
                            <p className="mt-1 text-xs capitalize text-mute">{tenant.context.role}</p>
                        </div>
                    )}
                    <nav aria-label="Navigasi utama" className="space-y-1" onClick={closeTabletSidebar}>
                        {NAV_ITEMS.map(({ to, label, Icon }) => (
                            <Link
                                key={to}
                                to={to}
                                aria-label={label}
                                aria-current={isActive(pathname, to) ? 'page' : undefined}
                                title={label}
                                className={`flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition-colors ${rail ? 'justify-center' : 'justify-start'} ${isActive(pathname, to) ? 'bg-ink text-white' : 'text-body hover:bg-surface-muted'}`}
                            >
                                <Icon size={20} stroke={2} className="shrink-0" />
                                <span className={labelClass}>{label}</span>
                            </Link>
                        ))}
                        <Link
                            to="/keranjang"
                            aria-label={`Keranjang, ${count} produk`}
                            aria-current={isActive(pathname, '/keranjang') || isActive(pathname, '/checkout') ? 'page' : undefined}
                            title="Keranjang"
                            onClick={closeTabletSidebar}
                            className={`flex min-h-11 items-center gap-3 rounded-md bg-primary px-3 text-sm font-bold text-on-primary hover:bg-primary-hover ${rail ? 'justify-center' : 'justify-start'}`}
                        >
                            <span className="relative grid size-5 shrink-0 place-items-center">
                                <IconShoppingCart size={20} stroke={2} />
                                {rail && <span className="tabular absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-ink px-0.5 text-[10px] text-white" aria-hidden="true">{count > 99 ? '99+' : count}</span>}
                            </span>
                            <span className={`flex-1 ${labelClass}`}>Keranjang</span>
                            {!rail && <span className="tabular grid h-6 min-w-6 place-items-center rounded-full bg-on-primary/10 px-1 text-xs" aria-hidden="true">{count > 99 ? '99+' : count}</span>}
                        </Link>
                    </nav>
                    <div className="my-5 border-t border-divider" />
                    <p className={`mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-mute ${blockClass}`}>Lainnya</p>
                    <nav aria-label="Navigasi lainnya" className="space-y-1" onClick={closeTabletSidebar}>
                        {moreItems.map(({ to, label, Icon }) => (
                            <Link
                                key={to}
                                to={to}
                                aria-label={label}
                                aria-current={isActive(pathname, to) ? 'page' : undefined}
                                title={label}
                                className={`flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors ${rail ? 'justify-center' : 'justify-start'} ${isActive(pathname, to) ? 'bg-ink text-white' : 'text-body hover:bg-surface-muted'}`}
                            >
                                <Icon size={20} stroke={2} className="shrink-0" />
                                <span className={labelClass}>{label}</span>
                            </Link>
                        ))}
                    </nav>
                </div>

                {session && (
                    <div className={`border-t border-divider ${rail ? 'p-2' : 'p-3'}`}>
                        <button
                            type="button"
                            onClick={() => { closeTabletSidebar(); setMenuOpen(true) }}
                            aria-haspopup="dialog"
                            aria-expanded={menuOpen}
                            aria-label={`Akun ${session.name}`}
                            title="Akun dan ganti toko"
                            data-testid="account-menu"
                            className={`flex min-h-11 w-full items-center gap-3 rounded-md px-2 text-left hover:bg-surface-muted ${rail ? 'justify-center' : 'justify-start'}`}
                        >
                            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-sm font-bold text-white">{session.name.slice(0, 1).toUpperCase()}</span>
                            <span className={`min-w-0 ${blockClass}`}>
                                <span className="block truncate text-sm font-semibold">{session.name}</span>
                                <span className="block truncate text-xs text-mute">{session.email}</span>
                            </span>
                        </button>
                        <div className={`mt-1 gap-1 ${tabletExpanded ? 'grid' : sidebarCollapsed ? 'hidden' : 'hidden lg:grid'}`}>
                            <button type="button" onClick={() => setGuideOpen(true)} className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm text-body hover:bg-surface-muted"><IconListCheck size={18} />Panduan Singkat</button>
                            <button type="button" onClick={signOut} data-testid="logout-button" className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm text-danger hover:bg-red-50"><IconLogout size={18} />Keluar</button>
                        </div>
                    </div>
                )}
            </aside>

            <main
                className="mx-auto w-full max-w-5xl flex-1 px-4 pb-20 pt-4 sm:px-6 sm:pt-6 md:pb-8 lg:px-8"
                data-route={pathname === '/panduan' ? 'guide' : undefined}
                inert={tabletExpanded && !isDesktop}
            >
                {children}
            </main>

            <nav aria-label="Navigasi utama" className="no-print safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-divider bg-surface md:hidden">
                <div className="mx-auto grid max-w-5xl grid-cols-4 gap-1 px-2 pt-1.5 sm:px-6">
                    {NAV_ITEMS.map(({ to, label, Icon }) => (
                        <Link
                            key={to}
                            to={to}
                            aria-current={isActive(pathname, to) ? 'page' : undefined}
                            aria-label={to === '/kasir' && count > 0 ? `Kasir, ${count} produk di keranjang` : label}
                            className="flex min-h-12 min-w-0 items-center justify-center text-[11px] font-semibold"
                        >
                            <span className={`inline-flex flex-col items-center justify-center gap-0.5 rounded-md px-3 py-1 transition-colors ${isActive(pathname, to) ? 'bg-primary text-on-primary' : 'text-mute'}`}>
                                <span className="relative inline-flex size-6 items-center justify-center">
                                    <Icon size={20} stroke={2} />
                                    {to === '/kasir' && count > 0 && <span className="tabular absolute -right-2 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-ink px-0.5 text-[9px] text-white" aria-hidden="true">{count > 99 ? '99+' : count}</span>}
                                </span>
                                <span className="truncate">{label}</span>
                            </span>
                        </Link>
                    ))}
                    <button
                        type="button"
                        onClick={() => setMenuOpen(true)}
                        aria-haspopup="dialog"
                        aria-expanded={menuOpen}
                        aria-label="Akun dan menu lainnya"
                        data-testid="account-menu-mobile"
                        className="flex min-h-12 min-w-0 items-center justify-center text-[11px] font-semibold"
                    >
                        <span className={`inline-flex flex-col items-center justify-center gap-0.5 rounded-md px-3 py-1 ${menuOpen ? 'bg-primary text-on-primary' : 'text-mute'}`}>
                            <span className="grid size-6 place-items-center"><IconUser size={20} stroke={2} /></span>
                            Akun
                        </span>
                    </button>
                </div>
            </nav>

            <footer className="no-print hidden border-t border-divider px-4 py-4 text-center text-xs text-mute sm:px-6 md:block lg:px-8">
                &copy; 2026. Crafted by ridwanmuh3
            </footer>

            {session && (
                <dialog
                    ref={dialogRef}
                    onClose={() => setMenuOpen(false)}
                    onClick={(event) => { if (event.target === event.currentTarget) setMenuOpen(false) }}
                    aria-label="Akun dan menu lainnya"
                    className="fixed inset-x-0 bottom-0 top-auto mx-auto mt-0 mb-0 hidden max-h-[85dvh] w-full max-w-none flex-col overflow-hidden rounded-t-2xl bg-surface p-0 text-ink shadow-level3 backdrop:bg-overlay open:flex md:inset-0 md:m-auto md:max-w-md md:rounded-2xl"
                >
                    <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-surface-deep md:hidden" aria-hidden />
                    <div className="relative flex shrink-0 items-start px-14 py-4 sm:px-4 sm:pr-16">
                        <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center sm:flex-row sm:gap-3 sm:text-left">
                            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink font-bold text-white">{session.name.slice(0, 1).toUpperCase()}</span>
                            <div className="min-w-0">
                                <p className="truncate font-semibold">{session.name}</p>
                                <p className="truncate text-sm text-mute">{session.email}</p>
                            </div>
                        </div>
                        <button type="button" onClick={() => setMenuOpen(false)} aria-label="Tutup menu akun" className="absolute right-3 top-3 min-h-11 rounded-md px-3 text-sm font-semibold text-body hover:bg-surface-muted">Tutup</button>
                    </div>
                    <div className="min-h-0 overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                    {tenant.context && (
                        <div className="my-4 rounded-md bg-surface-muted p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-mute">Toko · {tenant.context.role}</p>
                            {tenant.memberships.length > 1 ? (
                                <select
                                    value={tenant.context.tenantId}
                                    onChange={(event) => { void tenant.switchTenant(event.target.value); setMenuOpen(false) }}
                                    aria-label="Pilih toko"
                                    data-testid="tenant-switcher"
                                    className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-ink"
                                >
                                    {tenant.memberships.map((membership) => (
                                        <option key={membership.tenantId} value={membership.tenantId}>{membership.tenantName} · {membership.role}</option>
                                    ))}
                                </select>
                            ) : <p className="mt-1 truncate text-sm font-medium">{tenant.context.tenantName}</p>}
                        </div>
                    )}
                    <nav aria-label="Menu akun" className="grid gap-1">
                        <Link to="/keranjang" onClick={() => setMenuOpen(false)} className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium hover:bg-surface-muted"><IconShoppingCart size={19} />Keranjang ({count})</Link>
                        {moreItems.map(({ to, label, Icon }) => (
                            <Link
                                key={to}
                                to={to}
                                onClick={() => setMenuOpen(false)}
                                data-testid={to === '/anggota' ? 'account-members-link' : to === '/pengaturan' ? 'account-settings-link' : to === '/riwayat' ? 'account-history-link' : to === '/panduan' ? 'account-guide-link' : 'account-restore-link'}
                                className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium hover:bg-surface-muted"
                            ><Icon size={19} />{label}</Link>
                        ))}
                        <button type="button" onClick={() => { setMenuOpen(false); setGuideOpen(true) }} data-testid="account-quick-guide-link" className="flex min-h-11 items-center gap-3 rounded-md px-3 text-left text-sm font-medium hover:bg-surface-muted"><IconListCheck size={19} />Panduan Singkat</button>
                        <div className="my-1 border-t border-divider" />
                        <button type="button" onClick={signOut} className="flex min-h-11 items-center gap-3 rounded-md px-3 text-left text-sm font-medium text-danger hover:bg-red-50"><IconLogout size={19} />Keluar</button>
                    </nav>
                    </div>
                </dialog>
            )}

            {session && (
                <FirstRunGuide open={guideOpen} userId={session.id} onClose={() => setGuideOpen(false)} />
            )}
        </div>
    )
}
