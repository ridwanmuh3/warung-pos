/**
 * Server-side persistence facade.
 *
 * The implementation is split by concern into `data/*.server.ts`; this module
 * re-exports the whole surface so existing imports keep working. Every query
 * takes a `tenantId` and filters by it (see scripts/check-tenant-scoping.mjs).
 */
export * from './data/products.server'
export * from './data/stock.server'
export * from './data/orders.server'
export * from './data/shifts.server'
export * from './data/carts.server'
export * from './data/import.server'
export { ORDER_SEQUENCE_KEY } from './data/mappers.server'
