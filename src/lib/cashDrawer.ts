/**
 * The cash-drawer rule now lives in `domain/shifts/drawer.ts`; re-exported
 * here so existing imports keep working until this facade is deleted.
 */
export { expectedDrawerCash } from '../domain/shifts/drawer'
export type { CashOrderLike } from '../domain/shifts/drawer'
