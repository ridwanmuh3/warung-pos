import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  useRouterState,
} from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { AppShell } from '~/components/AppShell'
import { AuthScreen } from '~/components/AuthScreen'
import { NotFoundPage } from '~/components/NotFoundPage'
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

  // Access gate: without a session every route renders the sign-in screen.
  // This is a UI gate for shift staff, not a security boundary — client-side
  // auth cannot be one, which is why the real swap to a server is mechanical.
  if (!session && !isAuthRoute) {
    return <AuthScreen initialMode="login" redirectTo={pathname} />
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
