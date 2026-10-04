import { useSyncExternalStore } from 'react'
import { getOrdersSnapshot, subscribeToOrders } from './orders'
import type { Order } from '../types'

/** Orders stored on this device, newest first. Re-renders when a new order is placed. */
export function useOrders(): Order[] {
  return useSyncExternalStore(subscribeToOrders, getOrdersSnapshot, getOrdersSnapshot)
}
