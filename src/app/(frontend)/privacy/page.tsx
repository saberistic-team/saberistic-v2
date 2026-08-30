import type { Metadata } from 'next'

export const metadata: Metadata = {
  description:
    'How Saberistic uses self-hosted, privacy-oriented analytics and what is deliberately excluded.',
  title: 'Privacy and analytics',
}

const measuredInteractions = [
  'Clicks on the primary readiness, prototype, and architecture-diagnostic calls to action.',
  'Visits to the three service sections on the homepage.',
  'Starting one of the fixed readiness-preview examples.',
  'Opening a prototype card or detail page, launching an approved prototype, or following its source link.',
]

const excludedInformation = [
  'Names, email addresses, companies, phone numbers, contact-form content, or other contact details.',
  'Readiness answers, free text, prompts, generated explanations, results, or report identifiers.',
  'Source code, credentials, logs, repository identifiers, internal service identifiers, or customer data.',
  'URL query strings, URL fragments, full referrer paths, search terms, or filter text.',
]

export default function PrivacyPage() {
  return (
    <article className="page-shell">
      <header className="page-hero shell">
        <p className="eyebrow">SABERISTIC / PRIVACY AND ANALYTICS</p>
        <h1>Measure the product, not the person.</h1>
        <p className="page-hero__lede">
          Saberistic uses a self-hosted Umami installation to understand whether the site is useful.
          The tracker is cookie-free, honors your browser&apos;s Do Not Track setting, and is
          limited to a small set of public pages and explicitly named interactions.
        </p>
      </header>

      <div className="shell catalog-section">
        <div className="prototype-detail__content">
          <section aria-labelledby="analytics-heading">
            <p className="eyebrow">01 / THE SERVICE</p>
            <h2 id="analytics-heading">Self-hosted analytics</h2>
            <p className="long-copy">
              Analytics is served from <strong>umami.saberistic.com</strong> and applies only on
              saberistic.com and www.saberistic.com. It is operated with the Saberistic application
              rather than used for advertising or cross-site tracking. Saberistic does not call
              Umami&apos;s visitor-identification function and does not enable session replay.
            </p>
          </section>

          <section aria-labelledby="collection-heading">
            <p className="eyebrow">02 / WHAT IS MEASURED</p>
            <h2 id="collection-heading">A narrow product signal</h2>
            <p className="long-copy">
              A pageview can include the approved hostname, the public page path, the page title, an
              external referrer reduced to its origin, approximate browser, device, country and
              session information derived by Umami, and standard web-performance measurements. Query
              strings and URL fragments are removed before collection.
            </p>
            <ol className="decision-list">
              {measuredInteractions.map((interaction, index) => (
                <li key={interaction}>
                  <span aria-hidden="true">0{index + 1}</span>
                  <p>{interaction}</p>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="exclusions-heading">
            <p className="eyebrow">03 / WHAT IS EXCLUDED</p>
            <h2 id="exclusions-heading">Content stays out of analytics</h2>
            <p className="long-copy">
              Event fields are checked against a small, versioned allowlist before they are sent.
              The following information is deliberately excluded:
            </p>
            <ul className="limitation-list">
              {excludedInformation.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="choice-heading">
            <p className="eyebrow">04 / YOUR CHOICE</p>
            <h2 id="choice-heading">The site works without analytics</h2>
            <p className="long-copy">
              You can enable Do Not Track in your browser or block requests to umami.saberistic.com.
              Either choice prevents or limits collection and does not change the site&apos;s
              content, readiness preview, or prototype links. Analytics failure also never blocks
              those features.
            </p>
          </section>

          <section aria-labelledby="retention-heading">
            <p className="eyebrow">05 / RETENTION AND CURRENT LIMITS</p>
            <h2 id="retention-heading">Temporary launch infrastructure</h2>
            <p className="long-copy">
              During this launch-validation phase, analytics and website content use separate
              database roles and schemas on one shared Render Free PostgreSQL instance. Analytics
              remains there until it is manually deleted or that temporary database is replaced or
              expires. The current database is scheduled to expire on September 27, 2026 and has no
              backup or automatic time-based deletion policy. This means the data is disposable, not
              a durable business or audit record.
            </p>
            <p className="long-copy">
              The public collection endpoint can receive fabricated events, so dashboard numbers are
              treated as directional product signals only. A dedicated database, documented
              retention procedure, and tested backup and restore process are still required before
              this is treated as production-grade analytics.
            </p>
          </section>

          <section aria-labelledby="updates-heading">
            <p className="eyebrow">06 / CHANGES</p>
            <h2 id="updates-heading">This notice follows the implementation</h2>
            <p className="long-copy">
              This page will be updated if the collected fields, event allowlist, retention process,
              or analytics infrastructure changes. Last updated August 30, 2026.
            </p>
          </section>
        </div>
      </div>
    </article>
  )
}
