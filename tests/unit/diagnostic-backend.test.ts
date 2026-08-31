import type Stripe from 'stripe'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/diagnostic/server/persistence', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/diagnostic/server/persistence')>()
  return {
    ...actual,
    payloadDiagnosticStore: {
      create: vi.fn(),
      findByRequestId: vi.fn(),
      findBySubmissionKey: vi.fn(),
      update: vi.fn(),
    },
  }
})

import {
  createDeterministicReadinessReport,
  readinessPolicyVersion,
  readinessQuestionsV1,
  scoreReadiness,
  type ReadinessAnswers,
  type ReadinessManifest,
  type ReadinessReport,
} from '@/lib/readiness'
import { diagnosticPrivacyNoticeVersion } from '@/lib/diagnostic'
import {
  resolveDiagnosticFulfillmentConfig,
  resolveDiagnosticProviderConfig,
  resolveDiagnosticWebhookConfig,
} from '@/lib/diagnostic/server/config'
import {
  buildCustomerReportEmail,
  buildInternalLeadEmail,
  sendDiagnosticEmail,
} from '@/lib/diagnostic/server/email'
import type {
  DiagnosticRequestCreate,
  DiagnosticRequestRecord,
  DiagnosticStore,
} from '@/lib/diagnostic/server/persistence'
import { handleDiagnosticRequest } from '@/lib/diagnostic/server/request-handler'
import {
  buildDiagnosticCheckoutParams,
  diagnosticAmountCents,
  diagnosticCheckoutLifetimeSeconds,
} from '@/lib/diagnostic/server/stripe'
import {
  handleDiagnosticStripeWebhook,
  paidDiagnosticCheckout,
} from '@/lib/diagnostic/server/webhook-handler'
import { validateDiagnosticRequest } from '@/lib/diagnostic/validation'

const nowMs = 1_800_000_000_000
const requestId = '123e4567-e89b-42d3-a456-426614174000'
const reportId = '9a7d3ff0-b3e5-4ef9-b24f-0781042a64ad'
const publicOrigin = 'https://saberistic.com'
const backendOrigin = 'https://saberistic-web.example'
const bookingUrl = 'https://calendar.example.com/saberistic/architecture-diagnostic'

function environment(overrides: Partial<NodeJS.ProcessEnv> = {}): NodeJS.ProcessEnv {
  return {
    DIAGNOSTIC_BOOKING_URL: bookingUrl,
    DIAGNOSTIC_ENABLED: '1',
    DIAGNOSTIC_RATE_LIMIT_SECRET: 'diagnostic-rate-limit-secret-at-least-32-characters',
    NODE_ENV: 'production',
    PUBLIC_SITE_URL: publicOrigin,
    REDIS_URL: 'redis://diagnostic.example:6379',
    RESEND_API_KEY: 're_testdiagnostic1234567890',
    RESEND_FROM_ADDRESS: 'diagnostic@saberistic.com',
    SITE_URL: backendOrigin,
    STRIPE_DIAGNOSTIC_RESTRICTED_KEY: 'rk_test_diagnostic1234567890',
    STRIPE_DIAGNOSTIC_WEBHOOK_SECRET: 'whsec_diagnostic1234567890',
    ...overrides,
  }
}

function report(): ReadinessReport {
  const answers = Object.fromEntries(
    readinessQuestionsV1.map((question) => [question.id, question.options[0]?.value]),
  ) as ReadinessAnswers
  const manifest: ReadinessManifest = {
    answers,
    policyVersion: readinessPolicyVersion,
    profile: 'ai_saas',
  }
  return createDeterministicReadinessReport(manifest, scoreReadiness(manifest))
}

function requestBody(readinessReport: ReadinessReport = report()) {
  return {
    anonymousToken: 'anonymous-token-1234567890',
    contact: {
      company: 'Example Labs',
      email: 'lead@example.com',
      name: 'Alex Example',
    },
    consent: {
      contact: true,
      privacy: true,
      privacyVersion: diagnosticPrivacyNoticeVersion,
    },
    context: 'We want to tighten the release boundary before launch.',
    handoffToken: `v2.${'a'.repeat(40)}.${'b'.repeat(40)}`,
    report: readinessReport,
    selectedBlockerIds: [],
    shareSummary: false,
    timeBand: 'afternoon',
    timeframe: 'next_two_weeks',
    timezone: 'America/New_York',
  }
}

