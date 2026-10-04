import { useSyncExternalStore } from 'react'
import { getProductsSnapshot, subscribeToProducts } from './products'

/** Editable product catalog stored on this device. Re-renders on any change. */
export function useProducts() {
  return useSyncExternalStore(subscribeToProducts, getProductsSnapshot, getProductsSnapshot)
}