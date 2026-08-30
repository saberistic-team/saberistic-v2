import { TrackedLink } from '@/components/analytics/TrackedLink'
import type { HomepagePrototypeFeed } from '@/lib/public-content/types'

import { PrototypeGrid } from '../prototypes/PrototypeGrid'
import { EmptyState } from '../ui/EmptyState'

export function HomePrototypeSection({ feed }: { feed: HomepagePrototypeFeed }) {
  const heading = feed.kind === 'featured' ? 'Current prototypes' : 'Recent prototypes'

  return (
    <section aria-labelledby="home-prototypes-heading" className="section section--ruled">
      <div className="shell">
        <div className="section-intro section-intro--with-action">
          <div>
            <p className="eyebrow">01 / OPEN WORKSHOP</p>
            <h2 id="home-prototypes-heading">{heading}</h2>
            <p>
              Small products used to test a specific idea or system boundary. Status, limitations,
              and data-safety notes are part of the work.
            </p>
          </div>
          <TrackedLink
            analyticsEvent={{
              data: { cta: 'explore_prototypes', placement: 'home_prototypes' },
              name: 'primary_cta_clicked',
            }}
            className="text-link"
            href="/prototypes"
          >
            View all prototypes <span aria-hidden="true">→</span>
          </TrackedLink>
        </div>

        {feed.state === 'ready' ? <PrototypeGrid placement="home" prototypes={feed.items} /> : null}

        {feed.state === 'empty' ? (
          <EmptyState
            action={{ href: '/readiness', label: 'Check production readiness' }}
            description="The first public build notes are being prepared. In the meantime, check your own system’s production readiness."
            title="The workshop is being catalogued."
          />
        ) : null}

        {feed.state === 'unavailable' ? (
          <EmptyState
            action={{ href: '/readiness', label: 'Check production readiness' }}
            description="The main site is available, but its prototype registry did not respond. No project status has been guessed or cached into this page."
            title="The prototype library is temporarily unavailable."
          />
        ) : null}
      </div>
    </section>
  )
}
