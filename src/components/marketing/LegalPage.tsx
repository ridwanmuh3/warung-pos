import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { MarketingShell } from './MarketingShell'
import { SITE } from '../../data/site'

export interface LegalSectionLink {
  id: string
  title: string
}

/**
 * Shared chrome for the legal pages: title, version line, plain-language
 * summary, and a table of contents. The documents describe what the code
 * actually does; they are not copied from a template.
 */
export function LegalPage({
  title,
  intro,
  summary,
  sections,
  children,
}: {
  title: string
  intro: string
  summary: string[]
  sections: LegalSectionLink[]
  children: ReactNode
}) {
  return (
    <MarketingShell>
      <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-wide text-link">Legal</p>
        <h1 className="mt-3 font-display text-3xl font-black leading-[0.95] text-ink sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-body">{intro}</p>
        <p className="mt-3 text-sm text-mute">
          Versi {SITE.legalVersion} · Berlaku sejak {SITE.legalEffective} · Terakhir diperbarui{' '}
          {SITE.updatedAt}
        </p>

        <div className="mt-8 rounded-[24px] border border-border-subtle bg-surface-muted p-5">
          <h2 className="text-sm font-bold text-ink">Ringkasan singkat</h2>
          <ul className="mt-3 space-y-2">
            {summary.map((item) => (
              <li key={item} className="flex gap-2 text-sm leading-relaxed text-body">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-link" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <nav aria-label="Daftar isi" className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-mute">Daftar isi</h2>
          <ol className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {sections.map((section, index) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="text-sm text-link underline-offset-2 hover:underline"
                >
                  {index + 1}. {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 space-y-10">{children}</div>

        <div className="mt-12 rounded-[24px] border border-border-subtle bg-surface-muted p-5">
          <h2 className="font-display text-lg font-black text-ink">Pertanyaan atau permintaan</h2>
          <p className="mt-2 text-sm leading-relaxed text-body">
            Hubungi pemilik Warung POS melalui{' '}
            <a
              href={SITE.github}
              className="font-semibold text-link underline underline-offset-2"
            >
              GitHub
            </a>{' '}
            dengan menyebutkan email akun dan warung yang dimaksud. Kami akan memverifikasi
            kepemilikan sebelum menindaklanjuti permintaan data.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-mute">
            Dokumen ini menjelaskan praktik layanan saat ini, bukan nasihat hukum.
          </p>
          <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <Link to="/privasi" className="font-semibold text-link underline underline-offset-2">
              Kebijakan privasi
            </Link>
            <Link to="/ketentuan" className="font-semibold text-link underline underline-offset-2">
              Ketentuan layanan
            </Link>
            <Link to="/beranda" className="font-semibold text-link underline underline-offset-2">
              Kembali ke beranda
            </Link>
          </p>
        </div>
      </article>
    </MarketingShell>
  )
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24">
      <h2 id={`${id}-title`} className="font-display text-xl font-black text-ink">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-body">{children}</div>
    </section>
  )
}

export function LegalList({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5">{children}</ul>
}
