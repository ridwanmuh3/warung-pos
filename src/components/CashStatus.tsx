/**
 * Cash-drawer status now lives in `features/shifts/CashStatus.tsx`.
 *
 * Kept as a re-export because `features/checkout` may not import another
 * feature directly; this legacy module is the allowed seam until the final
 * cleanup phase moves the checkout reminder into its own slice.
 */
export { CashStatus } from '../features/shifts/CashStatus'
