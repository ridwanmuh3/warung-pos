import { createCsrfMiddleware, createMiddleware, createStart } from '@tanstack/react-start'
import { securityHeaders } from './lib/security-headers'

/**
 * Creating `src/start.ts` replaces TanStack Start's implicit CSRF middleware,
 * so the explicit middleware below is required. It protects every server
 * function against cross-site requests; safe GET handlers stay usable.
 */
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === 'serverFn',
})

const securityMiddleware = createMiddleware().server(async ({ request, pathname, handlerType, next }) => {
  const result = await next()
  const response = result.response

  for (const [name, value] of Object.entries(
    securityHeaders({ production: process.env.NODE_ENV === 'production' }),
  )) {
    // Keep route-specific hardening (notably the `/img` proxy's strict CSP).
    if (!response.headers.has(name)) response.headers.set(name, value)
  }

  if (handlerType === 'serverFn') {
    // RPC responses can contain tenant data and must never sit in a shared or
    // browser cache.
    response.headers.set('Cache-Control', 'no-store')
  } else if (
    handlerType === 'router' &&
    !pathname.startsWith('/img/') &&
    (request.headers.get('accept') ?? '').includes('text/html')
  ) {
    // SSR HTML is per-session; don't let a shared cache reuse it.
    if (!response.headers.has('Cache-Control')) {
      response.headers.set('Cache-Control', 'private, no-cache')
    }
  }

  return result
})

export const startInstance = createStart(() => ({
  requestMiddleware: [securityMiddleware, csrfMiddleware],
}))
