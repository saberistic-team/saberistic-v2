'use client'

import { useMemo, useState, type FormEvent } from 'react'

import {
  diagnosticPrivacyNoticeVersion,
  type DiagnosticRequestInput,
  type DiagnosticRequestSuccess,
  type DiagnosticTimeBand,
  type DiagnosticTimeframe,
} from '@/lib/diagnostic'
import type { ReadinessReport } from '@/lib/readiness'

type DiagnosticLeadFormProps = {
  anonymousToken: string
  endpoint: string
  handoffToken: string
  report: ReadinessReport
  reportId: string
}

const maximumCheckoutResponseBytes = 32 * 1024

const timeframeOptions: Array<{
  description: string
  label: string
  value: DiagnosticTimeframe
}> = [
  {
    description: 'A decision, release, or risk needs attention now.',
    label: 'This week',
    value: 'this_week',
  },
  {
    description: 'You are preparing the next meaningful release.',
    label: 'Next two weeks',
    value: 'next_two_weeks',
  },
  {
    description: 'You are planning the work deliberately, without a fire drill.',
    label: 'This month',
    value: 'this_month',
  },
]

const timeBandOptions: Array<{ label: string; value: DiagnosticTimeBand }> = [
  { label: 'Morning', value: 'morning' },
  { label: 'Afternoon', value: 'afternoon' },
  { label: 'Flexible', value: 'flexible' },
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function safeAPIMessage(value: unknown, fallback: string) {
  if (
    isRecord(value) &&
    typeof value.error === 'string' &&
    value.error.length > 0 &&
    value.error.length <= 300
  ) {
    return value.error
  }

  return fallback
}

export function safeDiagnosticCheckoutURL(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2_000) return null

  try {
    const url = new URL(value)
    if (
      url.protocol !== 'https:' ||
      url.hostname.toLowerCase() !== 'checkout.stripe.com' ||
      url.username ||
      url.password ||
      (url.port && url.port !== '443')
    ) {
      return null
    }

    return url.toString()
  } catch {
    return null
  }
}

function isDiagnosticCheckoutResponse(value: unknown): value is DiagnosticRequestSuccess {
  if (!isRecord(value)) return false

  return (
    Object.keys(value).length === 2 &&
    typeof value.requestId === 'string' &&
    value.requestId.length >= 8 &&
    value.requestId.length <= 160 &&
    safeDiagnosticCheckoutURL(value.checkoutUrl) !== null
  )
}

async function readJSON(response: Response): Promise<unknown> {
  const declaredLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > maximumCheckoutResponseBytes) {
    throw new Error('oversized_response')
  }

  const body = await response.text()
  if (body.length > maximumCheckoutResponseBytes) throw new Error('oversized_response')

  try {
    return JSON.parse(body) as unknown
  } catch {
    throw new Error('invalid_response')
  }
}

function browserTimeZone() {
  try {
    const value = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (value && value.length <= 100) {
      // Formatting once rejects invented or unsupported zone identifiers.
      new Intl.DateTimeFormat('en-US', { timeZone: value }).format()
      return value
    }
  } catch {
    // UTC is a valid IANA identifier and a safe fallback for limited browsers.
  }

  return 'UTC'
}

function focusField(id: string) {
  requestAnimationFrame(() => document.getElementById(id)?.focus())
}

function reportReference(reportId: string) {
  if (reportId.length <= 28) return reportId
  return `${reportId.slice(0, 12)}…${reportId.slice(-8)}`
}

