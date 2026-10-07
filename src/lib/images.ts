import { useSyncExternalStore } from 'react'
import { getImageBaseUrlFn } from './data.functions'

/**
 * Client-side product-image URLs.
 *
 * The public base URL is fetched once from the server and cached module-wide;
 * image `src` values are then plain string joins. Until the base resolves the
 * placeholder renders, so nothing blocks first paint.
 */

let base: string | null = null
let inflight: Promise<string> | null = null
const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getBaseSnapshot(): string | null {
  if (base === null && inflight === null && typeof window !== 'undefined') {
    inflight = getImageBaseUrlFn()
      .then((value) => {
        base = value.replace(/\/+$/, '')
        inflight = null
        listeners.forEach((listener) => listener())
        return base
      })
      .catch(() => {
        // Keep the placeholder; retry on the next mount.
        inflight = null
        return ''
      })
  }
  return base
}

/** Public URL for an image key, or null while the base URL is resolving. */
export function useImageUrl(key: string | null | undefined): string | null {
  const resolved = useSyncExternalStore(subscribe, getBaseSnapshot, () => null)
  if (!key) return null
  return resolved ? `${resolved}/${key}` : null
}
