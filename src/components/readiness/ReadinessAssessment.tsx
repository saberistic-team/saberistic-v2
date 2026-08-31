'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'

import {
  nextStepIds,
  readinessDimensions,
  readinessLevels,
  readinessPolicyVersion,
  readinessProfiles,
  readinessQuestionsV1,
  readinessSectionsV1,
  validateReadinessAssessmentRequest,
  type QuestionId,
  type ReadinessAnswers,
  type ReadinessAssessmentRequest,
  type ReadinessProfile,
  type ReadinessReport,
} from '@/lib/readiness'

import { DiagnosticLeadForm } from './DiagnosticLeadForm'

type AssessmentResponse = {
  fallbackUsed: boolean
  handoffToken: string | null
  report: ReadinessReport
  reportId: string
}

type ReadinessAssessmentProps = {
  assessmentEndpoint?: string
  checkoutReturn?: 'canceled' | 'success' | null
  diagnosticEndpoint?: string
  diagnosticIntent?: boolean
  initialProfile?: ReadinessProfile
}

const profileCards: Record<
  ReadinessProfile,
  { description: string; label: string; number: string }
> = {
  ai_saas: {
    description: 'A web product using accounts, a managed database, payments, or an AI provider.',
    label: 'AI-enabled SaaS',
    number: '01',
  },
  agent_workflow: {
    description: 'Tools, retrieval, memory, and material actions that need an approval boundary.',
    label: 'Agent workflow',
    number: '02',
  },
  payments: {
    description: 'A product involving money movement, payment events, wallets, or reconciliation.',
    label: 'Payments product',
    number: '03',
  },
  custom: {
    description: 'Start without assumptions about the architecture, stage, or business model.',
    label: 'Something else',
    number: '04',
  },
}

const levelLabels: Record<ReadinessReport['level'], string> = {
  demo_only: 'Demo only',
  internal_beta: 'Internal beta',
  limited_production: 'Limited production',
  production_candidate: 'Production candidate',
}

const dimensionLabels: Record<keyof ReadinessReport['dimensionScores'], string> = {
  data_privacy: 'Data & privacy',
  maintainability: 'Maintainability',
  operability: 'Operability',
  reliability: 'Reliability',
  security: 'Security',
}

const nextStepActions: Record<ReadinessReport['nextStep']['id'], { href: string; label: string }> =
  {
    architecture_diagnostic: {
      href: '/#services',
      label: 'Review ways to work together',
    },
    engineering_rescue_inquiry: {
      href: '/#engineering-rescue',
      label: 'Review Engineering Rescue',
    },
    self_serve: {
      href: '#plan-heading',
      label: 'Review your action plan',
    },
  }

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isBoundedText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 10_000
}

function isPercentage(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 100
}

function isBoundedArray<T>(
  value: unknown,
  validateItem: (item: unknown) => item is T,
): value is T[] {
  return Array.isArray(value) && value.length <= 50 && value.every(validateItem)
}

function isReportListItem(value: unknown): value is ReadinessReport['blockers'][number] {
  return (
    isRecord(value) &&
    isBoundedText(value.ruleId) &&
    isBoundedText(value.label) &&
    isBoundedText(value.explanation) &&
    isBoundedText(value.verification) &&
    (value.severity === 'critical' || value.severity === 'major')
  )
}

function isUnknownItem(value: unknown): value is ReadinessReport['unknowns'][number] {
  return (
    isRecord(value) &&
    isBoundedText(value.controlId) &&
    isBoundedText(value.label) &&
    isBoundedText(value.explanation) &&
    isBoundedText(value.verification)
  )
}

function isStrengthItem(value: unknown): value is ReadinessReport['strengths'][number] {
  return (
    isRecord(value) &&
    isBoundedText(value.controlId) &&
    isBoundedText(value.label) &&
    isBoundedText(value.explanation)
  )
}

function isPlanItem(
  value: unknown,
): value is ReadinessReport['plan48Hours'][number] | ReadinessReport['doNotOptimizeYet'][number] {
  return (
    isRecord(value) &&
    isBoundedText(value.actionId) &&
    isBoundedText(value.label) &&
    isBoundedText(value.detail)
  )
}