function diagnosticRequest(body: unknown): Request {
  return new Request(`${backendOrigin}/api/diagnostics/requests`, {
    body: JSON.stringify(body),
    headers: {
      'cf-connecting-ip': '203.0.113.42',
      'Content-Type': 'application/json',
      Origin: publicOrigin,
    },
    method: 'POST',
  })
}

function stripeEvent(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Event {
  const session = {
    amount_total: diagnosticAmountCents,
    client_reference_id: requestId,
    currency: 'usd',
    id: 'cs_test_diagnostic123',
    metadata: { diagnostic_request_id: requestId },
    mode: 'payment',
    object: 'checkout.session',
    payment_intent: 'pi_diagnostic123',
    payment_status: 'paid',
    status: 'complete',
    ...overrides,
  } as Stripe.Checkout.Session

  return {
    api_version: '2026-07-29.dahlia',
    created: Math.floor(nowMs / 1_000),
    data: { object: session },
    id: 'evt_diagnostic123',
    livemode: false,
    object: 'event',
    pending_webhooks: 1,
    request: null,
    type: 'checkout.session.completed',
  } as Stripe.Event
}

describe('diagnostic request validation and configuration', () => {
  it('normalizes the strict public contract and accepts the current privacy notice', () => {
    const result = validateDiagnosticRequest(requestBody())
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('Expected a valid diagnostic fixture.')
    expect(result.value.contact.email).toBe('lead@example.com')
    expect(result.value.consent.privacyVersion).toBe('2026-08-31')
  })

  it('rejects blocker IDs when assessment sharing is off and rejects unknown fields', () => {
    expect(
      validateDiagnosticRequest({
        ...requestBody(),
        selectedBlockerIds: ['SEC-AUTHZ-001'],
      }).ok,
    ).toBe(false)
    expect(validateDiagnosticRequest({ ...requestBody(), amount: 1 }).ok).toBe(false)
  })

  it('fails closed unless every provider, rate-limit, and HTTPS setting is valid', () => {
    expect(resolveDiagnosticProviderConfig(environment())).toMatchObject({
      bookingUrl,
      publicSiteOrigin: publicOrigin,
      resendFrom: 'Saberistic <diagnostic@saberistic.com>',
    })
    expect(
      resolveDiagnosticProviderConfig(
        environment({ STRIPE_DIAGNOSTIC_RESTRICTED_KEY: 'sk_test_not_restricted' }),
      ),
    ).toBeNull()
    expect(
      resolveDiagnosticProviderConfig(
        environment({ DIAGNOSTIC_BOOKING_URL: 'http://calendar.test' }),
      ),
    ).toBeNull()
    expect(
      resolveDiagnosticProviderConfig(environment({ STRIPE_DIAGNOSTIC_WEBHOOK_SECRET: undefined })),
    ).toBeNull()
    expect(
      resolveDiagnosticWebhookConfig(
        environment({
          DIAGNOSTIC_BOOKING_URL: undefined,
          DIAGNOSTIC_ENABLED: '0',
          DIAGNOSTIC_RATE_LIMIT_SECRET: undefined,
          REDIS_URL: undefined,
          RESEND_API_KEY: undefined,
          RESEND_FROM_ADDRESS: undefined,
        }),
      ),
    ).not.toBeNull()
    expect(
      resolveDiagnosticFulfillmentConfig(
        environment({ DIAGNOSTIC_BOOKING_URL: undefined, RESEND_API_KEY: undefined }),
      ),
    ).toBeNull()
  })
})

describe('diagnostic Stripe and Resend boundaries', () => {
  it('builds a deterministic $200 Checkout using only opaque request metadata', () => {
    const requestConsentedAt = new Date(nowMs).toISOString()
    const first = buildDiagnosticCheckoutParams(requestId, publicOrigin, requestConsentedAt)
    const second = buildDiagnosticCheckoutParams(requestId, publicOrigin, requestConsentedAt)
    const item = first.line_items?.[0]
    if (!item || typeof item === 'string') throw new Error('Expected inline price data.')

    expect(item.price_data?.unit_amount).toBe(20_000)
    expect(item.price_data?.currency).toBe('usd')
    expect(first.metadata).toEqual({ diagnostic_request_id: requestId })
    expect(first.client_reference_id).toBe(requestId)
    expect(first.payment_intent_data?.metadata).toEqual({ diagnostic_request_id: requestId })
    expect(first).not.toHaveProperty('payment_method_types')
    expect(first).not.toHaveProperty('automatic_tax')
    expect(first.cancel_url).toBe(`${publicOrigin}/readiness/?checkout=canceled`)
    expect(first.success_url).toBe(`${publicOrigin}/readiness/?checkout=success`)
    expect(first.expires_at).toBe(Math.floor(nowMs / 1_000) + diagnosticCheckoutLifetimeSeconds)
    expect(second.expires_at).toBe(first.expires_at)
    expect(first.integration_identifier).toBe(second.integration_identifier)
    expect(first.integration_identifier).toMatch(/^saberistic_architecture_diagnostic_[a-z]{8}$/)
  })

  it('escapes customer HTML and keeps internal mail ID/type-only', () => {
    const unsafeReport = { ...report(), summary: '<img src=x onerror=alert(1)>' }
    const customer = buildCustomerReportEmail('<Alex>', 'lead@example.com', unsafeReport)
    const internal = buildInternalLeadEmail(requestId)

    expect(customer.html).toContain('&lt;Alex&gt;')
    expect(customer.html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(customer.html).not.toContain('<img src=x')
    expect(customer.attachments?.[0]?.filename).toBe('saberistic-readiness-report.json')
    expect(JSON.stringify(internal)).not.toContain('lead@example.com')
    expect(JSON.stringify(internal)).not.toContain('Alex')
    expect(internal.text).toContain(requestId)
    expect(internal.text).toContain('architecture_diagnostic')
  })

  it('sends through Resend with stable idempotency and required headers', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ id: 'email_diagnostic123' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }),
    )
    const config = resolveDiagnosticProviderConfig(environment())
    if (!config) throw new Error('Expected provider config.')

    await expect(
      sendDiagnosticEmail(
        buildInternalLeadEmail(requestId),
        `diagnostic-internal-${requestId}`,
        config,
        { fetch: fetchMock as typeof fetch },
      ),
    ).resolves.toBe('email_diagnostic123')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Idempotency-Key': `diagnostic-internal-${requestId}`,
          'User-Agent': 'saberistic-diagnostic/1.0',
        }),
        method: 'POST',
      }),
    )
  })
})

