import { createFileRoute } from '@tanstack/react-router'
import { robotsTxt } from '../lib/seo'

/**
 * Server route so the sitemap URL is absolute even before a custom domain is
 * configured. Claims no filesystem path.
 */
export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const origin = new URL(request.url).origin
        return new Response(robotsTxt(origin), {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
          },
        })
      },
    },
  },
})
