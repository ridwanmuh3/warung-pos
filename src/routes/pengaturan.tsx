import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { IconBook, IconBuildingStore, IconChevronRight, IconDeviceFloppy } from '@tabler/icons-react'
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

function SettingsPage() {
  const tenant = useTenant()
  const isOwner = tenant.context?.role === 'owner'

  /** Null means "not edited yet": the input follows the loaded tenant name. */
  const [nameDraft, setNameDraft] = useState<string | null>(null)
  const name = nameDraft ?? tenant.context?.tenantName ?? ''
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div>
      <PageHeader
        title="Pengaturan"
        subtitle="Identitas warung dan bantuan penggunaan"
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
              Nama ini tampil di menu akun dan di bagian atas struk.
            </p>

            <label htmlFor="tenant-name" className="mt-3 block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nama warung</span>
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
        </div>
      )}
    </div>
  )
}
