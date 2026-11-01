import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { legacyRedirect } from '../lib/legacy-routes'

/**
 * Catches every path the English route tree does not own. A known legacy URL
 * gets a permanent redirect; anything else is a genuine 404.
 */
export const Route = createFileRoute('/$')({
  beforeLoad: ({ location }) => {
    const target = legacyRedirect(location.pathname, location.searchStr)
    if (target !== null) throw redirect({ href: target, statusCode: 301, reloadDocument: true })
    throw notFound()
  },
})
