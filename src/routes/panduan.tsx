import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { IconAlertTriangle, IconPrinter } from '@tabler/icons-react'
import { KASIR_STEPS, OWNER_STEPS, ROLE_ROWS, TROUBLESHOOTING } from '../data/guide'
import { useTenant } from '../lib/useTenant'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/ui/Button'
import { SkeletonRows } from '../components/ui/Skeleton'

export const Route = createFileRoute('/panduan')({
  component: GuidePage,
  // The active shop and role come from the session cookie.
  ssr: false,
})

type GuideTab = 'kasir' | 'pemilik'

function GuidePage() {
  const tenant = useTenant()
  const [tabChoice, setTabChoice] = useState<GuideTab | null>(null)

  // Owners land on their own guide; everyone else starts at the till guide.
  // A null choice keeps following the role until the user taps a tab.
  const tab: GuideTab = tabChoice ?? (tenant.context?.role === 'owner' ? 'pemilik' : 'kasir')
  const steps = tab === 'kasir' ? KASIR_STEPS : OWNER_STEPS
  const heading = tab === 'kasir' ? 'Panduan Kasir' : 'Panduan Pemilik & Manajer'
  const intro =
    tab === 'kasir'
      ? 'Untuk kasir dan pelayan yang melayani pembayaran. Ikuti dari atas ke bawah saat pertama kali memakai aplikasi.'
      : 'Untuk pemilik dan manajer yang menyiapkan warung. Setelah tiga langkah pertama selesai, kasir sudah bisa dipakai.'

  const print = () => window.print()

  if (tenant.loading) {
    return (
      <div>
        <PageHeader title="Panduan" subtitle="Langkah singkat untuk kasir dan pemilik" />
        <SkeletonRows count={4} />
      </div>
    )
  }

  return (
    <div className="guide-page">
      <PageHeader
        title="Panduan"
        subtitle={`Langkah singkat untuk ${tenant.context?.tenantName ?? 'warung ini'}`}
        action={
          <Button
            variant="secondary"
            size="sm"
            className="no-print"
            onClick={print}
            data-testid="guide-print"
          >
            <IconPrinter size={16} stroke={2} />
            Cetak
          </Button>
        }
      />

      <div
        role="tablist"
        aria-label="Pilih panduan"
        className="no-print mb-5 flex gap-1 rounded-full border border-divider bg-surface p-1"
      >
        {(
          [
            { key: 'kasir', label: 'Kasir' },
            { key: 'pemilik', label: 'Pemilik & Manajer' },
          ] as const
        ).map((option) => {
          const active = tab === option.key
          return (
            <button
              key={option.key}
              type="button"
              role="tab"
              id={`guide-tab-${option.key}`}
              aria-selected={active}
              aria-controls={`guide-panel-${option.key}`}
              onClick={() => setTabChoice(option.key)}
              className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition duration-150 ease-out ${
                active ? 'bg-ink text-white' : 'text-body hover:bg-surface-muted'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      <section
        role="tabpanel"
        id={`guide-panel-${tab}`}
        aria-labelledby={`guide-tab-${tab}`}
        tabIndex={0}
        className="outline-none focus-visible:ring-2 focus-visible:ring-ring-focus"
      >
        <h2 className="font-display text-xl font-black text-ink sm:text-2xl">{heading}</h2>
        <p className="mt-1 max-w-2xl text-lg leading-relaxed text-body">{intro}</p>

        <ol className="guide-steps mt-4 space-y-3">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="guide-step flex break-inside-avoid items-start gap-3 rounded-2xl border border-border-subtle bg-surface p-4 shadow-level1 sm:gap-4 sm:p-5"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary font-display text-lg font-black text-on-primary">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <step.Icon size={18} stroke={2} className="shrink-0 text-brand-700" aria-hidden />
                  <h3 className="text-lg font-bold leading-tight text-ink">{step.title}</h3>
                </div>
                <p className="mt-1 text-lg leading-relaxed text-body">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-8">
        <h2 className="flex items-center gap-2 font-display text-xl font-black text-ink sm:text-2xl">
          <IconAlertTriangle size={20} stroke={2} className="text-amber-600" aria-hidden />
          Kalau ada masalah
        </h2>
        <p className="mt-1 text-base text-body">
          Kejadian yang paling sering ditanyakan, dengan jalan keluarnya.
        </p>
        <div className="guide-problems mt-3 grid gap-2 sm:grid-cols-2">
          {TROUBLESHOOTING.map((problem) => (
            <article
              key={problem.title}
              className="guide-problem break-inside-avoid rounded-xl border border-border-subtle bg-surface p-4"
            >
              <h3 className="text-lg font-semibold text-ink">{problem.title}</h3>
              <p className="mt-1 text-base leading-relaxed text-slate-600">{problem.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 break-inside-avoid">
        <h2 className="font-display text-xl font-black text-ink sm:text-2xl">Siapa bisa apa</h2>
        <p className="mt-1 text-base text-body">
          Kalau tombol yang dicari tidak muncul, berarti peran Anda memang belum mencakupnya.
        </p>
        <div className="guide-roles mt-3 overflow-hidden rounded-2xl border border-border-subtle">
          <table className="w-full border-collapse text-left">
            <thead className="bg-surface-muted text-slate-600">
              <tr>
                <th scope="col" className="px-3 py-2 text-sm font-semibold">Peran</th>
                <th scope="col" className="px-3 py-2 text-sm font-semibold">Yang bisa dilakukan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider bg-surface">
              {ROLE_ROWS.map((row) => (
                <tr key={row.role} className="align-top">
                  <th scope="row" className="whitespace-nowrap px-3 py-3 text-base font-semibold text-ink">
                    {row.role}
                  </th>
                  <td className="px-3 py-3 text-base leading-relaxed text-slate-600">{row.can}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="no-print mt-6 flex flex-col gap-3 rounded-2xl bg-surface-muted p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-body">
          Cetak panduan ini dan tempel di dekat kasir agar semua orang bisa membacanya.
        </p>
        <Button variant="secondary" size="sm" onClick={print}>
          <IconPrinter size={16} stroke={2} />
          Cetak Panduan
        </Button>
      </div>
    </div>
  )
}
