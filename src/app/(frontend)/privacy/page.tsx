import type { Metadata } from 'next'

import { createPageMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = createPageMetadata({
  description:
    'How Saberistic handles readiness assessments, paid diagnostic requests, email delivery, Stripe Checkout, Gift Draft, and privacy-oriented analytics.',
  path: '/privacy/',
  title: 'Privacy, diagnostics, readiness, and analytics',
})

const measuredInteractions = [
  'Clicks on the primary readiness, prototype, and architecture-diagnostic calls to action.',
  'Visits to the three service sections on the homepage.',
  'Starting one of the fixed Production Readiness Check examples.',
  'Opening a prototype card or detail page, launching an approved prototype, or following its source link.',
  'Opening a build-note card or article, or following that article’s repository link.',
]

const excludedInformation = [
  'Names, email addresses, companies, phone numbers, contact-form content, or other contact details.',
  'Readiness answers, free text, prompts, generated explanations, results, or report identifiers.',
  'Gift Draft ranges, themes, recommendation decks, kept gifts, quote tokens, or checkout notes.',
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
              content, build notes, readiness check, or prototype links. Analytics failure also
              never blocks those features.
            </p>
          </section>

          <section aria-labelledby="readiness-processing-heading">
            <p className="eyebrow">05 / READINESS PROCESSING</p>
            <h2 id="readiness-processing-heading">A report without a stored dossier</h2>
            <p className="long-copy">
              The Production Readiness Check sends controlled answers and, if you provide it, one
              short symptom description to Saberistic&apos;s application server. The server rejects
              likely credentials, personal contact details, URLs, source code, and logs; calculates
              the score, blockers, and plan with versioned application rules; and creates a complete
              report before any model request is considered.
            </p>
            <p className="long-copy">
              When the optional AI explanation is enabled and its privacy and budget gates are
              available, the selected profile, normalized question identifiers and labels,
              controlled answer labels, deterministic result, fixed action catalog, and screened
              symptom are sent through OpenRouter to an eligible model provider. The request
              requires a zero-data-retention route, denies provider data collection, disables
              OpenRouter response caching and every currently documented plugin, and supplies no
              tools, files, or repository access. The AI path remains off until the account&apos;s
              plugin defaults and override controls have been reviewed. OpenRouter and the selected
              provider still process that minimized request in transit. If any gate, routing audit,
              or model call fails, the browser receives the deterministic report instead.
            </p>
            <p className="long-copy">
              Saberistic does not store assessment answers, symptom text, prompts, generated prose,
              or the report in Payload or Umami. The report remains in browser memory unless you
              print or download it, or explicitly submit the paid diagnostic handoff; that separate
              action verifies and emails the report without retaining the report body. Operational
              logs contain only non-content outcome, timing, and usage metadata. To enforce abuse
              and cost limits, Render Key Value temporarily stores global counters and one-way
              HMAC-derived counters for the client network address and anonymous browser token—not
              the raw identifiers, answers, or report. These counters expire within 24 hours, are
              not analytics or marketing data, and can disappear sooner when the Free staging
              service restarts. Do not enter source code, credentials, logs, customer data, client
              names, or confidential project details.
            </p>
          </section>

          <section aria-labelledby="diagnostic-processing-heading">
            <p className="eyebrow">06 / PAID DIAGNOSTIC HANDOFF</p>
            <h2 id="diagnostic-processing-heading">Contact details stay outside the model</h2>
            <p className="long-copy">
              The free readiness report appears before Saberistic asks for contact information. If
              you choose the paid Architecture Diagnostic, the separate handoff asks for your name,
              email address, preferred timing, time zone, contact consent, and optionally a company,
              short new context note, and selected readiness blockers. None of these contact fields
              is sent to OpenRouter or a model. The server verifies that the report matches the
              short-lived signed handoff before using it.
            </p>
            <p className="long-copy">
              Saberistic stores a private diagnostic-request record in Payload with the contact and
              consent fields, workflow and payment state, report ID, policy version, readiness
              level, and only the blocker labels you explicitly choose to share. It does not store
              the full readiness report, raw answers, original symptom, prompt, or AI prose. The
              full report is sent to the address you provide through Resend, which processes the
              address, message, and report attachment for delivery under its own service terms. The
              notification sent to <strong>inbox@saberistic.com</strong> contains only the opaque
              request ID and request type; an authorized reviewer must sign in to Payload to see the
              consented lead record.
            </p>
            <p className="long-copy">
              Stripe hosts the $200 payment page and handles payment details; Saberistic never
              receives your card number. Stripe metadata contains only the opaque diagnostic request
              ID. After Stripe confirms payment through a signed webhook, Resend sends the booking
              confirmation and the configured HTTPS scheduling page lets you choose a live calendar
              time. The scheduling provider then handles availability and calendar invitations under
              its own privacy terms. Diagnostic requests receive a provisional review date 90 days
              after submission and should be deleted at review when they did not become an active
              business record.
            </p>
          </section>

          <section aria-labelledby="gift-processing-heading">
            <p className="eyebrow">07 / GIFT DRAFT PROCESSING</p>
            <h2 id="gift-processing-heading">
              Cached AI concept inventory, not a personal dossier
            </h2>
            <p className="long-copy">
              Gift Draft sends the chosen price range, theme, a random variation seed, and an
              anonymous browser token to Saberistic&apos;s application server. It does not ask for a
              visitor&apos;s name, relationship, interests, address, or recipient profile. The
              server deals from durable inventory of AI-created gift concepts and locally cached
              generated artwork, so a draw does not wait for OpenRouter. The selected controls and
              anonymous token are used for the draw and abuse limits; they are not stored as a
              visitor profile.
            </p>
            <p className="long-copy">
              Each draw performs a best-effort minimum-stock check. When replenishment is needed, a
              background job combines bounded gift criteria with AmirSaber&apos;s curated public
              gift profile and asks OpenRouter for one structured, unbranded concept and a generated
              product-style image. OpenRouter and eligible text and image model providers may
              process that concept-only request in transit. The request contains no visitor token,
              picks, contact details, or retailer data. The job applies product-safety, exact
              budget, theme, image, and duplicate checks before a record becomes eligible.
            </p>
            <p className="long-copy">
              Saberistic stores the concept name, model-suggested contribution amount, description,
              suitability note, theme, and normalized generated WebP artwork in its own
              PostgreSQL-backed inventory. It does not fetch retailer pages, descriptions, prices,
              availability, or images. A confirmed contribution retires the selected concept from
              future draws, while minimum-stock checks generate additional concepts for later games.
            </p>
            <p className="long-copy">
              The current deck and game choices can be kept in your browser&apos;s local storage so
              a canceled checkout does not erase the round. Saberistic does not put a visitor&apos;s
              deck or picks into Payload or Umami; the shared product inventory is not linked to a
              visitor identity. Short-lived Key Value counters use one-way HMAC-derived network and
              browser-token values to limit requests and cost; the raw identifiers and choices are
              not stored in those counters.
            </p>
            <p className="long-copy">
              If you continue, Stripe hosts the payment page and handles the payment details.
              Saberistic never receives a card number. After a signature-verified Stripe event,
              Saberistic keeps a staff-only payment record containing the selected item reference,
              contribution amount and status, Stripe session, payment, charge, and event
              identifiers, the payer email supplied to Stripe, any optional checkout note, and the
              manual fulfillment status. The selected inventory item is reserved while Checkout is
              pending. Confirmed payment retires it from future draws; a definitively failed or
              expired Checkout releases it. A refund does not automatically put the item back into
              inventory. The record receives a deletion review date 90 days after the Stripe event;
              a later payment or refund event can move that review date forward. The payment is a
              contribution to Saberistic; the depicted concept is not a product being sold, ordered,
              or shipped. AmirSaber decides how to use a confirmed contribution and may choose an
              item inspired by the concept, related costs, a substitute, or another gift.
              Stripe&apos;s own processing is described in its{' '}
              <a href="https://stripe.com/privacy">privacy policy.</a>
            </p>
          </section>

          <section aria-labelledby="retention-heading">
            <p className="eyebrow">08 / RETENTION AND CURRENT LIMITS</p>
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
            <p className="eyebrow">09 / CHANGES</p>
            <h2 id="updates-heading">This notice follows the implementation</h2>
            <p className="long-copy">
              This page will be updated if the collected fields, event allowlist, retention process,
              readiness processing, diagnostic handoff, Gift Draft processing, payment handling, or
              analytics infrastructure changes. Last updated September 1, 2026.
            </p>
          </section>
        </div>
      </div>
    </article>
  )
}
