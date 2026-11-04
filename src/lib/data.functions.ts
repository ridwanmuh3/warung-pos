/**
 * Typed data RPC facade.
 *
 * The feature slices now own their handlers:
 * - `features/checkout` — checkout
 * - `features/sales` — order history, receipts, void/refund/settlement
 * - `features/catalog` — products, stock, and images
 * - `features/shifts` — cash-drawer shifts
 *
 * Re-exported here so existing imports keep working until this facade is
 * deleted in the final cleanup phase.
 */

export { checkoutFn } from '../features/checkout/checkout.functions'

export {
  getOrderFn,
  listCreditOrdersFn,
  listOrdersFn,
  refundOrderFn,
  settleCreditOrderFn,
  voidOrderFn,
} from '../features/sales/sales.functions'
export type {
  RefundOrderResult,
  VoidOrderResult,
} from '../features/sales/sales.functions'

export {
  createProductFn,
  deleteProductFn,
  getImageBaseUrlFn,
  getImageUploadUrlFn,
  listProductsFn,
  listStockMovementsFn,
  restockProductFn,
  updateProductFn,
} from '../features/catalog/catalog.functions'

export {
  closeShiftFn,
  currentShiftFn,
  listDrawerOrdersFn,
  listShiftsFn,
  openShiftFn,
} from '../features/shifts/shifts.functions'
