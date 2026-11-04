/**
 * Compatibility re-export for the sales pricing domain.
 *
 * The implementation now lives in `src/domain/sales/pricing.ts`. Existing
 * imports keep working during the migration; Phase 10 deletes this facade.
 */
export {
  discountValue,
  itemsCount,
  itemsTotal,
  lineSubtotal,
  marginPercent,
  priceCart,
} from '../domain/sales/pricing'
export type {
  CartPricing,
  CatalogProduct,
  DiscountInput,
  PriceCartInput,
} from '../domain/sales/pricing'