export function DiagnosticLeadForm({
  anonymousToken,
  endpoint,
  handoffToken,
  report,
  reportId,
}: DiagnosticLeadFormProps) {
  const [company, setCompany] = useState('')
  const [consent, setConsent] = useState(false)
  const [context, setContext] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [name, setName] = useState('')
  const [selectedBlockerIds, setSelectedBlockerIds] = useState<
    DiagnosticRequestInput['selectedBlockerIds']
  >([])
  const [shareSummary, setShareSummary] = useState(false)
  const [timeBand, setTimeBand] = useState<DiagnosticTimeBand>('flexible')
  const [timeframe, setTimeframe] = useState<DiagnosticTimeframe>('next_two_weeks')
  const timeZone = useMemo(() => browserTimeZone(), [])

  function toggleBlocker(ruleId: DiagnosticRequestInput['selectedBlockerIds'][number]) {
    setSelectedBlockerIds((current) =>
      current.includes(ruleId)
        ? current.filter((candidate) => candidate !== ruleId)
        : [...current, ruleId],
    )
    setError(null)
  }

  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return

    const trimmedName = name.trim()
    const trimmedEmail = email.trim().toLowerCase()
    const trimmedCompany = company.trim()
    const trimmedContext = context.trim()

    if (trimmedName.length < 2 || trimmedName.length > 120) {
      setError('Enter the name you would like us to use for the handoff.')
      focusField('diagnostic-name')
      return
    }

    if (trimmedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Enter a valid work email so we can send the report and scheduling link.')
      focusField('diagnostic-email')
      return
    }

    if (trimmedCompany.length > 140) {
      setError('Keep the company name to 140 characters or fewer.')
      focusField('diagnostic-company')
      return
    }

    if (trimmedContext.length > 1_000) {
      setError('Keep the additional context to 1,000 characters or fewer.')
      focusField('diagnostic-context')
      return
    }

    if (!consent) {
      setError('Confirm that Saberistic may contact you about this diagnostic request.')
      focusField('diagnostic-consent')
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      const requestValue: DiagnosticRequestInput = {
        anonymousToken,
        contact: {
          name: trimmedName,
          email: trimmedEmail,
          ...(trimmedCompany ? { company: trimmedCompany } : {}),
        },
        consent: {
          contact: true,
          privacy: true,
          privacyVersion: diagnosticPrivacyNoticeVersion,
        },
        ...(trimmedContext ? { context: trimmedContext } : {}),
        handoffToken,
        report,
        selectedBlockerIds: shareSummary ? selectedBlockerIds : [],
        shareSummary,
        timeBand,
        timeframe,
        timezone: timeZone,
      }
      const response = await fetch(endpoint, {
        body: JSON.stringify(requestValue),
        cache: 'no-store',
        credentials: 'omit',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        method: 'POST',
        redirect: 'error',
      })
      const data = await readJSON(response)

      if (!response.ok) {
        setError(
          safeAPIMessage(
            data,
            'The diagnostic handoff could not be prepared. No checkout was started; please try again.',
          ),
        )
        return
      }

      if (!isDiagnosticCheckoutResponse(data)) throw new Error('invalid_response')
      const checkoutUrl = safeDiagnosticCheckoutURL(data.checkoutUrl)
      if (!checkoutUrl) throw new Error('invalid_checkout_url')
      globalThis.location.assign(checkoutUrl)
    } catch {
      setError(
        'Secure Stripe Checkout could not be opened. No checkout was started; please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section
      aria-labelledby="diagnostic-lead-heading"
      className="diagnostic-lead"
      id="diagnostic-handoff"
    >
      <div className="diagnostic-lead__intro">
        <div>
          <p className="eyebrow">REPORT → HUMAN REVIEW</p>
          <h2 id="diagnostic-lead-heading" tabIndex={-1}>
            Turn the findings into a decision.
          </h2>
          <p>
            Bring the readiness result to a focused Architecture Diagnostic with Saberistic. We’ll
            use the report as the agenda, not make you retell the whole story.
          </p>
        </div>
        <div aria-label="Architecture Diagnostic price" className="diagnostic-lead__price">
          <strong>$200</strong>
          <span>one-time</span>
        </div>
      </div>

      <ol aria-label="Architecture Diagnostic handoff steps" className="diagnostic-lead__steps">
        <li>
          <span>01</span>
          <strong>Shape the handoff</strong>
          <small>Choose what matters and when you need the conversation.</small>
        </li>
        <li>
          <span>02</span>
          <strong>Check out with Stripe</strong>
          <small>A secure one-time $200 payment. No subscription.</small>
        </li>
        <li>
          <span>03</span>
          <strong>Pick a calendar time</strong>
          <small>After payment, choose an available slot in your time zone.</small>
        </li>
      </ol>

      <form aria-busy={isSubmitting} className="diagnostic-form" noValidate onSubmit={submitLead}>
        <div className="diagnostic-form__section">
          <div className="diagnostic-form__section-heading">
            <span>01</span>
            <div>
              <h3>Where should the handoff go?</h3>
              <p>Your report and scheduling link will be sent to this address.</p>
            </div>
          </div>
          <div className="diagnostic-field-grid">
            <label htmlFor="diagnostic-name">
              <span>Name</span>
              <input
                autoComplete="name"
                id="diagnostic-name"
                maxLength={120}
                onChange={(event) => {
                  setName(event.target.value)
                  setError(null)
                }}
                required
                type="text"
                value={name}
              />
            </label>
            <label htmlFor="diagnostic-email">
              <span>Work email</span>
              <input
                autoComplete="email"
                id="diagnostic-email"
                maxLength={254}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setError(null)
                }}
                required
                type="email"
                value={email}
              />
            </label>
            <label htmlFor="diagnostic-company">
              <span>
                Company <small>optional</small>
              </span>
              <input
                autoComplete="organization"
                id="diagnostic-company"
                maxLength={140}
                onChange={(event) => {
                  setCompany(event.target.value)
                  setError(null)
                }}
                type="text"
                value={company}
              />
            </label>
          </div>
          <p className="diagnostic-form__privacy-note">
            No newsletter. This verified readiness report is sent to Saberistic to prepare the
            handoff and email your copy. Your name, email, company, and handoff note are not sent to
            OpenRouter or another AI model.
          </p>
        </div>

        <div className="diagnostic-form__section">
          <div className="diagnostic-form__section-heading">
            <span>02</span>
            <div>
              <h3>When would the call be useful?</h3>
              <p>
                These preferences give Saberistic context; you’ll pick the exact available slot
                after checkout.
              </p>
            </div>
          </div>
          <fieldset className="diagnostic-choice-group">
            <legend>Desired timeframe</legend>
            <div className="diagnostic-timeframe-grid">
              {timeframeOptions.map((option) => (
                <label key={option.value}>
                  <input
                    checked={timeframe === option.value}
                    name="diagnostic-timeframe"
                    onChange={() => setTimeframe(option.value)}
                    type="radio"
                    value={option.value}
                  />
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="diagnostic-choice-group">
            <legend>Preferred time of day</legend>
            <div className="diagnostic-time-band-grid">
              {timeBandOptions.map((option) => (
                <label key={option.value}>
                  <input
                    checked={timeBand === option.value}
                    name="diagnostic-time-band"
                    onChange={() => setTimeBand(option.value)}
                    type="radio"
                    value={option.value}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <p className="diagnostic-timezone">
            <span aria-hidden="true">◇</span> Calendar preference detected as{' '}
            <strong>{timeZone}</strong>.
          </p>
        </div>

        <div className="diagnostic-form__section">
          <div className="diagnostic-form__section-heading">
            <span>03</span>
            <div>
              <h3>Choose the useful context.</h3>
              <p>Sharing is off by default. Select only the report details you want emphasized.</p>
            </div>
          </div>
          <label className="diagnostic-check" htmlFor="diagnostic-share-summary">
            <input
              checked={shareSummary}
              id="diagnostic-share-summary"
              onChange={(event) => {
                setShareSummary(event.target.checked)
                setError(null)
              }}
              type="checkbox"
            />
            <span>
              <strong>Use my readiness summary in the private diagnostic review</strong>
              <small>
                This choice controls whether the summary and selected blockers are highlighted in
                the private handoff record. The internal notification email contains only a request
                ID and type.
              </small>
            </span>
          </label>

          {shareSummary && report.blockers.length > 0 ? (
            <fieldset className="diagnostic-blockers">
              <legend>Select blockers to emphasize</legend>
              <div>
                {report.blockers.map((blocker) => (
                  <label key={blocker.ruleId}>
                    <input
                      checked={selectedBlockerIds.includes(blocker.ruleId)}
                      onChange={() => toggleBlocker(blocker.ruleId)}
                      type="checkbox"
                    />
                    <span>
                      <strong>{blocker.label}</strong>
                      <small>{blocker.severity}</small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          <label className="diagnostic-context" htmlFor="diagnostic-context">
            <span>
              Anything else that would make the call sharper? <small>optional</small>
            </span>
            <textarea
              id="diagnostic-context"
              maxLength={1_000}
              onChange={(event) => {
                setContext(event.target.value)
                setError(null)
              }}
              placeholder="Keep it general—no secrets, credentials, customer data, or private links."
              rows={4}
              value={context}
            />
            <small>{context.length} / 1,000</small>
          </label>
        </div>

        <div className="diagnostic-form__commit">
          <label className="diagnostic-check" htmlFor="diagnostic-consent">
            <input
              checked={consent}
              id="diagnostic-consent"
              onChange={(event) => {
                setConsent(event.target.checked)
                setError(null)
              }}
              required
              type="checkbox"
            />
            <span>
              <strong>Saberistic may contact me about this Architecture Diagnostic.</strong>
              <small>
                I understand this is a one-time $200 purchase and agree to the privacy notice. This
                is not newsletter consent.
              </small>
            </span>
          </label>
          <p className="diagnostic-form__consent-note">
            Review the{' '}
            <a href="/privacy#diagnostic-processing-heading">
              privacy and diagnostic-processing notice
            </a>
            .
          </p>

          {error ? (
            <p className="diagnostic-form__error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="diagnostic-form__checkout">
            <div>
              <span>Readiness report attached</span>
              <strong>{reportReference(reportId)}</strong>
            </div>
            <button className="button button--primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Preparing secure checkout…' : 'Continue to Stripe · $200'}
            </button>
          </div>
          <p className="diagnostic-form__aftercare">
            After checkout, you’ll choose a calendar time. Your verified report and scheduling link
            go to your inbox; Saberistic receives a minimal request notification for follow-up.
          </p>
        </div>
      </form>
    </section>
  )
}
