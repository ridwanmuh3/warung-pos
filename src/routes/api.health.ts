import { createFileRoute } from '@tanstack/react-router'

/**
 * Server route: proves the deployment runtime is a real Node/HTTP server and
 * gives operators a liveness probe. Not a backend feature — no persistence.
 */
export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({
          status: 'ok',
          runtime: typeof process !== 'undefined' ? process.release?.name ?? 'node' : 'edge',
          time: new Date().toISOString(),
        })
      },
    },
  },
})
