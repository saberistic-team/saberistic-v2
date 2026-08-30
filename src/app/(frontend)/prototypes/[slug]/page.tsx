import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { TrackEventOnMount } from '@/components/analytics/TrackEventOnMount'
import { TrackedAnchor } from '@/components/analytics/TrackedLink'
import { PrototypePoster } from '@/components/prototypes/PrototypePoster'
import { PrototypeStatusBadge } from '@/components/prototypes/PrototypeStatusBadge'
import { JsonLd } from '@/components/seo/JsonLd'
import { EmptyState } from '@/components/ui/EmptyState'
import { getPublicPrototypeBySlug } from '@/lib/public-content/prototypes'
import type { DataClassification, PublicPrototype } from '@/lib/public-content/types'
import { createPageMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

type PrototypePageProps = {
  params: Promise<{ slug: string }>
}

const dataLabels: Record<DataClassification, string> = {
  'account-data': 'Account data',
  'non-sensitive': 'Non-sensitive data only',
  'synthetic-only': 'Synthetic data only',
  none: 'No visitor data expected',
  sensitive: 'Sensitive data',
}

function formatDate(value?: string) {
  if (!value) return 'Pending'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Pending'

  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function relationLabel(value?: string) {
  const labels: Record<string, string> = {
    external_contribution: 'External contribution',
    fork: 'Fork',
    organization_owned: 'Organization-owned',
    personal_original: 'Personal original',
  }

  return value ? (labels[value] ?? value) : 'Not stated'
}

export async function generateMetadata({ params }: PrototypePageProps): Promise<Metadata> {
  const { slug } = await params
  const result = await getPublicPrototypeBySlug(slug)

  if (!result.item) return { title: 'Prototype' }

  return createPageMetadata({
    description: result.item.summary,
    path: `/prototypes/${result.item.slug}/`,
    title: result.item.title,
  })
}

function PrototypeDetail({ prototype }: { prototype: PublicPrototype }) {
  const canonicalURL = `https://saberistic.com/prototypes/${prototype.slug}/`
  const modifiedAt =
    prototype.updatedAt && !Number.isNaN(Date.parse(prototype.updatedAt))
      ? prototype.updatedAt
      : undefined
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          item: 'https://saberistic.com/prototypes/',
          name: 'Prototypes',
          position: 1,
        },
        {
          '@type': 'ListItem',
          item: canonicalURL,
          name: prototype.title,
          position: 2,
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      ...(modifiedAt ? { dateModified: modifiedAt } : {}),
      author: {
        '@type': 'Person',
        name: 'AmirSaber Sharifi',
        url: 'https://saberistic.com/#about',
      },
      description: prototype.summary,
      mainEntityOfPage: canonicalURL,
      name: prototype.title,
      url: canonicalURL,
    },
  ]

  return (
    <article className="prototype-detail">
      <JsonLd data={structuredData} id={`prototype-${prototype.slug}-structured-data`} />
      <TrackEventOnMount
        event={{
          data: { prototype: prototype.slug, status: prototype.status },
          name: 'prototype_view',
        }}
      />
      <header className="prototype-detail__header shell">
        <nav aria-label="Breadcrumb">
          <ol className="breadcrumb">
            <li>
              <Link href="/prototypes">Prototypes</Link>
            </li>
            <li aria-current="page">{prototype.title}</li>
          </ol>
        </nav>
        <div className="prototype-detail__title-grid">
          <div>
            <div className="prototype-detail__status">
              <PrototypeStatusBadge status={prototype.status} />
              <span>{dataLabels[prototype.dataClassification]}</span>
            </div>
            <h1>{prototype.title}</h1>
            <p className="page-hero__lede">{prototype.summary}</p>
          </div>
          <PrototypePoster
            problem={prototype.problem}
            status={prototype.status}
            title={prototype.title}
          />
        </div>
      </header>

      <div className="shell prototype-detail__body">
        <div className="prototype-detail__content">
          <aside aria-labelledby="safety-heading" className="safety-notice">
            <p className="eyebrow">DATA BOUNDARY</p>
            <h2 id="safety-heading">{prototype.safetyNotice}</h2>
            {prototype.dataHandlingNotes ? <p>{prototype.dataHandlingNotes}</p> : null}
          </aside>

          {prototype.problem ? (
            <section>
              <p className="eyebrow">THE QUESTION</p>
              <h2>Why this exists</h2>
              <p className="long-copy">{prototype.problem}</p>
            </section>
          ) : null}

          {prototype.story ? (
            <section>
              <p className="eyebrow">THE BUILD</p>
              <h2>What this prototype explores</h2>
              <p className="long-copy">{prototype.story}</p>
            </section>
          ) : null}

          {prototype.decisions.length ? (
            <section>
              <p className="eyebrow">DECISIONS</p>
              <h2>What shaped the build</h2>
              <ol className="decision-list">
                {prototype.decisions.map((decision, index) => (
                  <li key={`${decision.title}-${index}`}>
                    <span aria-hidden="true">0{index + 1}</span>
                    <div>
                      <h3>{decision.title}</h3>
                      <p>{decision.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          <section>
            <p className="eyebrow">KNOWN LIMITS</p>
            <h2>What is not being claimed</h2>
            {prototype.limitations.length ? (
              <ul className="limitation-list">
                {prototype.limitations.map((limitation) => (
                  <li key={limitation}>{limitation}</li>
                ))}
              </ul>
            ) : (
              <p className="long-copy">
                A limitations note has not been published yet. Treat this as an early build, not as
                evidence of production readiness, security review, or adoption.
              </p>
            )}
          </section>
        </div>

        <aside aria-label="Prototype facts and actions" className="prototype-facts">
          <dl>
            <div>
              <dt>Status</dt>
              <dd>{prototype.status}</dd>
            </div>
            <div>
              <dt>Data</dt>
              <dd>{dataLabels[prototype.dataClassification]}</dd>
            </div>
            <div>
              <dt>Availability</dt>
              <dd>{prototype.canLaunch ? 'Available' : 'Public demo under review'}</dd>
            </div>
            <div>
              <dt>Record checked</dt>
              <dd>{formatDate(prototype.lastVerifiedAt ?? prototype.updatedAt)}</dd>
            </div>
            <div>
              <dt>Repository</dt>
              <dd>{relationLabel(prototype.sourceRelation)}</dd>
            </div>
            <div>
              <dt>License</dt>
              <dd>{prototype.sourceLicense ?? 'Not stated'}</dd>
            </div>
          </dl>

          <div className="prototype-facts__actions">
            {prototype.canLaunch && prototype.appUrl ? (
              <TrackedAnchor
                analyticsEvent={{
                  data: { placement: 'detail', prototype: prototype.slug },
                  name: 'prototype_launch',
                }}
                className="button"
                href={prototype.appUrl}
                rel="external"
              >
                Open prototype <span aria-hidden="true">↗</span>
              </TrackedAnchor>
            ) : (
              <p className="availability-note">
                <strong>Public demo under review.</strong>
                <span>
                  The prototype record is available, but the interactive version is not open yet.
                </span>
              </p>
            )}
            {prototype.sourceUrl ? (
              <TrackedAnchor
                analyticsEvent={{
                  data: { prototype: prototype.slug },
                  name: 'prototype_source_clicked',
                }}
                className="button button--quiet"
                href={prototype.sourceUrl}
                rel="external"
              >
                View source <span aria-hidden="true">↗</span>
              </TrackedAnchor>
            ) : (
              <p className="availability-note">
                <strong>Source is not public for this experiment.</strong>
              </p>
            )}
          </div>
        </aside>
      </div>
    </article>
  )
}

export default async function PrototypePage({ params }: PrototypePageProps) {
  const { slug } = await params
  const result = await getPublicPrototypeBySlug(slug)

  if (result.state === 'not-found') notFound()

  if (result.state === 'unavailable' || !result.item) {
    return (
      <div className="page-shell shell">
        <EmptyState
          action={{ href: '/prototypes', label: 'Explore prototypes' }}
          description="The site is still available, but the prototype record did not respond. No project status has been guessed."
          title="This build note is temporarily unavailable."
        />
      </div>
    )
  }

  return <PrototypeDetail prototype={result.item} />
}
