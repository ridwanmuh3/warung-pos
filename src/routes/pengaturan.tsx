import { useRef, useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  IconAlertTriangle,
  IconBook,
  IconBuildingStore,
  IconChevronRight,
  IconDeviceFloppy,
  IconTrash,
} from '@tabler/icons-react'
import { accountDeletionPreviewFn, deleteAccountFn } from '../lib/account.functions'
import { logout } from '../lib/auth.session'
import { updateTenantNameFn } from '../lib/tenant.functions'
import { useTenant } from '../lib/useTenant'
import { tenantName as tenantNameSchema } from '../lib/validation'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/ui/Button'
import { buttonStyles } from '../components/ui/buttonStyles'
import { SkeletonRows } from '../components/ui/Skeleton'

export const Route = createFileRoute('/pengaturan')({
  component: SettingsPage,
  // Identity and role come from the session cookie.
  ssr: false,
})

interface DeletionPreview {
  email: string
  tenantsToDelete: Array<{ name: string; products: number; orders: number }>
  tenantsToLeave: Array<{ name: string; role: string }>
  blockers: Array<{ name: string; members: number }>
}

function SettingsPage() {
  const tenant = useTenant()
  const navigate = useNavigate()
  const isOwner = tenant.context?.role === 'owner'

  /** Null means "not edited yet": the input follows the loaded tenant name. */
  const [nameDraft, setNameDraft] = useState<string | null>(null)
  const name = nameDraft ?? tenant.context?.tenantName ?? ''
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const deleteDialogRef = useRef<HTMLDialogElement>(null)
  const [preview, setPreview] = useState<DeletionPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function saveName() {
    const parsed = tenantNameSchema.safeParse(name)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Nama warung tidak valid')
      return
    }
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      await updateTenantNameFn({ data: { name: parsed.data } })
      tenant.reload()
      setMessage('Nama warung tersimpan. Struk berikutnya memakai nama ini.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal menyimpan nama warung')
    } finally {
      setSaving(false)
    }
  }

  async function openDeleteDialog() {
    setPreview(null)
    setPreviewError(null)
    setDeleteError(null)
    setDeletePassword('')
    setDeleteConfirmation('')
    if (!deleteDialogRef.current?.open) deleteDialogRef.current?.showModal()

    setPreviewLoading(true)
    try {
      setPreview(await accountDeletionPreviewFn())
    } catch (cause) {
      setPreviewError(cause instanceof Error ? cause.message : 'Gagal memuat data akun')
    } finally {
      setPreviewLoading(false)
    }
  }

  function closeDeleteDialog() {
    deleteDialogRef.current?.close()
  }

  async function confirmDelete() {
    setDeleteError(null)
    if (deletePassword === '') {
      setDeleteError('Masukkan kata sandi akun.')
      return
    }
    if (deleteConfirmation.trim().toUpperCase() !== 'HAPUS') {
      setDeleteError('Ketik HAPUS untuk melanjutkan.')
      return
    }

    setDeleting(true)
    try {
      await deleteAccountFn({
        data: { password: deletePassword, confirmation: deleteConfirmation },
      })
      deleteDialogRef.current?.close()
      // The server already cleared the cookie; this also resets the local
      // session cache and stops cart syncing before the sign-in screen appears.
      await logout()
      navigate({ to: '/masuk' })
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : 'Gagal menghapus akun')
    } finally {
      setDeleting(false)
    }
  }

  const blocked = (preview?.blockers.length ?? 0) > 0
  const canDelete =
    !deleting &&
    !blocked &&
    preview !== null &&
    deletePassword !== '' &&
    deleteConfirmation.trim().toUpperCase() === 'HAPUS'

  return (
    <div>
      <PageHeader
        title="Pengaturan"
        subtitle="Identitas warung, bantuan penggunaan, dan akun"
      />

      {tenant.loading ? (
        <SkeletonRows count={2} />
      ) : (
        <div className="space-y-4">
          <section className="rounded-2xl border border-border-subtle bg-surface p-4 shadow-level1 sm:p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <IconBuildingStore size={16} stroke={2} />
              Identitas Warung
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Nama ini tampil di menu Akun dan di bagian atas struk.
            </p>

            <label htmlFor="tenant-name" className="mt-3 block">
              <span className="text-xs font-semibold tracking-wide text-slate-500">Nama warung</span>
              <input
                id="tenant-name"
                value={name}
                onChange={(event) => {
                  setNameDraft(event.target.value)
                  setMessage(null)
                  setError(null)
                }}
                readOnly={!isOwner}
                placeholder="Warung Bu Siti"
                data-testid="tenant-name"
                className="mt-1 w-full rounded-sm border-2 border-border bg-surface px-3 py-2 text-sm text-ink outline-none transition duration-150 ease-out focus:border-primary focus:shadow-[0_0_0_3px_rgb(22_51_0/0.15)] read-only:bg-surface-muted read-only:text-slate-500"
              />
            </label>

            {isOwner ? (
              <Button
                size="sm"
                className="mt-3"
                busy={saving}
                disabled={name.trim() === '' || name === tenant.context?.tenantName}
                onClick={() => void saveName()}
                data-testid="tenant-save"
              >
                <IconDeviceFloppy size={16} />
                Simpan
              </Button>
            ) : (
              <p className="mt-2 text-xs text-slate-500">
                Hanya pemilik yang dapat mengubah nama warung.
              </p>
            )}

            {message && <p className="mt-2 text-xs font-medium text-brand-700">{message}</p>}
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          </section>

          <section className="rounded-2xl border border-border-subtle bg-surface p-4 shadow-level1 sm:p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <IconBook size={16} stroke={2} />
              Panduan Penggunaan
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Langkah singkat untuk kasir, pemilik, dan manajer. Bisa dibuka kapan saja atau dicetak
              untuk ditempel di dekat kasir.
            </p>
            <Link
              to="/panduan"
              data-testid="settings-guide-link"
              className={buttonStyles({ variant: 'secondary', size: 'md', className: 'mt-3' })}
            >
              Buka Panduan
              <IconChevronRight size={18} stroke={2} />
            </Link>
          </section>

          <section className="rounded-2xl border border-danger/30 bg-surface p-4 shadow-level1 sm:p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-danger">
              <IconAlertTriangle size={16} stroke={2} />
              Zona berbahaya
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Hapus akun beserta keanggotaan Anda. Warung yang Anda kelola sendiri beserta datanya
              ikut terhapus. Tindakan ini permanen — ekspor laporan yang masih dibutuhkan lebih
              dulu.
            </p>
            <Button
              variant="danger-outline"
              size="sm"
              className="mt-3"
              onClick={() => void openDeleteDialog()}
              data-testid="account-delete-open"
            >
              <IconTrash size={16} stroke={2} />
              Hapus akun
            </Button>
          </section>
        </div>
      )}

      <dialog
        ref={deleteDialogRef}
        aria-labelledby="delete-account-title"
        aria-describedby="delete-account-description"
        onCancel={(event) => {
          if (deleting) event.preventDefault()
        }}
        onClose={() => {
          // Native `dialog` only restores focus to the element that was focused
          // before opening. A pointer click may not focus the trigger (Safari
          // never does), so put focus back explicitly for keyboard users.
          document
            .querySelector<HTMLElement>('[data-testid="account-delete-open"]')
            ?.focus()
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Tab') return
          const dialog = event.currentTarget
          const focusables = Array.from(
            dialog.querySelectorAll<HTMLElement>(
              'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
            ),
          ).filter((element) => element.getClientRects().length > 0)
          if (focusables.length === 0) return
          const first = focusables[0]
          const last = focusables[focusables.length - 1]
          const active = document.activeElement
          if (event.shiftKey) {
            if (active === first || !dialog.contains(active)) {
              event.preventDefault()
              last.focus()
            }
          } else if (active === last || !dialog.contains(active)) {
            event.preventDefault()
            first.focus()
          }
        }}
        onClick={(event) => {
          if (!deleting && event.target === event.currentTarget) closeDeleteDialog()
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border-0 bg-surface p-0 text-ink shadow-level3 backdrop:bg-overlay"
      >
        <div className="flex items-start justify-between gap-4 border-b border-divider p-5">
          <div>
            <h2 id="delete-account-title" className="font-display text-xl font-black text-ink">
              Hapus akun?
            </h2>
            <p id="delete-account-description" className="mt-1 text-sm text-body">
              Tindakan ini permanen dan tidak bisa dibatalkan.
            </p>
          </div>
          <button
            type="button"
            onClick={closeDeleteDialog}
            className="min-h-11 rounded-md px-3 text-sm font-semibold text-body hover:bg-surface-muted"
          >
            Tutup
          </button>
        </div>

        <div aria-busy={previewLoading} className="max-h-[60dvh] space-y-4 overflow-y-auto p-5">
          {previewLoading && (
            <p role="status" className="text-sm text-mute">
              Memeriksa data akun…
            </p>
          )}

          {preview && !previewLoading && (
            <p role="status" className="sr-only">
              Pratinjau data akun dimuat. Periksa rincian sebelum melanjutkan.
            </p>
          )}

          {previewError && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {previewError}
            </p>
          )}

          {preview && (
            <>
              <p className="text-sm leading-relaxed text-body">
                Akun <strong className="text-ink">{preview.email}</strong> akan dihapus.
              </p>

              {blocked && (
                <div
                  role="alert"
                  className="rounded-xl border border-amber-500/40 bg-amber-50 p-3 text-sm leading-relaxed text-ink"
                >
                  <p className="font-semibold">Belum bisa dihapus.</p>
                  <p className="mt-1">
                    Anda masih pemilik terakhir di warung berikut, padahal warung itu punya anggota
                    lain. Angkat anggota lain menjadi owner terlebih dahulu agar warung tidak
                    kehilangan admin.
                  </p>
                  <ul className="mt-2 list-disc pl-5">
                    {preview.blockers.map((blocker) => (
                      <li key={blocker.name}>
                        {blocker.name} — {blocker.members} anggota
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!blocked && (
                <>
                  {preview.tenantsToDelete.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold tracking-wide text-danger">
                        Ikut terhapus
                      </p>
                      <ul className="mt-2 space-y-1.5 text-sm text-body">
                        {preview.tenantsToDelete.map((shop) => (
                          <li key={shop.name} className="rounded-xl bg-surface-muted px-3 py-2">
                            <span className="font-semibold text-ink">{shop.name}</span>
                            <span className="block text-xs text-mute">
                              {shop.products} produk · {shop.orders} transaksi
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {preview.tenantsToLeave.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold tracking-wide text-mute">
                        Tetap ada, keanggotaan dilepas
                      </p>
                      <ul className="mt-2 space-y-1 text-sm text-body">
                        {preview.tenantsToLeave.map((shop) => (
                          <li key={shop.name}>
                            {shop.name} <span className="text-mute">({shop.role})</span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-xs leading-relaxed text-mute">
                        Riwayat transaksi warung tersebut tetap tersimpan untuk laporan pemiliknya,
                        tanpa terhubung ke akun Anda.
                      </p>
                    </div>
                  )}

                  {preview.tenantsToDelete.length === 0 && preview.tenantsToLeave.length === 0 && (
                    <p className="text-sm text-body">Akun ini tidak terhubung ke warung mana pun.</p>
                  )}

                  <div className="space-y-3 rounded-xl border border-border-subtle p-3">
                    <label htmlFor="delete-account-password" className="block">
                      <span
                        id="delete-account-password-label"
                        className="text-xs font-semibold tracking-wide text-slate-500"
                      >
                        Kata sandi
                      </span>
                      <input
                        id="delete-account-password"
                        type="password"
                        autoComplete="current-password"
                        aria-labelledby="delete-account-password-label"
                        aria-required="true"
                        value={deletePassword}
                        onChange={(event) => {
                          setDeletePassword(event.target.value)
                          setDeleteError(null)
                        }}
                        data-testid="account-delete-password"
                        className="mt-1 w-full rounded-sm border-2 border-border bg-surface px-3 py-2 text-sm text-ink outline-none transition duration-150 ease-out focus:border-primary focus:shadow-[0_0_0_3px_rgb(22_51_0/0.15)]"
                      />
                    </label>
                    <label htmlFor="delete-account-confirmation" className="block">
                      <span
                        id="delete-account-confirmation-label"
                        className="text-xs font-semibold tracking-wide text-slate-500"
                      >
                        Ketik HAPUS untuk konfirmasi
                      </span>
                      <input
                        id="delete-account-confirmation"
                        aria-labelledby="delete-account-confirmation-label"
                        aria-required="true"
                        value={deleteConfirmation}
                        onChange={(event) => {
                          setDeleteConfirmation(event.target.value)
                          setDeleteError(null)
                        }}
                        placeholder="HAPUS"
                        autoComplete="off"
                        data-testid="account-delete-confirm"
                        className="mt-1 w-full rounded-sm border-2 border-border bg-surface px-3 py-2 text-sm text-ink outline-none transition duration-150 ease-out focus:border-primary focus:shadow-[0_0_0_3px_rgb(22_51_0/0.15)]"
                      />
                    </label>
                  </div>

                  {deleteError && (
                    <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                      {deleteError}
                    </p>
                  )}

                  <p id="delete-account-hint" className="text-xs leading-relaxed text-mute">
                    Tombol hapus aktif setelah kata sandi diisi dan HAPUS diketik.
                  </p>

                  {deleting && (
                    <p role="status" className="sr-only">
                      Menghapus akun…
                    </p>
                  )}

                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button variant="secondary" size="sm" onClick={closeDeleteDialog} disabled={deleting}>
                      Batal
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      busy={deleting}
                      disabled={!canDelete}
                      aria-describedby="delete-account-hint"
                      onClick={() => void confirmDelete()}
                      data-testid="account-delete-submit"
                    >
                      <IconTrash size={16} stroke={2} />
                      Hapus akun permanen
                    </Button>
                  </div>
                </>
              )}

              {blocked && (
                <div className="flex justify-end">
                  <Button variant="secondary" size="sm" onClick={closeDeleteDialog}>
                    Tutup
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </dialog>
    </div>
  )
}
