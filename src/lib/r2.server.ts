import { createServerOnlyFn } from '@tanstack/react-start'
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { r2Env, r2PublicUrl } from './env.server'

/**
 * Cloudflare R2 access for product images.
 *
 * Uploads are presigned PUTs straight from the browser to R2 (the server only
 * signs, never proxies the upload). Reads go through this app's own `/img`
 * proxy by default — a public `*.r2.dev` domain is blocked on some shop
 * networks — with an optional custom domain via `CLOUDFLARE_R2_PUBLIC_URL`.
 * The S3 endpoint is used for signing and object access.
 */

export const IMAGE_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export type ImageContentType = (typeof IMAGE_CONTENT_TYPES)[number]

const EXT_BY_TYPE: Record<ImageContentType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

let client: S3Client | undefined

/**
 * The S3 API endpoint without a bucket path.
 *
 * `CLOUDFLARE_S3_URI` is often copied from the dashboard as
 * `https://<account>.r2.cloudflarestorage.com/<bucket>`. The SDK already
 * addresses the bucket (virtual-hosted style), so a trailing `/<bucket>`
 * would nest every object one level deeper — keys like
 * `<bucket>/products/...` that the public URL can never resolve.
 */
function s3Endpoint(uri: string, bucket: string): string {
  const trimmed = uri.replace(/\/+$/, '')
  return trimmed.endsWith(`/${bucket}`) ? trimmed.slice(0, -bucket.length - 1) : trimmed
}

/** Exposed for the unit test; not part of the runtime API. */
export const __test = { s3Endpoint, isServableKey }

const getClient = createServerOnlyFn((): S3Client => {
  if (client) return client
  const env = r2Env()
  client = new S3Client({
    region: 'auto',
    endpoint: s3Endpoint(env.endpoint, env.bucket),
    credentials: { accessKeyId: env.accessKeyId, secretAccessKey: env.secretAccessKey },
    // AWS SDK v3 adds a CRC32-of-empty-body to presigned PUTs by default. R2
    // ignores it, but it makes the URL misleading; sign only what R2 requires.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  })
  return client
})

/**
 * Base URL the browser prefixes onto an image key.
 *
 * Defaults to this app's `/img` proxy (see `src/routes/img/$.ts`) so images
 * always load from the app's own origin. Set `CLOUDFLARE_R2_PUBLIC_URL` to a
 * custom domain on the bucket to read straight from a CDN instead.
 */
export const imageBaseUrl = createServerOnlyFn((): string => r2PublicUrl() ?? '/img')

/**
 * A byte-for-byte image returned by {@link readImageObject}. `body` is backed
 * by a plain `ArrayBuffer` so it can be handed straight to `new Response(...)`.
 */
export interface ImageObject {
  body: Uint8Array<ArrayBuffer>
  contentType: string
  contentLength: number
}

/**
 * Key prefixes the app creates and is therefore willing to serve back.
 * Anything else (foreign prefixes, traversal) is refused, so the proxy cannot
 * be pointed at arbitrary objects in the bucket.
 */
function isServableKey(key: string): boolean {
  if (key === '' || key.startsWith('/') || key.includes('..')) return false
  return key.startsWith('seed/') || key.startsWith('products/')
}

/**
 * Reads a single image object for the same-origin proxy. Returns `null` when
 * the key is not one the app stores, or the object is missing / not an image.
 */
export const readImageObject = createServerOnlyFn(async (key: string): Promise<ImageObject | null> => {
  if (!isServableKey(key)) return null
  const env = r2Env()
  try {
    const object = await getClient().send(new GetObjectCommand({ Bucket: env.bucket, Key: key }))
    const contentType = object.ContentType ?? ''
    if (!contentType.startsWith('image/') || !object.Body) return null
    // Copy into an ArrayBuffer-backed view; the SDK's stream type is
    // `Uint8Array<ArrayBufferLike>`, which `Response` does not accept.
    const body = new Uint8Array(await object.Body.transformToByteArray())
    return { body, contentType, contentLength: object.ContentLength ?? body.byteLength }
  } catch {
    return null
  }
})

/**
 * Generates a tenant-scoped object key and a short-lived presigned PUT URL.
 * The caller must send the exact same Content-Type the URL was signed with.
 */
export const createUploadTarget = createServerOnlyFn(
  async (tenantId: string, contentType: ImageContentType): Promise<{ key: string; uploadUrl: string }> => {
    const env = r2Env()
    const key = `products/${tenantId}/${crypto.randomUUID()}.${EXT_BY_TYPE[contentType]}`
    const uploadUrl = await getSignedUrl(
      getClient(),
      new PutObjectCommand({ Bucket: env.bucket, Key: key, ContentType: contentType }),
      { expiresIn: 300 },
    )
    return { key, uploadUrl }
  },
)

/** True when the key exists in the bucket and holds an image. */
export const objectExists = createServerOnlyFn(async (key: string): Promise<boolean> => {
  const env = r2Env()
  try {
    const head = await getClient().send(new HeadObjectCommand({ Bucket: env.bucket, Key: key }))
    return (head.ContentType ?? '').startsWith('image/')
  } catch {
    return false
  }
})

export const deleteObject = createServerOnlyFn(async (key: string): Promise<void> => {
  const env = r2Env()
  try {
    await getClient().send(new DeleteObjectCommand({ Bucket: env.bucket, Key: key }))
  } catch {
    // Already gone: deletion is idempotent.
  }
})
