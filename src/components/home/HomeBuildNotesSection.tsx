import { BuildNoteCard } from '@/components/build-notes/BuildNoteCard'
import { TrackedLink } from '@/components/analytics/TrackedLink'
import { buildNotes } from '@/lib/build-notes'

export function HomeBuildNotesSection() {
  const latest = buildNotes[0]

  if (!latest) return null

  return (
    <section aria-labelledby="home-build-notes-heading" className="section section--build-notes">
      <div className="shell home-build-notes">
        <div className="section-intro">
          <p className="eyebrow">02 / DAILY DEVELOPMENT</p>
          <h2 id="home-build-notes-heading">Decisions, failures, and working code—documented.</h2>
          <p>
            Build notes turn each day’s raw engineering log into a reproducible explanation with
            source links, diagrams, verified results, and explicit limits.
          </p>
          <TrackedLink
            analyticsEvent={{
              data: { cta: 'explore_build_notes', placement: 'home_build_notes' },
              name: 'primary_cta_clicked',
            }}
            className="text-link text-link--light"
            href="/build-notes"
          >
            View all build notes <span aria-hidden="true">→</span>
          </TrackedLink>
        </div>
        <BuildNoteCard note={latest} placement="home" />
      </div>
    </section>
  )
}
