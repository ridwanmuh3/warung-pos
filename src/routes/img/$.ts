import { createFileRoute } from '@tanstack/react-router'
import { readImageObject } from '~/lib/r2.server'

/**
 * Same-origin image proxy: `/img/<key>`.
 *
 * The browser cannot rely on the bucket's public `*.r2.dev` domain — some shop
 * networks (including the ISP this app is deployed behind) block it, which left
 * every product on the placeholder. Instead the browser reads images from the
 * app's own origin and the server fetches the object with its R2 credentials.
 *
 * The key is validated in `readImageObject`; the bucket stays private to reads
 * without credentials, and the proxy refuses anything the app did not store.
 */
export const Route = createFileRoute('/img/$')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const object = await readImageObject(params._splat ?? '')
        if (!object) return new Response('Not found', { status: 404 })

        return new Response(object.body, {
          headers: {
            'Content-Type': object.contentType,
            'Content-Length': String(object.contentLength),
            // Keys are immutable — uploads are uuid-named and seed files are
            // fixed — so the browser can cache a returned image indefinitely.
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        })
      },
    },
  },
})
