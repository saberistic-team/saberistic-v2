import type { Metadata } from 'next'

import { TrackedLink } from '@/components/analytics/TrackedLink'
import { createPageMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = createPageMetadata({
  description:
    'A deterministic preview of the Saberistic Production Readiness Check and its AI boundary.',
  path: '/readiness/',
  title: 'Production Readiness Preview',
})

type ReadinessPageProps = {
  searchParams: Promise<{ next?: string | string[]; profile?: string | string[] }>
}

const profiles = {
  'agent-workflow': {
    description: 'Tools, retrieval, memory, and a human approval boundary.',
    label: 'Agent workflow',
    questions: [
      'Which tool actions require explicit human approval?',
      'Can retrieved or remembered content change permissions?',
      'How are tool failures, loops, and partial work recovered?',
      'What limits model, provider, and tool spend?',
      'Which outputs are logged without retaining sensitive content?',
    ],
  },
  'ai-saas': {
    description: 'A web product using a managed database, payments, and an AI provider.',
    label: 'AI-generated SaaS',
    questions: [
      'Which authorization checks exist beyond the interface?',
      'What customer or confidential data reaches the model provider?',
      'Can a failed deploy, migration, or payment webhook be recovered?',
      'What limits model spend, retries, and abusive traffic?',
      'Which alerts identify a broken customer journey?',
    ],
  },
  custom: {
    description: 'Start without assumptions about the architecture or business model.',
    label: 'Something else',
    questions: [
      'What works today, and who can use it?',
      'What data would be expensive or harmful to expose?',
      'Which failure would stop the product from operating?',
      'How are changes reviewed, deployed, and reversed?',
      'Which critical system facts remain unknown?',
    ],
  },
  payments: {
    description: 'A product involving KYC, wallets, money movement, or webhooks.',
    label: 'Payments product',
    questions: [
      'Which system is authoritative for transaction state?',
      'Are retries and webhooks idempotent under failure?',
      'Where do identity, KYC, wallet, and payment data cross boundaries?',
      'How are reconciliation and human review performed?',
      'Can operators pause, recover, and explain a failed flow?',
    ],
  },
} as const

type ProfileKey = keyof typeof profiles

function firstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}

function profileKey(value?: string): ProfileKey {
  return value && value in profiles ? (value as ProfileKey) : 'ai-saas'
}

export default async function ReadinessPage({ searchParams }: ReadinessPageProps) {
  const params = await searchParams
  const selectedKey = profileKey(firstValue(params.profile))
  const selected = profiles[selectedKey]
  const diagnosticIntent = firstValue(params.next) === 'architecture-diagnostic'

  return (
    <div className="page-shell readiness-page">
      <header className="page-hero shell">
        <p className="eyebrow">SABERISTIC / PRODUCTION READINESS PREVIEW</p>
        <h1>Start with what is true.</h1>
        <p className="page-hero__lede">
          Choose the closest architecture profile to preview the evidence a production review should
          test. This first slice is deterministic and does not upload code, score a system, or call
          a model.
        </p>
      </header>

      <div className="shell readiness-page__body">
        {diagnosticIntent ? (
          <aside className="phase-notice" role="note">
            <p className="eyebrow">ARCHITECTURE DIAGNOSTIC</p>
            <p>
              The private request handoff is not collecting information in this slice. It will open
              only after its consent, retention, and access controls are in place. You can review
              the assessment boundary below without sharing contact or system data.
            </p>
          </aside>
        ) : null}

        <section aria-labelledby="profile-heading">
          <div className="section-intro">
            <p className="eyebrow">01 / CHOOSE A PROFILE</p>
            <h2 id="profile-heading">What are you building?</h2>
          </div>
          <div className="readiness-profile-grid">
            {(Object.entries(profiles) as Array<[ProfileKey, (typeof profiles)[ProfileKey]]>).map(
              ([key, profile], index) => (
                <TrackedLink
                  analyticsEvent={{
                    data: { entry: 'readiness_page', mode: 'example' },
                    name: 'readiness_started',
                  }}
                  aria-current={key === selectedKey ? 'step' : undefined}
                  href={`/readiness?profile=${key}`}
                  key={key}
                >
                  <span aria-hidden="true">0{index + 1}</span>
                  <strong>{profile.label}</strong>
                  <small>{profile.description}</small>
                </TrackedLink>
              ),
            )}
          </div>
        </section>

        <section aria-labelledby="evidence-heading" className="readiness-evidence">
          <div>
            <p className="eyebrow">02 / EVIDENCE PREVIEW</p>
            <h2 id="evidence-heading">Questions for {selected.label.toLowerCase()}</h2>
            <p>
              These are review prompts, not findings. A real readiness level requires your
              controlled answers and an explicit policy calculation.
            </p>
          </div>
          <ol>
            {selected.questions.map((question, index) => (
              <li key={question}>
                <span aria-hidden="true">0{index + 1}</span>
                <p>{question}</p>
              </li>
            ))}
          </ol>
        </section>

        <aside aria-labelledby="ai-boundary-heading" className="ai-boundary">
          <p className="eyebrow">IMPLEMENTATION BOUNDARY</p>
          <h2 id="ai-boundary-heading">Scored by explicit controls. Explained by AI.</h2>
          <p>
            OpenRouter is not live in this first slice. The production flow will validate controlled
            answers, calculate readiness and blockers with versioned code, then use a pinned model
            only to tailor the explanation. The deterministic result remains complete when the model
            is unavailable.
          </p>
          <p className="safety-line">
            <span aria-hidden="true">◇</span> Do not paste source code, credentials, logs, customer
            data, client names, or confidential project details.
          </p>
          <TrackedLink
            analyticsEvent={{
              data: { cta: 'explore_prototypes', placement: 'readiness_page' },
              name: 'primary_cta_clicked',
            }}
            className="button button--quiet"
            href="/prototypes"
          >
            Explore current prototypes
          </TrackedLink>
        </aside>
      </div>
    </div>
  )
}
