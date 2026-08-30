import { TrackedAnchor, TrackedLink } from '@/components/analytics/TrackedLink'
import type { AnalyticsPrototypeCardPlacement } from '@/lib/analytics/events'
import type { PublicPrototype } from '@/lib/public-content/types'

import { PrototypePoster } from './PrototypePoster'
import { PrototypeStatusBadge } from './PrototypeStatusBadge'

function formatDate(value?: string) {
  if (!value) return 'Review date pending'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Review date pending'

  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function PrototypeCard({
  placement,
  prototype,
}: {
  placement: AnalyticsPrototypeCardPlacement
  prototype: PublicPrototype
}) {
  const checkedAt = prototype.lastVerifiedAt ?? prototype.updatedAt
  const cardEvent = {
    data: { placement, prototype: prototype.slug, status: prototype.status },
    name: 'prototype_card_clicked',
  } as const

  return (
    <article className="prototype-card">
      <PrototypePoster
        problem={prototype.problem}
        status={prototype.status}
        title={prototype.title}
      />
      <div className="prototype-card__body">
        <div className="prototype-card__meta">
          <PrototypeStatusBadge status={prototype.status} />
          <span>
            <span className="sr-only">Record checked </span>
            {formatDate(checkedAt)}
          </span>
        </div>
        <h3>
          <TrackedLink analyticsEvent={cardEvent} href={`/prototypes/${prototype.slug}`}>
            {prototype.title}
          </TrackedLink>
        </h3>
        <p>{prototype.summary}</p>
        <p className="safety-line">
          <span aria-hidden="true">◇</span> {prototype.safetyNotice}
        </p>
        <div className="prototype-card__actions">
          <TrackedLink
            analyticsEvent={cardEvent}
            className="text-link"
            href={`/prototypes/${prototype.slug}`}
          >
            View build note <span aria-hidden="true">→</span>
          </TrackedLink>
          {prototype.canLaunch && prototype.appUrl ? (
            <TrackedAnchor
              analyticsEvent={{
                data: { placement, prototype: prototype.slug },
                name: 'prototype_launch',
              }}
              className="text-link"
              href={prototype.appUrl}
              rel="external"
            >
              Open prototype <span aria-hidden="true">↗</span>
            </TrackedAnchor>
          ) : null}
        </div>
      </div>
    </article>
  )
}
