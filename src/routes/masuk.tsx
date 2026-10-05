import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { AuthScreen } from '../components/AuthScreen'

export const Route = createFileRoute('/masuk')({
  component: LoginPage,
  validateSearch: z.object({
    /** Where to continue after a successful sign-in. */
    redirect: z.string().optional().catch(undefined),
    mode: z.enum(['login', 'register']).optional().catch(undefined),
  }),
  // Accounts live in localStorage (no backend), so the form is client-rendered.
  ssr: false,
})

function LoginPage() {
  const { mode, redirect } = Route.useSearch()
  return <AuthScreen initialMode={mode ?? 'login'} redirectTo={redirect} />
}
