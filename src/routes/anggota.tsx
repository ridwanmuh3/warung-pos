import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { IconUserPlus, IconUsers } from '@tabler/icons-react'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { Button } from '../components/ui/Button'
import { SkeletonRows } from '../components/ui/Skeleton'
import {
  inviteMemberFn,
  listMembersFn,
  updateMemberRoleFn,
} from '../lib/tenant.functions'
import type { MemberRow, Role } from '../lib/tenant.server'

const ROLE_LABELS: Record<Role, string> = {
  owner: 'Pemilik',
  manager: 'Manajer',
  cashier: 'Kasir',
}

const ROLES: Role[] = ['owner', 'manager', 'cashier']

export const Route = createFileRoute('/anggota')({
  component: MembersPage,
  // Reads live membership data; the server rejects non-owners.
  ssr: false,
})

function MembersPage() {
  const [members, setMembers] = useState<MemberRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>('cashier')
  const [busy, setBusy] = useState(false)

  function reload() {
    listMembersFn()
      .then((rows) => {
        setMembers(rows)
        setError(null)
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'Gagal memuat anggota')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reload()
  }, [])

  async function invite() {
    setBusy(true)
    try {
      await inviteMemberFn({ data: { email, role: inviteRole } })
      setEmail('')
      reload()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal mengundang anggota')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader title="Anggota Toko" subtitle="Kelola siapa yang boleh mengakses toko ini" />

      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="mb-4 rounded-2xl border border-border-subtle bg-surface p-4 shadow-level1 sm:p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <IconUserPlus size={16} stroke={2} />
          Undang Anggota
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Anggota harus sudah punya akun. Masukkan email yang terdaftar.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label htmlFor="member-email" className="min-w-48 flex-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</span>
            <input
              id="member-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="kasir@warung.id"
              data-testid="member-email"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition duration-150 ease-out focus:border-primary focus:shadow-[0_0_0_3px_rgb(22_51_0/0.15)]"
            />
          </label>
          <label htmlFor="member-role">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Peran</span>
            <select
              id="member-role"
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value as Role)}
              data-testid="member-role"
              className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </label>
          <Button
            onClick={() => void invite()}
            busy={busy}
            disabled={email.trim() === ''}
            data-testid="member-invite"
            size="sm"
          >
            Undang
          </Button>
        </div>
      </section>

      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <IconUsers size={16} stroke={2} />
        Daftar Anggota
      </h2>

      {loading ? (
        <SkeletonRows count={4} />
      ) : members.length === 0 ? (
        <EmptyState emoji="👥" title="Belum ada anggota lain" description="Undang rekan kerja lewat form di atas." />
      ) : (
        <ul className="space-y-2">
          {members.map((member) => (
            <li
              key={member.membershipId}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-border-subtle bg-surface p-3 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{member.name}</p>
                <p className="truncate text-xs text-slate-500">{member.email}</p>
              </div>
              <select
                value={member.role}
                onChange={(event) => {
                  void updateMemberRoleFn({
                    data: { membershipId: member.membershipId, role: event.target.value as Role },
                  }).then(reload)
                }}
                aria-label={`Peran ${member.name}`}
                data-testid={`member-role-${member.userId}`}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-brand-500"
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
