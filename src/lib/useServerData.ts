import { useCallback, useEffect, useState } from 'react'
import {
  currentShiftFn,
  listOrdersFn,
  listProductsFn,
  listShiftsFn,
  listStockMovementsFn,
} from './data.functions'
import type { Order, Product, Shift, StockMovement } from '../types'

/**
 * Server-backed data hooks.
 *
 * Each hook fetches through a server function and exposes an explicit `reload`,
 * so the UI controls when data is refreshed instead of polling. Errors are
 * surfaced as state, never thrown into render.
 */

export interface AsyncState<T> {
  data: T
  loading: boolean
  error: string | null
  reload: () => void
}

function useServerData<T>(load: () => Promise<T>, initial: T): AsyncState<T> {
  const [data, setData] = useState<T>(initial)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  const reload = useCallback(() => setNonce((value) => value + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    load()
      .then((result) => {
        if (cancelled) return
        setData(result)
        setError(null)
      })
      .catch((cause: unknown) => {
        if (cancelled) return
        setError(cause instanceof Error ? cause.message : 'Gagal memuat data')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // `load` is a stable server-function reference from the module scope.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce])

  return { data, loading, error, reload }
}

export function useProducts(): AsyncState<Product[]> {
  return useServerData(() => listProductsFn(), [])
}

export function useOrders(): AsyncState<Order[]> {
  return useServerData(() => listOrdersFn(), [])
}

export function useShifts(): AsyncState<Shift[]> {
  return useServerData(() => listShiftsFn(), [])
}

export function useStockMovements(): AsyncState<StockMovement[]> {
  return useServerData(() => listStockMovementsFn(), [])
}

export function useCurrentShift(): AsyncState<Shift | undefined> {
  return useServerData(() => currentShiftFn(), undefined)
}
