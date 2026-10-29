export function isActive(pathname: string, to: string) {
    return pathname === to || pathname.startsWith(`${to}/`)
}
