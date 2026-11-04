import { createServerOnlyFn } from '@tanstack/react-start'
import { deleteObject, objectExists } from '~/lib/r2.server'
import { imageKeyOwner, isTenantImageKey } from './images'

/**
 * Server-side image ownership checks.
 *
 * The policy itself lives in `./images`; this module only talks to R2.
 */

/**
 * Image keys the server will store: null, a shared `seed/` key, or a verified
 * upload owned by this tenant. Any other key is rejected so a crafted request
 * cannot point a product at another tenant's object.
 */
export const verifyImageKey = createServerOnlyFn(
  async (tenantId: string, key: string | null): Promise<string | null> => {
    const owner = imageKeyOwner(tenantId, key)
    if (owner === 'none' || owner === 'seed') return key
    if (owner === 'tenant' && key !== null && (await objectExists(key))) return key
    throw new Error('Gambar tidak ditemukan di penyimpanan; unggah ulang')
  },
)

/** Deletes an upload, but never a seed key or another tenant's object. */
export const deleteTenantImage = createServerOnlyFn(
  async (tenantId: string, key: string | null): Promise<void> => {
    if (key !== null && isTenantImageKey(tenantId, key)) await deleteObject(key)
  },
)

/** Cleanup after an edit: only the replaced upload, once the new key is stored. */
export const deleteReplacedImage = createServerOnlyFn(
  async (tenantId: string, previousKey: string | null, nextKey: string | null): Promise<void> => {
    if (previousKey !== null && previousKey !== nextKey) {
      await deleteTenantImage(tenantId, previousKey)
    }
  },
)
