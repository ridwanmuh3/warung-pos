import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  IconAlertCircle,
  IconBuildingStore,
  IconCheck,
  IconLock,
  IconMail,
  IconUser,
} from '@tabler/icons-react'
import { login, register } from '../lib/auth.session'
import { useSession } from '../lib/useSession'

type Mode = 'login' | 'register'

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 pl-10 text-sm text-slate-900 outline-none transition duration-150 ease-out focus:border-primary focus:shadow-[0_0_0_3px_rgb(22_51_0/0.15)]'

/** Fills the viewport and centres the card both horizontally and vertically. */
function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}

/**
 * Sign-in / sign-up screen.
 *
 * All fields are validated by the schemas in `lib/validation.ts` before they
 * reach `lib/auth.ts`; errors are surfaced per-form, never thrown.
 */
export function AuthScreen({
  initialMode,
  redirectTo,
}: {
  initialMode: Mode
  redirectTo?: string
}) {
  const navigate = useNavigate()
  const session = useSession()
  const [mode, setMode] = useState<Mode>(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  // Already signed in: show the account instead of a form.
  if (session) {
    return (
      <Shell>
      <div className="rounded-2xl border border-border-subtle bg-surface p-6 text-center shadow-sm">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand-100 text-brand-700">
          <IconCheck size={28} stroke={2.5} />
        </span>
        <h1 className="mt-3 text-xl font-bold text-slate-900">Sudah Masuk</h1>
        <p className="mt-1 text-sm text-slate-500">
          {session.name} · <span className="tabular">{session.email}</span>
        </p>
        <Link
          to="/"
          className="mt-5 inline-flex rounded-full border-2 border-primary bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition duration-150 ease-out hover:bg-primary-hover"
        >
          Buka Kasir
        </Link>
      </div>
      </Shell>
    )
  }

  async function submit() {
    setBusy(true)
    setErrors([])
    const result =
      mode === 'register'
        ? await register({ name, email, password, confirmPassword })
        : await login({ email, password })

    if (!result.ok) {
      setErrors(result.errors)
      setBusy(false)
      return
    }

    setPassword('')
    setConfirmPassword('')
    // Only same-origin, in-app paths are honoured: an attacker-supplied
    // absolute URL must not turn the login page into an open redirect.
    const target = redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '/'
    navigate({ to: target })
    setBusy(false)
  }

  return (
    <Shell>
    <div>
      <div className="mb-5 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary text-on-primary">
          <IconBuildingStore size={28} stroke={2} />
        </span>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">
          {mode === 'login' ? 'Masuk ke Warung POS' : 'Buat Akun Warung POS'}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {mode === 'login'
            ? 'Masuk untuk mulai melayani transaksi.'
            : 'Akun disimpan dengan aman di server.'}
        </p>
      </div>

      <div className="mb-4 flex rounded-2xl border border-border-subtle bg-surface p-1">
        {(['login', 'register'] as const).map((value) => (
          <button
            key={value}
            onClick={() => {
              setMode(value)
              setErrors([])
            }}
            aria-pressed={mode === value}
            data-testid={`auth-mode-${value}`}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              mode === value ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {value === 'login' ? 'Masuk' : 'Daftar'}
          </button>
        ))}
      </div>

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
        className="rounded-2xl border border-border-subtle bg-surface p-5 shadow-level1"
      >
        {errors.length > 0 && (
          <div
            role="alert"
            data-testid="auth-errors"
            className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <IconAlertCircle size={18} stroke={2} className="mt-0.5 shrink-0" />
            <ul className="space-y-0.5">
              {errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        )}

        {mode === 'register' && (
          <label htmlFor="auth-name" className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nama</span>
            <span className="relative mt-1 block">
              <IconUser size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="auth-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Budi"
                autoComplete="name"
                data-testid="auth-name"
                className={inputClass}
              />
            </span>
          </label>
        )}

        <label htmlFor="auth-email" className="mt-3 block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</span>
          <span className="relative mt-1 block">
            <IconMail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="kasir@warung.id"
              autoComplete="email"
              data-testid="auth-email"
              className={inputClass}
            />
          </span>
        </label>

        <label htmlFor="auth-password" className="mt-3 block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kata Sandi</span>
          <span className="relative mt-1 block">
            <IconLock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimal 8 karakter"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              data-testid="auth-password"
              className={inputClass}
            />
          </span>
        </label>

        {mode === 'register' && (
          <label htmlFor="auth-confirm" className="mt-3 block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Ulangi Kata Sandi
            </span>
            <span className="relative mt-1 block">
              <IconLock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="auth-confirm"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Ulangi kata sandi"
                autoComplete="new-password"
                data-testid="auth-confirm"
                className={inputClass}
              />
            </span>
          </label>
        )}

        <button
          type="submit"
          disabled={busy}
          data-testid="auth-submit"
          className="mt-5 w-full h-11 rounded-full border-2 border-primary bg-primary px-4 text-sm font-semibold text-on-primary transition duration-150 ease-out hover:bg-primary-hover active:scale-95 disabled:border-primary-muted disabled:bg-primary-muted disabled:text-mute"
        >
          {busy ? 'Memproses…' : mode === 'login' ? 'Masuk' : 'Daftar'}
        </button>

        <p className="mt-3 text-center text-xs text-mute">
          {mode === 'login' ? (
            <>
              Belum punya akun?{' '}
              <button
                type="button"
                onClick={() => setMode('register')}
                className="font-semibold text-brand-700 hover:underline"
              >
                Daftar
              </button>
            </>
          ) : (
            <>
              Sudah punya akun?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="font-semibold text-brand-700 hover:underline"
              >
                Masuk
              </button>
            </>
          )}
        </p>
      </form>

      <p className="mt-4 text-center text-xs text-mute">
        Kata sandi disimpan terenkripsi di server, bukan teks biasa.
      </p>
    </div>
    </Shell>
  )
}
