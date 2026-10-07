import { createServerOnlyFn } from '@tanstack/react-start'
import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { r2Env } from './env.server'

/**
 * Cloudflare R2 access for product images.
 *
 * Uploads are presigned PUTs straight from the browser to R2 (the server only
 * signs, never proxies bytes). Reads go through the public dev URL; the S3
 * endpoint is used for signing and object management only.
 */

export const IMAGE_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export type ImageContentType = (typeof IMAGE_CONTENT_TYPES)[number]

const EXT_BY_TYPE: Record<ImageContentType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

let client: S3Client | undefined

const getClient = createServerOnlyFn((): S3Client => {
  if (client) return client
  const env = r2Env()
  client = new S3Client({
    region: 'auto',
    endpoint: env.endpoint,
    credentials: { accessKeyId: env.accessKeyId, secretAccessKey: env.secretAccessKey },
  })
  return client
})

/** Public URL for a stored image key. */
export const imageUrl = createServerOnlyFn((key: string): string =>
  `${r2Env().publicUrl.replace(/\/+$/, '')}/${key}`,
)

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