function isReadinessReport(value: unknown): value is ReadinessReport {
  if (!isRecord(value) || !isRecord(value.dimensionScores) || !isRecord(value.nextStep)) {
    return false
  }

  const dimensionScores = value.dimensionScores
  const nextStep = value.nextStep
  const dimensionKeys = Object.keys(dimensionScores)
  const dimensionsAreSafe =
    dimensionKeys.length === readinessDimensions.length &&
    readinessDimensions.every((dimension) => {
      const result = dimensionScores[dimension]
      return (
        isRecord(result) &&
        (result.score === null || isPercentage(result.score)) &&
        isPercentage(result.completeness) &&
        typeof result.applicableWeight === 'number' &&
        Number.isFinite(result.applicableWeight) &&
        result.applicableWeight >= 0 &&
        typeof result.earnedHalfPoints === 'number' &&
        Number.isFinite(result.earnedHalfPoints) &&
        result.earnedHalfPoints >= 0
      )
    })

  return (
    value.policyVersion === readinessPolicyVersion &&
    readinessProfiles.some((profile) => value.profile === profile) &&
    readinessLevels.some((level) => value.level === level) &&
    readinessLevels.some((level) => value.baselineLevel === level) &&
    isPercentage(value.score) &&
    isPercentage(value.completeness) &&
    (value.explanationSource === 'deterministic' || value.explanationSource === 'model') &&
    isBoundedText(value.summary) &&
    isBoundedText(value.disclaimer) &&
    dimensionsAreSafe &&
    isBoundedArray(value.blockers, isReportListItem) &&
    isBoundedArray(value.unknowns, isUnknownItem) &&
    isBoundedArray(value.strengths, isStrengthItem) &&
    isBoundedArray(value.plan48Hours, isPlanItem) &&
    isBoundedArray(value.planTwoWeeks, isPlanItem) &&
    isBoundedArray(value.doNotOptimizeYet, isPlanItem) &&
    nextStepIds.some((id) => nextStep.id === id) &&
    isBoundedText(nextStep.label) &&
    isBoundedText(nextStep.reason)
  )
}