describe('diagnostic request and paid webhook workflows', () => {
  let currentRecord: DiagnosticRequestRecord | null
  let store: DiagnosticStore

  beforeEach(() => {
    currentRecord = null
    store = {
      create: vi.fn(async (data: DiagnosticRequestCreate) => {
        currentRecord = { ...data, id: 1 }
        return currentRecord
      }),
      findByRequestId: vi.fn(async (id: string) =>
        currentRecord?.requestId === id ? currentRecord : null,
      ),
      findBySubmissionKey: vi.fn(async (key: string) =>
        currentRecord?.submissionKey === key ? currentRecord : null,
      ),
      update: vi.fn(async (_id, data): Promise<DiagnosticRequestRecord> => {
        const existing = currentRecord
        if (!existing) throw new Error('missing fixture record')
        const updated: DiagnosticRequestRecord = { ...existing, ...data }
        currentRecord = updated
        return updated
      }),
    }
  })

  it('persists only selected lead data, opens Checkout, and sends two idempotent emails', async () => {
    const readinessReport = report()
    const providerOrder: string[] = []
    const sendEmail = vi
      .fn<typeof sendDiagnosticEmail>()
      .mockImplementationOnce(async () => {
        providerOrder.push('email')
        return 'email_customer_report'
      })
      .mockImplementationOnce(async () => {
        providerOrder.push('email')
        return 'email_internal_notice'
      })

    const response = await handleDiagnosticRequest(
      diagnosticRequest(requestBody(readinessReport)),
      {
        authorize: async () => ({ allowed: true }),
        createCheckout: async () => {
          providerOrder.push('checkout')
          return {
            checkoutUrl: 'https://checkout.stripe.com/c/pay_diagnostic',
            sessionId: 'cs_test_diagnostic123',
          }
        },
        environment: environment(),
        now: () => nowMs,
        randomUUID: () => requestId,
        sendEmail,
        store,
        verifyHandoff: () => ({
          claims: {
            blockerIds: readinessReport.blockers.map((blocker) => blocker.ruleId),
            expiresAt: Math.floor(nowMs / 1_000) + 1_800,
            issuedAt: Math.floor(nowMs / 1_000),
            level: readinessReport.level,
            policyVersion: readinessReport.policyVersion,
            reportDigest: 'a'.repeat(64),
            reportId,
            version: 2,
          },
          ok: true,
        }),
      },
    )

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({
      checkoutUrl: 'https://checkout.stripe.com/c/pay_diagnostic',
      requestId,
    })
    expect(currentRecord).not.toHaveProperty('report')
    expect(currentRecord).not.toHaveProperty('anonymousToken')
    expect(currentRecord?.reportId).toBe(reportId)
    expect(currentRecord?.stripeCheckoutSessionId).toBe('cs_test_diagnostic123')
    expect(sendEmail).toHaveBeenCalledTimes(2)
    expect(sendEmail.mock.calls.map((call) => call[1])).toEqual([
      `diagnostic-report-${requestId}`,
      `diagnostic-internal-${requestId}`,
    ])
    expect(providerOrder).toEqual(['email', 'email', 'checkout'])
  })

  it('rate-limits a syntactically valid request before verifying its handoff', async () => {
    const verifyHandoff = vi.fn()
    const response = await handleDiagnosticRequest(diagnosticRequest(requestBody()), {
      authorize: async () => ({ allowed: false, reason: 'token' }),
      environment: environment(),
      verifyHandoff,
    })

    expect(response.status).toBe(429)
    expect(verifyHandoff).not.toHaveBeenCalled()
    expect(store.create).not.toHaveBeenCalled()
  })

  it('accepts Payload array row IDs while preserving the selected blocker consent', async () => {
    const readinessReport = report()
    const selectedRuleId = 'SEC-AUTHZ-001' as const
    const arrayStore: DiagnosticStore = {
      ...store,
      create: vi.fn(async (data: DiagnosticRequestCreate): Promise<DiagnosticRequestRecord> => {
        const created: DiagnosticRequestRecord = {
          ...data,
          id: 3,
          selectedBlockers: data.selectedBlockers.map((blocker) => ({
            ...blocker,
            id: 'payload-array-row-id',
          })),
        }
        currentRecord = created
        return created
      }),
    }
    const response = await handleDiagnosticRequest(
      diagnosticRequest({
        ...requestBody(readinessReport),
        selectedBlockerIds: [selectedRuleId],
        shareSummary: true,
      }),
      {
        authorize: async () => ({ allowed: true }),
        createCheckout: async () => ({
          checkoutUrl: 'https://checkout.stripe.com/c/pay_selected_blocker',
          sessionId: 'cs_test_selectedblocker123',
        }),
        environment: environment(),
        now: () => nowMs,
        randomUUID: () => requestId,
        sendEmail: vi.fn().mockResolvedValue('email_selected_blocker'),
        store: arrayStore,
        verifyHandoff: () => ({
          claims: {
            blockerIds: [selectedRuleId],
            expiresAt: Math.floor(nowMs / 1_000) + 1_800,
            issuedAt: Math.floor(nowMs / 1_000),
            level: readinessReport.level,
            policyVersion: readinessReport.policyVersion,
            reportDigest: 'a'.repeat(64),
            reportId,
            version: 2,
          },
          ok: true,
        }),
      },
    )

    expect(response.status).toBe(201)
    expect(currentRecord?.selectedBlockers[0]).toMatchObject({ ruleId: selectedRuleId })
  })

  it('deduplicates by signed report ID even when the anonymous rate-limit token rotates', async () => {
    const readinessReport = report()
    let requestNowMs = nowMs
    const sendEmail = vi.fn<typeof sendDiagnosticEmail>().mockResolvedValue('email_replay_safe')
    const createCheckout = vi.fn(
      async (_checkoutRequestId: string, _config: unknown, _requestConsentedAt: string) => ({
        checkoutUrl: 'https://checkout.stripe.com/c/pay_replay_safe',
        sessionId: 'cs_test_replaysafe123',
      }),
    )
    const verifyHandoff = () => ({
      claims: {
        blockerIds: readinessReport.blockers.map((blocker) => blocker.ruleId),
        expiresAt: Math.floor(nowMs / 1_000) + 1_800,
        issuedAt: Math.floor(nowMs / 1_000),
        level: readinessReport.level,
        policyVersion: readinessReport.policyVersion,
        reportDigest: 'a'.repeat(64),
        reportId,
        version: 2 as const,
      },
      ok: true as const,
    })
    const dependencies = {
      authorize: async () => ({ allowed: true as const }),
      createCheckout,
      environment: environment(),
      now: () => requestNowMs,
      randomUUID: () => requestId,
      sendEmail,
      store,
      verifyHandoff,
    }

    const first = await handleDiagnosticRequest(
      diagnosticRequest(requestBody(readinessReport)),
      dependencies,
    )
    requestNowMs += 5 * 60 * 1_000
    const replayBody = {
      ...requestBody(readinessReport),
      anonymousToken: 'rotated-anonymous-token-1234567890',
    }
    const exactReplay = await handleDiagnosticRequest(diagnosticRequest(replayBody), dependencies)
    const changedContactReplay = await handleDiagnosticRequest(
      diagnosticRequest({
        ...replayBody,
        contact: { ...replayBody.contact, email: 'another@example.com' },
      }),
      dependencies,
    )

    expect(first.status).toBe(201)
    expect(exactReplay.status).toBe(200)
    expect(changedContactReplay.status).toBe(409)
    expect(store.create).toHaveBeenCalledTimes(1)
    expect(sendEmail).toHaveBeenCalledTimes(2)
    expect(createCheckout).toHaveBeenCalledTimes(2)
    expect(createCheckout.mock.calls.map((call) => call[2])).toEqual([
      new Date(nowMs).toISOString(),
      new Date(nowMs).toISOString(),
    ])
  })

  it('accepts only the fixed paid Checkout and marks it ready for time selection', async () => {
    const data: DiagnosticRequestCreate = {
      additionalContext: 'Context',
      bookingStatus: 'awaiting_payment',
      consentedAt: new Date(nowMs).toISOString(),
      contactConsent: true,
      email: 'lead@example.com',
      name: 'Alex Example',
      paymentStatus: 'pending',
      policyVersion: readinessPolicyVersion,
      privacyNoticeVersion: diagnosticPrivacyNoticeVersion,
      readinessLevel: 'internal_beta',
      reportId,
      requestId,
      requestType: 'architecture_diagnostic',
      retentionReviewAt: new Date(nowMs + 1_000).toISOString(),
      selectedBlockers: [],
      shareAssessmentSummary: false,
      submissionKey: 'a'.repeat(64),
      timeBand: 'afternoon',
      timeframe: 'next_two_weeks',
      timeZone: 'America/New_York',
      workflowStatus: 'new',
    }
    currentRecord = { ...data, id: 1, stripeCheckoutSessionId: 'cs_test_diagnostic123' }
    const sendEmail = vi
      .fn<typeof sendDiagnosticEmail>()
      .mockResolvedValueOnce('email_customer_paid')
      .mockResolvedValueOnce('email_internal_paid')

    expect(paidDiagnosticCheckout(stripeEvent())).toMatchObject({ requestId })
    expect(paidDiagnosticCheckout(stripeEvent({ amount_total: 19_999 }))).toBeNull()
    expect(
      paidDiagnosticCheckout(
        stripeEvent({ metadata: { diagnostic_request_id: requestId, leaked_email: 'x@y.test' } }),
      ),
    ).toBeNull()

    const response = await handleDiagnosticStripeWebhook(
      new Request(`${backendOrigin}/api/stripe/diagnostic-webhook`, {
        body: '{"signed":true}',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 't=1800000000,v1=signature',
        },
        method: 'POST',
      }),
      {
        environment: environment(),
        now: () => nowMs,
        sendEmail,
        store,
        verifyEvent: () => stripeEvent(),
      },
    )

    expect(response.status).toBe(200)
    expect(currentRecord?.paymentStatus).toBe('paid')
    expect(currentRecord?.bookingStatus).toBe('awaiting_selection')
    expect(currentRecord?.stripePaymentIntentId).toBe('pi_diagnostic123')
    expect(sendEmail.mock.calls.map((call) => call[1])).toEqual([
      `diagnostic-paid-customer-${requestId}`,
      `diagnostic-paid-internal-${requestId}`,
    ])
    expect(JSON.stringify(sendEmail.mock.calls[1]?.[0])).not.toContain('lead@example.com')
  })

  it('acknowledges delayed payment completion without fulfilling or requiring sales to stay enabled', async () => {
    const data: DiagnosticRequestCreate = {
      bookingStatus: 'awaiting_payment',
      consentedAt: new Date(nowMs).toISOString(),
      contactConsent: true,
      email: 'lead@example.com',
      name: 'Alex Example',
      paymentStatus: 'pending',
      policyVersion: readinessPolicyVersion,
      privacyNoticeVersion: diagnosticPrivacyNoticeVersion,
      readinessLevel: 'internal_beta',
      reportId,
      requestId,
      requestType: 'architecture_diagnostic',
      retentionReviewAt: new Date(nowMs + 1_000).toISOString(),
      selectedBlockers: [],
      shareAssessmentSummary: false,
      submissionKey: 'b'.repeat(64),
      timeBand: 'flexible',
      timeframe: 'this_month',
      timeZone: 'America/New_York',
      workflowStatus: 'new',
    }
    currentRecord = { ...data, id: 2, stripeCheckoutSessionId: 'cs_test_diagnostic123' }

    const response = await handleDiagnosticStripeWebhook(
      new Request(`${backendOrigin}/api/stripe/diagnostic-webhook`, {
        body: '{"signed":true}',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 't=1800000000,v1=signature',
        },
        method: 'POST',
      }),
      {
        environment: environment({
          DIAGNOSTIC_ENABLED: '0',
          DIAGNOSTIC_RATE_LIMIT_SECRET: undefined,
          REDIS_URL: undefined,
        }),
        sendEmail: vi.fn(),
        store,
        verifyEvent: () => stripeEvent({ payment_status: 'unpaid' }),
      },
    )

    expect(response.status).toBe(200)
    expect(currentRecord.paymentStatus).toBe('pending')
    expect(store.update).not.toHaveBeenCalled()
  })

  it('records a verified payment before returning a retryable fulfillment-config error', async () => {
    const data: DiagnosticRequestCreate = {
      bookingStatus: 'awaiting_payment',
      consentedAt: new Date(nowMs).toISOString(),
      contactConsent: true,
      email: 'lead@example.com',
      name: 'Alex Example',
      paymentStatus: 'pending',
      policyVersion: readinessPolicyVersion,
      privacyNoticeVersion: diagnosticPrivacyNoticeVersion,
      readinessLevel: 'internal_beta',
      reportId,
      requestId,
      requestType: 'architecture_diagnostic',
      retentionReviewAt: new Date(nowMs + 1_000).toISOString(),
      selectedBlockers: [],
      shareAssessmentSummary: false,
      submissionKey: 'c'.repeat(64),
      timeBand: 'morning',
      timeframe: 'this_week',
      timeZone: 'America/New_York',
      workflowStatus: 'new',
    }
    currentRecord = { ...data, id: 4, stripeCheckoutSessionId: 'cs_test_diagnostic123' }
    const sendEmail = vi.fn()

    const response = await handleDiagnosticStripeWebhook(
      new Request(`${backendOrigin}/api/stripe/diagnostic-webhook`, {
        body: '{"signed":true}',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 't=1800000000,v1=signature',
        },
        method: 'POST',
      }),
      {
        environment: environment({
          DIAGNOSTIC_BOOKING_URL: undefined,
          DIAGNOSTIC_ENABLED: '0',
          DIAGNOSTIC_RATE_LIMIT_SECRET: undefined,
          REDIS_URL: undefined,
          RESEND_API_KEY: undefined,
          RESEND_FROM_ADDRESS: undefined,
        }),
        now: () => nowMs,
        sendEmail,
        store,
        verifyEvent: () => stripeEvent(),
      },
    )

    expect(response.status).toBe(500)
    expect(currentRecord.paymentStatus).toBe('paid')
    expect(currentRecord.bookingStatus).toBe('awaiting_selection')
    expect(sendEmail).not.toHaveBeenCalled()
  })
})
