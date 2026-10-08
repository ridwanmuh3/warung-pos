import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  useRouterState,
} from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { IconBuildingStore } from '@tabler/icons-react'
import { AppShell } from '~/components/AppShell'
import { AuthScreen } from '~/components/AuthScreen'
import { NotFoundPage } from '~/components/NotFoundPage'
import { Spinner } from '~/components/ui/Spinner'
import { useSession } from '~/lib/useSession'
import appCss from '~/index.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1.0, viewport-fit=cover' },
      { name: 'description', content: 'Warung POS - kasir sederhana untuk warung' },
      { title: 'Warung POS' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    ],
  }),
  component: RootComponent,
  shellComponent: RootDocument,
  notFoundComponent: NotFoundPage,
})

function RootComponent() {
  const session = useSession()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isAuthRoute = pathname === '/masuk'

  // The session resolves from the server cookie on first paint. Rendering the
  // sign-in screen before that resolves would flash it on every reload, so an
  // unresolved session shows a neutral shell instead.
  if (session === undefined) {
    return (
      <div className="grid min-h-full place-items-center p-6">
        <div className="flex flex-col items-center gap-4">
          <span className="grid size-14 place-items-center rounded-md bg-primary text-on-primary">
            <IconBuildingStore size={28} stroke={2} />
          </span>
          <Spinner size="lg" label="Memuat aplikasi…" />
        </div>
      </div>
    )
  }

  // Access gate: without a session every route renders the sign-in screen.
  // The decision is made from the server session, not a client flag.
  if (!session) {
    // Auth pages stand on their own: no header, tab bar, or footer while the
    // visitor has no session. `/masuk` still renders its own route component
    // so search params (`mode`, `redirect`) keep working.
    return isAuthRoute ? <Outlet /> : <AuthScreen initialMode="login" redirectTo={pathname} />
  }

  return (
    <AppShell session={session}>
      <Outlet />
    </AppShell>
  )
}

/** Full-document SSR shell: always server-rendered, wraps every route component. */
function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="id">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
