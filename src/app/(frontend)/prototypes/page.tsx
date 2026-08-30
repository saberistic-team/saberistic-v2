import type { Metadata } from 'next'

import { PrototypeFilters } from '@/components/prototypes/PrototypeFilters'
import { EmptyState } from '@/components/ui/EmptyState'
import { getPublicPrototypes } from '@/lib/public-content/prototypes'
import { createPageMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = createPageMetadata({
  description:
    'Small products and technical experiments, with their status, decisions, and limitations left visible.',
  path: '/prototypes/',
  title: 'Prototypes',
})

export default async function PrototypesPage() {
  const result = await getPublicPrototypes()

  return (
    <div className="page-shell">
      <section className="page-hero shell">
        <p className="eyebrow">SABERISTIC / PROTOTYPES</p>
        <h1>Working software, with the unfinished parts left visible.</h1>
        <p className="page-hero__lede">
          Small products and technical experiments used to test a question, make a system legible,
          or pressure-test an architecture. Each entry shows what works, what does not, and whether
          it is safe to try.
        </p>
        <p className="safety-line safety-line--large">
          <span aria-hidden="true">◇</span> Prototype labels are literal. Unless an entry says
          otherwise, use disposable data only.
        </p>
      </section>

      <section aria-labelledby="prototype-catalog-heading" className="shell catalog-section">
        <h2 className="sr-only" id="prototype-catalog-heading">
          Prototype catalog
        </h2>
        {result.state === 'ready' ? <PrototypeFilters prototypes={result.items} /> : null}

        {result.state === 'empty' ? (
          <EmptyState
            action={{ href: '/readiness', label: 'Check production readiness' }}
            description="The first public prototype records are being prepared. In the meantime, check your own system’s production readiness."
            title="The workshop is being catalogued."
          />
        ) : null}

        {result.state === 'unavailable' ? (
          <EmptyState
            action={{ href: '/', label: 'Return home' }}
            description="The site is still available, but its prototype registry did not respond. No availability or maturity status has been guessed."
            title="The prototype library is temporarily unavailable."
          />
        ) : null}
      </section>
    </div>
  )
}
