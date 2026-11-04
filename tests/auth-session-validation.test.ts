import { expect, it, vi } from 'vitest'
import { AppError } from '../src/shared/lib/app-error'

vi.mock('../src/lib/auth.functions', () => ({
  loginFn: vi.fn(() => { throw new Error('Server tidak boleh dipanggil untuk email tidak valid') }),
  registerFn: vi.fn(() => { throw new Error('Server tidak boleh dipanggil untuk email tidak valid') }),
}))

import { loginFn } from '../src/lib/auth.functions'
import { login, register } from '../src/lib/auth.session'

it('menampilkan kesalahan email login tanpa menolak promise', async () => {
  await expect(login({ email: 'tidak-valid', password: 'password123' })).resolves.toEqual({
    ok: false,
    errors: ['Format email tidak valid'],
  })
})

it('menampilkan kesalahan email registrasi tanpa menolak promise', async () => {
  await expect(register({ name: 'Budi', email: 'tidak-valid', password: 'password123', confirmPassword: 'password123' })).resolves.toEqual({
    ok: false,
    errors: ['Format email tidak valid'],
  })
})

it('menampilkan AppError server dalam form Masuk, bukan promise rejection', async () => {
  vi.mocked(loginFn).mockRejectedValueOnce(new AppError('validation', 'Format email tidak valid'))
  await expect(login({ email: 'kasir@warung.id', password: 'password123' })).resolves.toEqual({
    ok: false,
    errors: ['Format email tidak valid'],
  })
})
