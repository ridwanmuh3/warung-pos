import { createFileRoute } from '@tanstack/react-router'
import { handleXenditCallback } from '~/lib/xendit-webhook.server'

/**
 * Server route: Xendit webhook.
 *
 * Public by design — Xendit cannot hold a session — so authentication is the
 * `x-callback-token` header, compared in constant time inside the handler.
 * The route only parses the raw body and maps the result: all state changes
 * happen in `handleXenditCallback`, where they are unit-tested.
 *
 * A transient database failure returns 500 so Xendit retries. Everything we
 * can definitely handle (duplicates, unknown references, mismatches) returns
 * 200 so it stops.
 */
export const Route = createFileRoute('/api/xendit/callback')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text()
        try {
          const result = await handleXenditCallback(
            request.headers.get('x-callback-token'),
            rawBody,
          )
          return Response.json(result.body, { status: result.status })
        } catch (cause) {
          console.error('Xendit callback failed', cause)
          return Response.json({ ok: false }, { status: 500 })
        }
      },
    },
  },
})
