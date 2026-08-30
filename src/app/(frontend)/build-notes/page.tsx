import type { Metadata } from 'next'

import { BuildNoteCard } from '@/components/build-notes/BuildNoteCard'
import { buildNotes } from '@/lib/build-notes'
import { createPageMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  ...createPageMetadata({
    description:
      'Daily engineering notes from Saberistic: decisions, code, failures, diagrams, and the evidence behind each build.',
    path: '/build-notes/',
    title: 'Build notes',
  }),
  alternates: {
    canonical: new URL('https://saberistic.com/build-notes/'),
    types: {
      'application/rss+xml': 'https://saberistic.com/build-notes/feed.xml',
    },
  },
}

export default function BuildNotesPage() {
  return (
    <div className="page-shell build-notes-index">
      <header className="page-hero shell">
        <p className="eyebrow">SABERISTIC / DAILY DEVELOPMENT</p>
        <h1>The workbench, documented while the tools are still out.</h1>
        <p className="page-hero__lede">
          Practical notes from building Saberistic products: the architecture I chose, the code that
          survived, the failures that changed the design, and what is still only a plan.
        </p>
        <a className="text-link build-notes-index__feed" href="/build-notes/feed.xml">
          Follow via RSS <span aria-hidden="true">↗</span>
        </a>
      </header>

      <section aria-labelledby="build-note-list-heading" className="shell catalog-section">
        <h2 className="sr-only" id="build-note-list-heading">
          Published build notes
        </h2>
        <ol className="build-note-list">
          {buildNotes.map((note) => (
            <li key={note.slug}>
              <BuildNoteCard note={note} placement="index" />
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
