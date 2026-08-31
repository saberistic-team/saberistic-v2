import 'server-only'

import { createHmac, randomUUID } from 'node:crypto'

import { readinessBlockersV1 } from '@/lib/readiness'
import { verifyReadinessReportHandoff } from '@/lib/readiness/server/handoff-token'

import { validateDiagnosticRequest } from '../validation'
import { resolveDiagnosticProviderConfig } from './config'
import { buildCustomerReportEmail, buildInternalLeadEmail, sendDiagnosticEmail } from './email'
import {
  DiagnosticBodyFailure,
  diagnosticHeaders,
  diagnosticJSONResponse,
  diagnosticMediaType,
  readBoundedDiagnosticText,
  validatedDiagnosticOrigin,
} from './http'
import {
  payloadDiagnosticStore,
  type DiagnosticRequestCreate,
  type DiagnosticRequestRecord,
  type DiagnosticRequestUpdate,
  type DiagnosticStore,
} from './persistence'
import {
  authorizeDiagnosticRequest,
  diagnosticClientAddress,
  type DiagnosticRateLimitResult,
} from './rate-limit'
import { createDiagnosticCheckout, type DiagnosticCheckout } from './stripe'

const maximumRequestBytes = 192 * 1024
const retentionReviewDays = 90

type RequestHandlerDependencies = {
  authorize?: (context: {
    anonymousToken: string
    clientAddress: string
  }) => Promise<DiagnosticRateLimitResult>
  createCheckout?: (
    requestId: string,
    config: NonNullable<ReturnType<typeof resolveDiagnosticProviderConfig>>,
    requestConsentedAt: string,
  ) => Promise<DiagnosticCheckout>
  environment?: NodeJS.ProcessEnv
  now?: () => number
  randomUUID?: () => string
  sendEmail?: typeof sendDiagnosticEmail
  store?: DiagnosticStore
  verifyHandoff?: typeof verifyReadinessReportHandoff
}

function validUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function submissionKey(reportId: string, environment: NodeJS.ProcessEnv): string | null {
  const secret = environment.DIAGNOSTIC_RATE_LIMIT_SECRET?.trim()
  if (!secret || secret.length < 32 || secret.startsWith('replace-with-')) return null
  return createHmac('sha256', secret).update(`diagnostic-submission:v1:${reportId}`).digest('hex')
}

function canonicalSelectedBlockers(value: unknown): string | null {
  if (!Array.isArray(value)) return null
  const blockers: Array<{ label: string; ruleId: string }> = []
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null
    const record = item as Record<string, unknown>
    if (typeof record.ruleId !== 'string' || typeof record.label !== 'string') return null
    blockers.push({ label: record.label, ruleId: record.ruleId })
  }
  blockers.sort((left, right) => left.ruleId.localeCompare(right.ruleId))
  return JSON.stringify(blockers)
}

function sameImmutableSubmission(
  record: DiagnosticRequestRecord,
  expected: DiagnosticRequestCreate,
): boolean {
  return (
    record.submissionKey === expected.submissionKey &&
    record.reportId === expected.reportId &&
    record.email.toLowerCase() === expected.email &&
    record.name === expected.name &&
    (record.company ?? undefined) === expected.company &&
    (record.additionalContext ?? undefined) === expected.additionalContext &&
    record.policyVersion === expected.policyVersion &&
    record.readinessLevel === expected.readinessLevel &&
    record.shareAssessmentSummary === expected.shareAssessmentSummary &&
    canonicalSelectedBlockers(record.selectedBlockers) ===
      canonicalSelectedBlockers(expected.selectedBlockers) &&
    record.contactConsent === true &&
    record.privacyNoticeVersion === expected.privacyNoticeVersion &&
    record.timeframe === expected.timeframe &&
    record.timeBand === expected.timeBand &&
    record.timeZone === expected.timeZone
  )
}

async function getOrCreateRequest(
  data: DiagnosticRequestCreate,
  store: DiagnosticStore,
): Promise<{ created: boolean; record: DiagnosticRequestRecord }> {
  const existing = await store.findBySubmissionKey(data.submissionKey)
  if (existing) return { created: false, record: existing }

  try {
    return { created: true, record: await store.create(data) }
  } catch {
    const raced = await store.findBySubmissionKey(data.submissionKey)
    if (!raced) throw new Error('diagnostic_create_failed')
    return { created: false, record: raced }
  }
}

export function handleDiagnosticOptions(
  request: Request,
  environment: NodeJS.ProcessEnv = process.env,
): Response {
  const origin = validatedDiagnosticOrigin(request, environment)
  if (!origin) {
    return diagnosticJSONResponse(null, { error: 'Request origin is not allowed.' }, 403)
  }
  return new Response(null, { headers: diagnosticHeaders(origin), status: 204 })
}

