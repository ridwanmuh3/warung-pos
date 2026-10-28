import { createFileRoute } from '@tanstack/react-router'
import { sitemapXml } from '../lib/seo'
import { SITE } from '../data/site'

/** Only public pages: the app routes require a session and are not content. */
export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const origin = new URL(request.url).origin
        return new Response(sitemapXml(origin, SITE.updatedAt), {
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
          },
        })
      },
    },
  },
})
