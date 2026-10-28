export function isActive(pathname: string, to: string) {
    return to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`)
}