export async function handleDiagnosticRequest(
  request: Request,
  dependencies: RequestHandlerDependencies = {},
): Promise<Response> {
  const environment = dependencies.environment ?? process.env
  const now = dependencies.now ?? Date.now
  const origin = validatedDiagnosticOrigin(request, environment)
  if (!origin) {
    return diagnosticJSONResponse(null, { error: 'Request origin is not allowed.' }, 403)
  }
  if (diagnosticMediaType(request) !== 'application/json') {
    return diagnosticJSONResponse(origin, { error: 'Send the diagnostic request as JSON.' }, 415)
  }

  let rawBody: string
  try {
    rawBody = await readBoundedDiagnosticText(request, maximumRequestBytes)
  } catch (error) {
    const oversized = error instanceof DiagnosticBodyFailure && error.reason === 'oversized'
    return diagnosticJSONResponse(
      origin,
      {
        error: oversized ? 'The diagnostic request is too large.' : 'The request body is invalid.',
      },
      oversized ? 413 : 400,
    )
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawBody)
  } catch {
    return diagnosticJSONResponse(origin, { error: 'The request body is invalid.' }, 400)
  }

  const validation = validateDiagnosticRequest(parsed)
  if (!validation.ok) {
    return diagnosticJSONResponse(
      origin,
      { error: validation.issues[0]?.message ?? 'Review the request and try again.' },
      400,
    )
  }

  const nowMs = now()
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) {
    return diagnosticJSONResponse(origin, { error: 'The diagnostic service is unavailable.' }, 503)
  }

  const config = resolveDiagnosticProviderConfig(environment)
  if (!config) {
    return diagnosticJSONResponse(
      origin,
      { error: 'Architecture diagnostic checkout is not configured.' },
      503,
    )
  }

  const clientAddress = diagnosticClientAddress(request, environment)
  if (!clientAddress) {
    return diagnosticJSONResponse(origin, { error: 'The diagnostic service is unavailable.' }, 503)
  }
  let rateLimit: DiagnosticRateLimitResult
  try {
    rateLimit = dependencies.authorize
      ? await dependencies.authorize({
          anonymousToken: validation.value.anonymousToken,
          clientAddress,
        })
      : await authorizeDiagnosticRequest(
          { anonymousToken: validation.value.anonymousToken, clientAddress },
          { environment },
        )
  } catch {
    rateLimit = { allowed: false, reason: 'unavailable' }
  }
  if (!rateLimit.allowed) {
    return diagnosticJSONResponse(
      origin,
      {
        error:
          rateLimit.reason === 'unavailable'
            ? 'The diagnostic service is temporarily unavailable.'
            : 'Too many diagnostic requests. Try again later.',
      },
      rateLimit.reason === 'unavailable' ? 503 : 429,
    )
  }

  let handoff: ReturnType<typeof verifyReadinessReportHandoff>
  try {
    handoff = (dependencies.verifyHandoff ?? verifyReadinessReportHandoff)(
      validation.value.handoffToken,
      validation.value.report,
      environment,
      nowMs,
    )
  } catch {
    handoff = { ok: false, reason: 'report_mismatch' }
  }
  if (!handoff.ok) {
    return diagnosticJSONResponse(
      origin,
      {
        error:
          handoff.reason === 'unavailable'
            ? 'The secure assessment handoff is unavailable.'
            : 'That readiness report handoff is invalid or expired. Run the assessment again.',
      },
      handoff.reason === 'unavailable' ? 503 : 409,
    )
  }

  const signedBlockerIds = new Set<string>(handoff.claims.blockerIds)
  if (!validation.value.selectedBlockerIds.every((blockerId) => signedBlockerIds.has(blockerId))) {
    return diagnosticJSONResponse(
      origin,
      { error: 'A selected blocker is not present in the signed readiness report.' },
      409,
    )
  }

  const deterministicSubmissionKey = submissionKey(handoff.claims.reportId, environment)
  const generatedRequestId = (dependencies.randomUUID ?? randomUUID)()
  if (!deterministicSubmissionKey || !validUUID(generatedRequestId)) {
    return diagnosticJSONResponse(origin, { error: 'The diagnostic service is unavailable.' }, 503)
  }

  const blockerById = new Map(
    readinessBlockersV1.map((blocker) => [blocker.ruleId, blocker.label] as const),
  )
  const selectedBlockers = validation.value.selectedBlockerIds
    .map((ruleId) => ({
      label: blockerById.get(ruleId) ?? ruleId,
      ruleId,
    }))
    .sort((left, right) => left.ruleId.localeCompare(right.ruleId))
  const instant = new Date(nowMs)
  const retentionReview = new Date(nowMs + retentionReviewDays * 24 * 60 * 60 * 1_000)
  const store = dependencies.store ?? payloadDiagnosticStore
  const createData: DiagnosticRequestCreate = {
    ...(validation.value.contact.company ? { company: validation.value.contact.company } : {}),
    ...(validation.value.context ? { additionalContext: validation.value.context } : {}),
    bookingStatus: 'awaiting_payment',
    consentedAt: instant.toISOString(),
    contactConsent: true,
    email: validation.value.contact.email,
    name: validation.value.contact.name,
    paymentStatus: 'pending',
    policyVersion: handoff.claims.policyVersion,
    privacyNoticeVersion: validation.value.consent.privacyVersion,
    readinessLevel: handoff.claims.level,
    reportId: handoff.claims.reportId,
    requestId: generatedRequestId,
    requestType: 'architecture_diagnostic',
    retentionReviewAt: retentionReview.toISOString(),
    selectedBlockers,
    shareAssessmentSummary: validation.value.shareSummary,
    submissionKey: deterministicSubmissionKey,
    timeBand: validation.value.timeBand,
    timeframe: validation.value.timeframe,
    timeZone: validation.value.timezone,
    workflowStatus: 'new',
  }

  let created: boolean
  let record: DiagnosticRequestRecord
  try {
    const persisted = await getOrCreateRequest(createData, store)
    created = persisted.created
    record = persisted.record
  } catch {
    return diagnosticJSONResponse(
      origin,
      { error: 'The diagnostic request could not be saved. No payment was taken.' },
      500,
    )
  }

  if (!sameImmutableSubmission(record, createData)) {
    return diagnosticJSONResponse(
      origin,
      { error: 'This assessment handoff is already associated with another request.' },
      409,
    )
  }

  const sendEmail = dependencies.sendEmail ?? sendDiagnosticEmail
  const pendingEmails: Array<{
    field: 'customerReportEmailId' | 'internalNotificationEmailId'
    sentAt: 'customerReportSentAt' | 'internalNotificationSentAt'
    task: Promise<string>
  }> = []
  if (!record.customerReportEmailId) {
    pendingEmails.push({
      field: 'customerReportEmailId',
      sentAt: 'customerReportSentAt',
      task: sendEmail(
        buildCustomerReportEmail(record.name, record.email, validation.value.report),
        `diagnostic-report-${record.requestId}`,
        config,
      ),
    })
  }
  if (!record.internalNotificationEmailId) {
    pendingEmails.push({
      field: 'internalNotificationEmailId',
      sentAt: 'internalNotificationSentAt',
      task: sendEmail(
        buildInternalLeadEmail(record.requestId),
        `diagnostic-internal-${record.requestId}`,
        config,
      ),
    })
  }

  const results = await Promise.allSettled(pendingEmails.map((email) => email.task))
  const emailUpdates: DiagnosticRequestUpdate = {}
  let emailFailed = false
  results.forEach((result, index) => {
    const pending = pendingEmails[index]
    if (!pending) return
    if (result.status === 'rejected') {
      emailFailed = true
      return
    }
    emailUpdates[pending.field] = result.value
    emailUpdates[pending.sentAt] = instant.toISOString()
  })

  if (Object.keys(emailUpdates).length > 0) {
    try {
      record = await store.update(record.id, emailUpdates)
    } catch {
      return diagnosticJSONResponse(
        origin,
        { error: 'The request was saved, but its email status could not be confirmed.' },
        500,
      )
    }
  }
  if (emailFailed) {
    return diagnosticJSONResponse(
      origin,
      { error: 'The request was saved, but the report email could not be completed.' },
      502,
    )
  }

  let checkout: DiagnosticCheckout
  try {
    checkout = await (dependencies.createCheckout ?? createDiagnosticCheckout)(
      record.requestId,
      config,
      record.consentedAt,
    )
    if (record.stripeCheckoutSessionId && record.stripeCheckoutSessionId !== checkout.sessionId) {
      throw new Error('stripe_session_changed')
    }
    if (!record.stripeCheckoutSessionId) {
      record = await store.update(record.id, {
        stripeCheckoutSessionId: checkout.sessionId,
      })
    }
  } catch {
    return diagnosticJSONResponse(
      origin,
      {
        error:
          'Your report and request were delivered, but secure checkout could not be prepared. No payment was taken.',
      },
      502,
    )
  }

  return diagnosticJSONResponse(
    origin,
    { checkoutUrl: checkout.checkoutUrl, requestId: record.requestId },
    created ? 201 : 200,
  )
}
