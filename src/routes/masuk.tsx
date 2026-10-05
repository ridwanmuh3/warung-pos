import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { AuthScreen } from '../components/AuthScreen'
import { userCountFn } from '../lib/auth.functions'

export const Route = createFileRoute('/masuk')({
  component: LoginPage,
  validateSearch: z.object({
    /** Where to continue after a successful sign-in. */
    redirect: z.string().optional().catch(undefined),
    mode: z.enum(['login', 'register']).optional().catch(undefined),
  }),
  // The account count comes from the database, so a fresh install can be sent
  // straight to registration during SSR.
  loader: async () => {
    const { count } = await userCountFn()
    return { registeredUsers: count }
  },
})

function LoginPage() {
  const { mode, redirect } = Route.useSearch()
  const { registeredUsers } = Route.useLoaderData()
  return (
    <AuthScreen
      initialMode={mode ?? (registeredUsers === 0 ? 'register' : 'login')}
      redirectTo={redirect}
    />
  )
}
