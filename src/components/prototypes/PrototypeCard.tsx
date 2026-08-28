import Link from 'next/link'

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

export function PrototypeCard({ prototype }: { prototype: PublicPrototype }) {
  const checkedAt = prototype.lastVerifiedAt ?? prototype.updatedAt

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
          <Link href={`/prototypes/${prototype.slug}`}>{prototype.title}</Link>
        </h3>
        <p>{prototype.summary}</p>
        <p className="safety-line">
          <span aria-hidden="true">◇</span> {prototype.safetyNotice}
        </p>
        <div className="prototype-card__actions">
          <Link className="text-link" href={`/prototypes/${prototype.slug}`}>
            View build note <span aria-hidden="true">→</span>
          </Link>
          {prototype.canLaunch && prototype.appUrl ? (
            <a className="text-link" href={prototype.appUrl} rel="external">
              Open prototype <span aria-hidden="true">↗</span>
            </a>
          ) : null}
        </div>
      </div>
    </article>
  )
}