function anonymousToken() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  const bytes = new Uint8Array(24)
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes)
    return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
  }

  return `browser-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function isAssessmentResponse(value: unknown): value is AssessmentResponse {
  if (!isRecord(value)) return false

  return (
    typeof value.fallbackUsed === 'boolean' &&
    isBoundedText(value.reportId) &&
    (value.handoffToken === null || isBoundedText(value.handoffToken)) &&
    isReadinessReport(value.report) &&
    value.fallbackUsed === (value.report.explanationSource === 'deterministic')
  )
}

function safeDownloadName(report: ReadinessReport) {
  return `saberistic-readiness-${report.policyVersion}-${report.level}.json`
}

function DimensionScores({ report }: { report: ReadinessReport }) {
  return (
    <div className="readiness-score-grid">
      {Object.entries(report.dimensionScores).map(([dimension, result]) => (
        <div className="readiness-dimension" key={dimension}>
          <div>
            <span>{dimensionLabels[dimension as keyof typeof dimensionLabels]}</span>
            <strong>{result.score ?? 'N/A'}</strong>
          </div>
          <div
            aria-label={
              result.score === null
                ? `${dimensionLabels[dimension as keyof typeof dimensionLabels]}: not applicable`
                : `${dimensionLabels[dimension as keyof typeof dimensionLabels]}: ${result.score} out of 100`
            }
            className="readiness-meter"
            role="img"
          >
            <span style={{ width: `${result.score ?? 0}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function ReportList({
  empty,
  items,
  kind,
}: {
  empty: string
  items: ReadinessReport['blockers'] | ReadinessReport['unknowns'] | ReadinessReport['strengths']
  kind: 'blocker' | 'strength' | 'unknown'
}) {
  if (items.length === 0) return <p className="readiness-empty-note">{empty}</p>

  return (
    <ol className={`readiness-report-list readiness-report-list--${kind}`}>
      {items.map((item, index) => {
        const label = item.label
        const verification = 'verification' in item ? item.verification : null

        return (
          <li key={'ruleId' in item ? item.ruleId : item.controlId}>
            <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <div>
              {'severity' in item ? <small>{item.severity}</small> : null}
              <h3>{label}</h3>
              <p>{item.explanation}</p>
              {verification ? (
                <p className="readiness-verification">
                  <strong>Verify:</strong> {verification}
                </p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function ResultView({
  anonymousToken,
  checkoutReturn,
  diagnosticEndpoint,
  diagnosticIntent,
  fallbackUsed,
  handoffToken,
  onReset,
  report,
  reportId,
}: {
  anonymousToken: string
  checkoutReturn: 'canceled' | 'success' | null
  diagnosticEndpoint: string
  diagnosticIntent: boolean
  fallbackUsed: boolean
  handoffToken: string | null
  onReset: () => void
  report: ReadinessReport
  reportId: string
}) {
  const [diagnosticOpen, setDiagnosticOpen] = useState(diagnosticIntent)
  const resultHeading = useRef<HTMLHeadingElement>(null)
  const nextStepAction = nextStepActions[report.nextStep.id]
  const offersDiagnostic = diagnosticIntent || report.nextStep.id === 'architecture_diagnostic'

  useEffect(() => {
    if (!checkoutReturn) resultHeading.current?.focus()
  }, [checkoutReturn])

  function downloadReport() {
    const body = JSON.stringify(report, null, 2)
    const url = URL.createObjectURL(new Blob([body], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = safeDownloadName(report)
    link.hidden = true
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  function openDiagnostic() {
    setDiagnosticOpen(true)
    requestAnimationFrame(() =>
      document
        .getElementById(handoffToken ? 'diagnostic-lead-heading' : 'diagnostic-unavailable-heading')
        ?.focus(),
    )
  }

  return (
    <div className="readiness-results">
      {checkoutReturn ? <CheckoutReturnNotice status={checkoutReturn} /> : null}

      <section aria-labelledby="readiness-result-heading" className="readiness-result-hero">
        <div>
          <p className="eyebrow">YOUR READINESS RESULT</p>
          <h1 id="readiness-result-heading" ref={resultHeading} tabIndex={-1}>
            {levelLabels[report.level]}
          </h1>
          <p className="readiness-result-summary">{report.summary}</p>
          <p className="readiness-result-source">
            {fallbackUsed
              ? 'Deterministic report — the optional AI explanation was unavailable or disabled.'
              : 'Deterministic score and blockers, with an AI-tailored explanation.'}
          </p>
        </div>
        <div
          aria-label={`Overall score ${report.score} out of 100`}
          className="readiness-score"
          role="img"
        >
          <strong>{report.score}</strong>
          <span>/ 100</span>
          <small>{report.completeness}% evidence completeness</small>
        </div>
      </section>

      <section aria-labelledby="dimension-heading" className="readiness-report-section">
        <div className="section-intro">
          <p className="eyebrow">01 / SCORECARD</p>
          <h2 id="dimension-heading">Five operating dimensions</h2>
        </div>
        <DimensionScores report={report} />
      </section>

      <section aria-labelledby="blocker-heading" className="readiness-report-section">
        <div className="section-intro">
          <p className="eyebrow">02 / HARD GATES</p>
          <h2 id="blocker-heading">What blocks the next level</h2>
        </div>
        <ReportList
          empty="No critical or major hard blocker was triggered by the declared answers. Unknown evidence can still prevent a higher level."
          items={report.blockers}
          kind="blocker"
        />
      </section>

      <section aria-labelledby="unknown-heading" className="readiness-report-section">
        <div className="section-intro">
          <p className="eyebrow">03 / UNKNOWNS</p>
          <h2 id="unknown-heading">What still needs evidence</h2>
        </div>
        <ReportList
          empty="Every applicable control received a confirmed answer. The result still depends on the accuracy of those declarations."
          items={report.unknowns}
          kind="unknown"
        />
      </section>

      <section aria-labelledby="strength-heading" className="readiness-report-section">
        <div className="section-intro">
          <p className="eyebrow">04 / CONFIRMED STRENGTHS</p>
          <h2 id="strength-heading">Controls worth preserving</h2>
        </div>
        <ReportList
          empty="No control has enough confirmed evidence to list as a strength yet."
          items={report.strengths}
          kind="strength"
        />
      </section>

      <section aria-labelledby="plan-heading" className="readiness-plan readiness-report-section">
        <div className="section-intro">
          <p className="eyebrow">05 / ACTION PLAN</p>
          <h2 id="plan-heading">Do the highest-consequence work first</h2>
        </div>
        <div className="readiness-plan-grid">
          <div>
            <h3>Next 48 hours</h3>
            <ol>
              {report.plan48Hours.map((item) => (
                <li key={item.actionId}>
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h3>Next two weeks</h3>
            <ol>
              {report.planTwoWeeks.map((item) => (
                <li key={item.actionId}>
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section aria-labelledby="defer-heading" className="readiness-report-section readiness-defer">
        <div className="section-intro">
          <p className="eyebrow">06 / DO NOT OPTIMIZE YET</p>
          <h2 id="defer-heading">Keep attention on the gate</h2>
        </div>
        <ul>
          {report.doNotOptimizeYet.map((item) => (
            <li key={item.actionId}>
              <strong>{item.label}</strong>
              <span>{item.detail}</span>
            </li>
          ))}
        </ul>
      </section>

      <aside className="readiness-next-step">
        <p className="eyebrow">RECOMMENDED NEXT STEP</p>
        <h2>{report.nextStep.label}</h2>
        <p>{report.nextStep.reason}</p>
        <div className="action-row">
          {report.nextStep.id === 'architecture_diagnostic' ? (
            <button
              aria-controls="diagnostic-handoff"
              aria-expanded={diagnosticOpen}
              className="button button--primary"
              onClick={openDiagnostic}
              type="button"
            >
              {diagnosticOpen ? 'Review the $200 handoff' : 'Start the $200 diagnostic handoff'}
            </button>
          ) : (
            <Link className="button button--primary" href={nextStepAction.href}>
              {nextStepAction.label}
            </Link>
          )}
          {diagnosticIntent && report.nextStep.id !== 'architecture_diagnostic' ? (
            <button
              aria-controls="diagnostic-handoff"
              aria-expanded={diagnosticOpen}
              className="button button--quiet"
              onClick={openDiagnostic}
              type="button"
            >
              Review the $200 diagnostic handoff
            </button>
          ) : null}
          <button className="button button--quiet" onClick={() => window.print()} type="button">
            Print or save as PDF
          </button>
          <button className="button button--quiet" onClick={downloadReport} type="button">
            Download report
          </button>
        </div>
      </aside>

      {offersDiagnostic && diagnosticOpen ? (
        handoffToken ? (
          <DiagnosticLeadForm
            anonymousToken={anonymousToken}
            endpoint={diagnosticEndpoint}
            handoffToken={handoffToken}
            report={report}
            reportId={reportId}
          />
        ) : (
          <section
            aria-labelledby="diagnostic-unavailable-heading"
            className="diagnostic-unavailable"
            id="diagnostic-handoff"
          >
            <p className="eyebrow">PAID HANDOFF UNAVAILABLE</p>
            <h2 id="diagnostic-unavailable-heading" tabIndex={-1}>
              Your free report is still complete.
            </h2>
            <p>
              This assessment session did not receive the signed handoff needed to open a secure
              $200 checkout. Nothing in the report is hidden or reduced—you can still print,
              download, and use every recommendation above. Try the assessment again later to
              request a paid Architecture Diagnostic.
            </p>
          </section>
        )
      ) : null}

      <p className="readiness-disclaimer">{report.disclaimer}</p>
      <button className="readiness-reset" onClick={onReset} type="button">
        Start another assessment
      </button>
    </div>
  )
}

function CheckoutReturnNotice({ status }: { status: 'canceled' | 'success' }) {
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    heading.current?.focus()
  }, [status])

  return (
    <section
      aria-labelledby="diagnostic-return-heading"
      className={`diagnostic-return diagnostic-return--${status}`}
      role="status"
    >
      <p className="eyebrow">
        {status === 'success' ? 'CHECKOUT COMPLETE' : 'STRIPE CHECKOUT CANCELED'}
      </p>
      <h2 id="diagnostic-return-heading" ref={heading} tabIndex={-1}>
        {status === 'success' ? 'Watch your inbox for the scheduling step.' : 'No charge was made.'}
      </h2>
      <p>
        {status === 'success'
          ? 'Once Stripe confirms payment, we’ll email the calendar link for choosing an exact available time. Your readiness report was sent separately before checkout.'
          : 'Stripe reports that the paid diagnostic was not completed. You can run the free readiness check again whenever you are ready; contact consent never becomes newsletter consent.'}
      </p>
    </section>
  )
}

export function ReadinessAssessment({
  assessmentEndpoint = '/api/readiness/assess',
  checkoutReturn = null,
  diagnosticEndpoint = '/api/diagnostics/requests',
  diagnosticIntent = false,
  initialProfile = 'ai_saas',
}: ReadinessAssessmentProps) {
  const [answers, setAnswers] = useState<Partial<ReadinessAnswers>>({})
  const [error, setError] = useState<string | null>(null)
  const [fallbackUsed, setFallbackUsed] = useState(true)
  const [handoffToken, setHandoffToken] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [profile, setProfile] = useState<ReadinessProfile>(initialProfile)
  const [report, setReport] = useState<ReadinessReport | null>(null)
  const [reportId, setReportId] = useState<string | null>(null)
  const [sectionIndex, setSectionIndex] = useState(0)
  const [symptom, setSymptom] = useState('')
  const [token] = useState(anonymousToken)
  const sectionHeading = useRef<HTMLHeadingElement>(null)
  const section = readinessSectionsV1[sectionIndex]
  const sectionQuestions = useMemo(
    () => readinessQuestionsV1.filter((question) => question.sectionId === section.id),
    [section.id],
  )
  const answeredCount = Object.keys(answers).length

  function updateAnswer(questionId: QuestionId, value: string) {
    setAnswers((current) => ({ ...current, [questionId]: value }))
    setError(null)
  }

  function moveToSection(nextIndex: number) {
    setSectionIndex(nextIndex)
    setError(null)
    requestAnimationFrame(() => sectionHeading.current?.focus())
  }

  function continueAssessment() {
    const unanswered = sectionQuestions.find((question) => !answers[question.id])

    if (unanswered) {
      setError('Choose one answer for every question in this section before continuing.')
      document.getElementById(`question-${unanswered.id}`)?.focus()
      return
    }

    moveToSection(sectionIndex + 1)
  }

  async function submitAssessment() {
    const unanswered = readinessQuestionsV1.find((question) => !answers[question.id])
    if (unanswered) {
      setSectionIndex(readinessSectionsV1.findIndex((item) => item.id === unanswered.sectionId))
      setError('Complete every controlled question before generating the report.')
      requestAnimationFrame(() => document.getElementById(`question-${unanswered.id}`)?.focus())
      return
    }

    const requestValue: ReadinessAssessmentRequest = {
      anonymousToken: token,
      answers: answers as ReadinessAnswers,
      policyVersion: readinessPolicyVersion,
      profile,
      ...(symptom.trim() ? { symptom } : {}),
    }
    const validation = validateReadinessAssessmentRequest(requestValue)

    if (!validation.ok) {
      const issue = validation.issues[0]
      setError(issue?.message ?? 'Review the assessment input and try again.')

      const question = issue?.path.startsWith('answers.')
        ? readinessQuestionsV1.find((item) => `answers.${item.id}` === issue.path)
        : undefined

      if (question) {
        setSectionIndex(readinessSectionsV1.findIndex((item) => item.id === question.sectionId))
        requestAnimationFrame(() => document.getElementById(`question-${question.id}`)?.focus())
      } else if (issue?.path === 'symptom') {
        requestAnimationFrame(() => document.getElementById('readiness-symptom')?.focus())
      }

      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch(assessmentEndpoint, {
        body: JSON.stringify(validation.value),
        cache: 'no-store',
        credentials: 'omit',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        method: 'POST',
        redirect: 'error',
      })
      const declaredLength = Number(response.headers.get('content-length'))
      if (Number.isFinite(declaredLength) && declaredLength > 512 * 1024) {
        throw new Error('oversized_response')
      }

      const body = await response.text()
      if (body.length > 512 * 1024) throw new Error('oversized_response')

      let data: unknown
      try {
        data = JSON.parse(body) as unknown
      } catch {
        throw new Error('invalid_response')
      }

      if (!response.ok) {
        const safeMessage =
          data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
            ? data.error
            : 'The assessment could not be processed. Please try again.'
        setError(safeMessage)
        return
      }

      if (!isAssessmentResponse(data)) throw new Error('invalid_response')

      setFallbackUsed(data.fallbackUsed)
      setHandoffToken(data.handoffToken)
      setReport(data.report)
      setReportId(data.reportId)
    } catch {
      setError(
        'The assessment service could not be reached. Your answers remain only in this browser; please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  function resetAssessment() {
    setAnswers({})
    setError(null)
    setHandoffToken(null)
    setReport(null)
    setReportId(null)
    setSectionIndex(0)
    setSymptom('')
    requestAnimationFrame(() => sectionHeading.current?.focus())
  }

  if (report && reportId) {
    return (
      <ResultView
        anonymousToken={token}
        checkoutReturn={checkoutReturn}
        diagnosticEndpoint={diagnosticEndpoint}
        diagnosticIntent={diagnosticIntent}
        fallbackUsed={fallbackUsed}
        handoffToken={handoffToken}
        onReset={resetAssessment}
        report={report}
        reportId={reportId}
      />
    )
  }

  return (
    <div className="page-shell readiness-page readiness-assessment">
      <header className="page-hero shell">
        <p className="eyebrow">SABERISTIC / PRODUCTION READINESS CHECK</p>
        <h1>Find the gate before it becomes the incident.</h1>
        <p className="page-hero__lede">
          Answer 20 controlled architecture questions. Get a defensible readiness level, hard
          blockers, unknowns, a 48-hour plan, and a two-week production plan.
        </p>
        <p className="readiness-trust-line">
          Scored by explicit controls. Explained by AI when the privacy-safe route is available.
        </p>
      </header>

      <div className="shell readiness-page__body">
        {checkoutReturn ? <CheckoutReturnNotice status={checkoutReturn} /> : null}

        {diagnosticIntent ? (
          <aside className="phase-notice" role="note">
            <p className="eyebrow">ARCHITECTURE DIAGNOSTIC</p>
            <p>
              Complete the readiness check first. The full result appears before any human-support
              option, and this assessment does not collect your name, email, or company.
            </p>
          </aside>
        ) : null}

        <section aria-labelledby="profile-heading">
          <div className="section-intro">
            <p className="eyebrow">01 / CHOOSE A PROFILE</p>
            <h2 id="profile-heading">What are you building?</h2>
            <p>
              The profile supplies context only. It cannot change an answer, score, blocker, or next
              step.
            </p>
          </div>
          <div className="readiness-profile-grid readiness-profile-grid--buttons">
            {(
              Object.entries(profileCards) as Array<
                [ReadinessProfile, (typeof profileCards)[ReadinessProfile]]
              >
            ).map(([id, card]) => (
              <button
                aria-pressed={profile === id}
                key={id}
                onClick={() => setProfile(id)}
                type="button"
              >
                <span aria-hidden="true">{card.number}</span>
                <strong>{card.label}</strong>
                <small>{card.description}</small>
              </button>
            ))}
          </div>
        </section>

        <section aria-labelledby="assessment-heading" className="readiness-wizard">
          <div className="readiness-progress">
            <div>
              <p className="eyebrow">02 / DECLARED CONTROLS</p>
              <span>
                Section {sectionIndex + 1} of {readinessSectionsV1.length} · {answeredCount} of{' '}
                {readinessQuestionsV1.length} answered
              </span>
            </div>
            <progress
              aria-label={`Assessment progress: section ${sectionIndex + 1} of ${readinessSectionsV1.length}`}
              max={readinessSectionsV1.length}
              value={sectionIndex + 1}
            >
              {sectionIndex + 1} of {readinessSectionsV1.length}
            </progress>
          </div>

          <div className="readiness-section-heading">
            <h2 id="assessment-heading" ref={sectionHeading} tabIndex={-1}>
              {section.label}
            </h2>
            <p>{section.description}</p>
          </div>

          <div className="readiness-question-list">
            {sectionQuestions.map((question, questionIndex) => (
              <fieldset id={`question-${question.id}`} key={question.id} tabIndex={-1}>
                <legend>
                  <span aria-hidden="true">
                    {String(section.questionIds.indexOf(question.id) + 1).padStart(2, '0')}
                  </span>
                  <strong>{question.label}</strong>
                  <small>{question.description}</small>
                </legend>
                <div className="readiness-answer-grid">
                  {question.options.map((option) => {
                    return (
                      <label key={option.value}>
                        <input
                          checked={answers[question.id] === option.value}
                          name={question.id}
                          onChange={() => updateAnswer(question.id, option.value)}
                          type="radio"
                          value={option.value}
                        />
                        <span>
                          <strong>{option.label}</strong>
                          <small>{option.description}</small>
                        </span>
                      </label>
                    )
                  })}
                </div>
                <span className="sr-only">Question {questionIndex + 1} in this section.</span>
              </fieldset>
            ))}
          </div>

          {sectionIndex === readinessSectionsV1.length - 1 ? (
            <div className="readiness-symptom">
              <label htmlFor="readiness-symptom">
                <strong>Optional: what is the single production symptom worrying you most?</strong>
                <small>
                  Keep it general. Do not paste code, credentials, logs, customer data, URLs, client
                  names, or confidential details.
                </small>
              </label>
              <textarea
                id="readiness-symptom"
                maxLength={500}
                onChange={(event) => {
                  setSymptom(event.target.value)
                  setError(null)
                }}
                rows={4}
                value={symptom}
              />
              <span>{symptom.length} / 500</span>
            </div>
          ) : null}

          {error ? (
            <p className="readiness-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="readiness-wizard-actions">
            {sectionIndex > 0 ? (
              <button
                className="button button--quiet"
                disabled={isSubmitting}
                onClick={() => moveToSection(sectionIndex - 1)}
                type="button"
              >
                Back
              </button>
            ) : (
              <span />
            )}
            {sectionIndex < readinessSectionsV1.length - 1 ? (
              <button className="button button--primary" onClick={continueAssessment} type="button">
                Continue
              </button>
            ) : (
              <button
                className="button button--primary"
                disabled={isSubmitting}
                onClick={submitAssessment}
                type="button"
              >
                {isSubmitting ? 'Validating the report…' : 'Generate readiness report'}
              </button>
            )}
          </div>
        </section>

        <aside aria-labelledby="ai-boundary-heading" className="ai-boundary">
          <p className="eyebrow">METHOD AND AI BOUNDARY</p>
          <h2 id="ai-boundary-heading">The model never owns the result.</h2>
          <p>
            Versioned application rules calculate the score, level, completeness, blocker set, and
            next step before any model call. OpenRouter can only explain and order approved actions.
            Invalid, unavailable, over-budget, or non-private model routing returns the same
            complete deterministic report.
          </p>
          <p className="safety-line">
            <span aria-hidden="true">◇</span> This is directional engineering guidance, not a
            security audit, compliance assessment, certification, or inspection of your system.
          </p>
          <Link className="button button--quiet" href="/privacy#readiness-processing-heading">
            Read the privacy boundary
          </Link>
        </aside>
      </div>
    </div>
  )
}
