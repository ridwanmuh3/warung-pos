import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

const routerOptions = {
  routeTree,
  scrollRestoration: true,
  defaultPreload: 'intent',
} as const

/**
 * The application router type. TanStack Start calls `getRouter()` per request,
 * so the contract is published as a named type derived from a representative
 * instance instead of leaking the factory's inferred return type to consumers.
 */
export type AppRouter = typeof appRouterType

const appRouterType = createRouter(routerOptions)

export function getRouter(): AppRouter {
  return createRouter(routerOptions)
}

declare module '@tanstack/react-router' {
  interface Register {
    router: AppRouter
  }
}
