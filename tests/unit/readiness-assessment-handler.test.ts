import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  readinessPolicyVersion,
  readinessQuestionsV1,
  type ReadinessAnswers,
  type ReadinessAssessmentRequest,
} from '@/lib/readiness'
import {
  handleReadinessAssessment,
  handleReadinessOptions,
} from '@/lib/readiness/server/assessment-handler'

type HandlerDependencies = NonNullable<Parameters<typeof handleReadinessAssessment>[1]>
type AuthorizeAI = NonNullable<HandlerDependencies['authorizeAI']>
type EnhanceReport = NonNullable<HandlerDependencies['enhanceReport']>
type RecordRejectedSubmission = NonNullable<HandlerDependencies['recordRejectedSubmission']>

const apiURL = 'https://api.example/api/readiness/assess'
const publicOrigin = 'https://public.example'
const reportId = '123e4567-e89b-42d3-a456-426614174000'
const nowMs = 1_800_000_000_000
const anonymousToken = 'raw-anonymous-token-1234567890'
const symptom = 'A private release symptom remains unresolved.'

const validAnswers = Object.fromEntries(
  readinessQuestionsV1.map((question) => [question.id, question.options[0]?.value]),
) as ReadinessAnswers

const validAssessment = (): ReadinessAssessmentRequest => ({
  anonymousToken,
  answers: { ...validAnswers },
  policyVersion: readinessPolicyVersion,
  profile: 'ai_saas',
  symptom,
})

const baseEnvironment = (): NodeJS.ProcessEnv => ({
  NODE_ENV: 'production',
  PUBLIC_SITE_URL: publicOrigin,
  READINESS_HANDOFF_SECRET: 'test-handoff-secret-that-is-at-least-32-characters',
})

const configuredAIEnvironment = (): NodeJS.ProcessEnv => ({
  ...baseEnvironment(),
  AI_ENHANCEMENT_ENABLED: '1',
  OPENROUTER_ACCOUNT_GATES_CONFIRMED: '2026-09-01.1',
  OPENROUTER_API_KEY: 'private-test-openrouter-key',
  OPENROUTER_FALLBACK_MODEL: 'anthropic/claude-sonnet-4.5',
  OPENROUTER_PRIMARY_MODEL: 'openai/gpt-5.1',
})

function postRequest(
  body: BodyInit | null = JSON.stringify(validAssessment()),
  headers: HeadersInit = {},
): Request {
  return new Request(apiURL, {
    body,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'CF-Connecting-IP': '203.0.113.42',
      Origin: publicOrigin,
      'X-Forwarded-For': '198.51.100.250, 198.51.100.8',
      ...headers,
    },
    method: 'POST',
  })
}

function handlerDependencies(overrides: HandlerDependencies = {}): HandlerDependencies {
  return {
    environment: baseEnvironment(),
    log: vi.fn(),
    now: () => nowMs,
    randomUUID: () => reportId,
    ...overrides,
  }
}

async function responseJSON(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>
}

function expectSafeResponseHeaders(response: Response, origin = publicOrigin) {
  expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin)
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  expect(response.headers.get('Content-Type')).toContain('application/json')
  expect(response.headers.get('Vary')).toBe('Origin')
  expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
}

describe('readiness assessment preflight', () => {
  it('returns a body-free 204 with the narrow CORS contract for an allowed origin', () => {
    const request = new Request(apiURL, { headers: { Origin: publicOrigin }, method: 'OPTIONS' })
    const response = handleReadinessOptions(request, baseEnvironment())

    expect(response.status).toBe(204)
    expect(response.body).toBeNull()
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(publicOrigin)
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type')
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS')
    expect(response.headers.get('Access-Control-Max-Age')).toBe('600')
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('Vary')).toBe('Origin')
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })

  it.each([undefined, 'https://attacker.example'])(
    'rejects a missing or untrusted preflight Origin: %j',
    async (origin) => {
      const request = new Request(apiURL, {
        headers: origin ? { Origin: origin } : undefined,
        method: 'OPTIONS',
      })
      const response = handleReadinessOptions(request, baseEnvironment())

      expect(response.status).toBe(403)
      expect(response.headers.has('Access-Control-Allow-Origin')).toBe(false)
      expect(response.headers.get('Cache-Control')).toBe('no-store')
      await expect(responseJSON(response)).resolves.toEqual({
        error: 'Request origin is not allowed.',
      })
    },
  )
})

describe('readiness assessment request boundary', () => {
  it.each([undefined, 'https://evil.example'])(
    'rejects a missing or untrusted Origin before reading the body: %j',
    async (origin) => {
      const log = vi.fn()
      const headers = new Headers({ 'Content-Type': 'application/json' })
      if (origin) headers.set('Origin', origin)
      const request = new Request(apiURL, {
        body: JSON.stringify(validAssessment()),
        headers,
        method: 'POST',
      })
      const response = await handleReadinessAssessment(request, handlerDependencies({ log }))

      expect(response.status).toBe(403)
      expect(response.headers.has('Access-Control-Allow-Origin')).toBe(false)
      expect(log).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: 'rejected', reason: 'origin', requestId: reportId }),
      )
    },
  )

  it.each([undefined, 'text/plain', 'application/problem+json'])(
    'requires the application/json media type: %j',
    async (contentType) => {
      const headers = new Headers({ Origin: publicOrigin })
      if (contentType) headers.set('Content-Type', contentType)
      const request = new Request(apiURL, {
        body: JSON.stringify(validAssessment()),
        headers,
        method: 'POST',
      })
      const response = await handleReadinessAssessment(request, handlerDependencies())

      expect(response.status).toBe(415)
      expectSafeResponseHeaders(response)
      await expect(responseJSON(response)).resolves.toEqual({
        error: 'Send the assessment as JSON.',
      })
    },
  )

  it('rejects a declared body larger than the cap', async () => {
    const response = await handleReadinessAssessment(
      postRequest('{}', { 'Content-Length': String(32 * 1024 + 1) }),
      handlerDependencies(),
    )

    expect(response.status).toBe(413)
    expectSafeResponseHeaders(response)
    await expect(responseJSON(response)).resolves.toEqual({
      error: 'The assessment request is too large.',
    })
  })

  it('rejects an actually oversized streamed body when no length is declared', async () => {
    const response = await handleReadinessAssessment(
      postRequest('x'.repeat(32 * 1024 + 1)),
      handlerDependencies(),
    )

    expect(response.status).toBe(413)
    await expect(responseJSON(response)).resolves.toEqual({
      error: 'The assessment request is too large.',
    })
  })

  it.each([
    ['empty', null],
    ['invalid UTF-8', new Uint8Array([0xc3, 0x28])],
  ] as const)('rejects an %s request body', async (_caseName, body) => {
    const response = await handleReadinessAssessment(postRequest(body), handlerDependencies())

    expect(response.status).toBe(400)
    await expect(responseJSON(response)).resolves.toEqual({
      error: 'The assessment request body is invalid.',
    })
  })

  it('rejects malformed JSON without invoking AI dependencies', async () => {
    const authorizeAI = vi.fn<AuthorizeAI>()
    const enhanceReport = vi.fn<EnhanceReport>()
    const recordRejectedSubmission = vi.fn<RecordRejectedSubmission>(async () => false)
    const response = await handleReadinessAssessment(
      postRequest('{not-json'),
      handlerDependencies({ authorizeAI, enhanceReport, recordRejectedSubmission }),
    )

    expect(response.status).toBe(400)
    expect(authorizeAI).not.toHaveBeenCalled()
    expect(enhanceReport).not.toHaveBeenCalled()
    expect(recordRejectedSubmission).toHaveBeenCalledWith({
      clientAddress: '203.0.113.42',
    })
  })

  it('returns a generic 429 for a repeated malformed submission', async () => {
    const authorizeAI = vi.fn<AuthorizeAI>()
    const enhanceReport = vi.fn<EnhanceReport>()
    const recordRejectedSubmission = vi.fn<RecordRejectedSubmission>(async () => true)
    const response = await handleReadinessAssessment(
      postRequest('{private-malformed-json'),
      handlerDependencies({ authorizeAI, enhanceReport, recordRejectedSubmission }),
    )

    expect(response.status).toBe(429)
    expectSafeResponseHeaders(response)
    await expect(responseJSON(response)).resolves.toEqual({
      error: 'Too many requests. Try again later.',
    })
    expect(authorizeAI).not.toHaveBeenCalled()
    expect(enhanceReport).not.toHaveBeenCalled()
  })

  it('returns the first bounded validation error without invoking AI dependencies', async () => {
    const authorizeAI = vi.fn<AuthorizeAI>()
    const enhanceReport = vi.fn<EnhanceReport>()
    const recordRejectedSubmission = vi.fn<RecordRejectedSubmission>(async () => false)
    const invalid = { ...validAssessment(), unexpectedPrivateField: 'do not log this' }
    const response = await handleReadinessAssessment(
      postRequest(JSON.stringify(invalid)),
      handlerDependencies({ authorizeAI, enhanceReport, recordRejectedSubmission }),
    )

    expect(response.status).toBe(400)
    expect(authorizeAI).not.toHaveBeenCalled()
    expect(enhanceReport).not.toHaveBeenCalled()
    await expect(responseJSON(response)).resolves.toEqual({
      error: 'This field is not part of the readiness contract.',
    })
    expect(recordRejectedSubmission).toHaveBeenCalledWith({
      clientAddress: '203.0.113.42',
    })
  })

  it('returns a generic 429 for a repeated sensitive submission without invoking AI', async () => {
    const authorizeAI = vi.fn<AuthorizeAI>()
    const enhanceReport = vi.fn<EnhanceReport>()
    const recordRejectedSubmission = vi.fn<RecordRejectedSubmission>(async () => true)
    const log = vi.fn()
    const sensitiveValue = 'sk-abcdefghijklmnop'
    const invalid = { ...validAssessment(), symptom: sensitiveValue }
    const response = await handleReadinessAssessment(
      postRequest(JSON.stringify(invalid)),
      handlerDependencies({
        authorizeAI,
        enhanceReport,
        log,
        recordRejectedSubmission,
      }),
    )
    const body = await responseJSON(response)

    expect(response.status).toBe(429)
    expectSafeResponseHeaders(response)
    expect(body).toEqual({ error: 'Too many requests. Try again later.' })
    expect(authorizeAI).not.toHaveBeenCalled()
    expect(enhanceReport).not.toHaveBeenCalled()
    expect(recordRejectedSubmission).toHaveBeenCalledWith({
      clientAddress: '203.0.113.42',
    })
    expect(log).toHaveBeenCalledWith({
      duration: 'under_250ms',
      outcome: 'rejected',
      reason: 'reject_limit',
      requestId: reportId,
    })

    const serializedOutput = JSON.stringify({ body, logs: log.mock.calls })
    for (const privateValue of [anonymousToken, sensitiveValue, '203.0.113.42']) {
      expect(serializedOutput).not.toContain(privateValue)
    }
  })

  it('returns the original rejection if the reject counter throws', async () => {
    const authorizeAI = vi.fn<AuthorizeAI>()
    const enhanceReport = vi.fn<EnhanceReport>()
    const recordRejectedSubmission = vi.fn<RecordRejectedSubmission>(async () => {
      throw new Error('private Redis failure')
    })
    const invalid = { ...validAssessment(), unexpectedPrivateField: 'private value' }
    const response = await handleReadinessAssessment(
      postRequest(JSON.stringify(invalid)),
      handlerDependencies({ authorizeAI, enhanceReport, recordRejectedSubmission }),
    )

    expect(response.status).toBe(400)
    await expect(responseJSON(response)).resolves.toEqual({
      error: 'This field is not part of the readiness contract.',
    })
    expect(authorizeAI).not.toHaveBeenCalled()
    expect(enhanceReport).not.toHaveBeenCalled()
  })

  it('does not count rejected origins or media types', async () => {
    const recordRejectedSubmission = vi.fn<RecordRejectedSubmission>(async () => true)
    const untrustedOrigin = new Request(apiURL, {
      body: '{not-json',
      headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' },
      method: 'POST',
    })
    const wrongMediaType = postRequest('{not-json', { 'Content-Type': 'text/plain' })

    await expect(
      handleReadinessAssessment(untrustedOrigin, handlerDependencies({ recordRejectedSubmission })),
    ).resolves.toMatchObject({ status: 403 })
    await expect(
      handleReadinessAssessment(wrongMediaType, handlerDependencies({ recordRejectedSubmission })),
    ).resolves.toMatchObject({ status: 415 })
    expect(recordRejectedSubmission).not.toHaveBeenCalled()
  })

  it('keeps the original invalid response and skips Redis without a trusted production IP', async () => {
    const recordRejectedSubmission = vi.fn<RecordRejectedSubmission>(async () => true)
    const request = new Request(apiURL, {
      body: '{not-json',
      headers: {
        'Content-Type': 'application/json',
        Origin: publicOrigin,
        'X-Forwarded-For': '203.0.113.42',
      },
      method: 'POST',
    })
    const response = await handleReadinessAssessment(
      request,
      handlerDependencies({ recordRejectedSubmission }),
    )

    expect(response.status).toBe(400)
    await expect(responseJSON(response)).resolves.toEqual({
      error: 'The assessment request body is invalid.',
    })
    expect(recordRejectedSubmission).not.toHaveBeenCalled()
  })
})

describe('readiness deterministic and enhanced outcomes', () => {
  it.each([
    {
      environment: { ...baseEnvironment(), AI_ENHANCEMENT_ENABLED: '0' },
      name: 'disabled',
    },
    {
      environment: { ...baseEnvironment(), AI_ENHANCEMENT_ENABLED: '1' },
      name: 'unconfigured',
    },
  ])('returns the complete deterministic result when AI is $name', async ({ environment }) => {
    const authorizeAI = vi.fn<AuthorizeAI>()
    const enhanceReport = vi.fn<EnhanceReport>()
    const response = await handleReadinessAssessment(
      postRequest(),
      handlerDependencies({ authorizeAI, enhanceReport, environment }),
    )
    const body = await responseJSON(response)

    expect(response.status).toBe(200)
    expectSafeResponseHeaders(response)
    expect(body.fallbackUsed).toBe(true)
    expect(body.reportId).toBe(reportId)
    expect(body.handoffToken).toEqual(expect.any(String))
    expect(body.report).toEqual(
      expect.objectContaining({
        explanationSource: 'deterministic',
        policyVersion: readinessPolicyVersion,
      }),
    )
    expect(authorizeAI).not.toHaveBeenCalled()
    expect(enhanceReport).not.toHaveBeenCalled()
  })

  it.each([undefined, 'not-an-ip'])(
    'keeps the deterministic report and skips AI for a missing or malformed production CF IP: %j',
    async (clientAddress) => {
      const authorizeAI = vi.fn<AuthorizeAI>()
      const enhanceReport = vi.fn<EnhanceReport>()
      const log = vi.fn()
      const headers = new Headers({
        'Content-Type': 'application/json',
        Origin: publicOrigin,
        'X-Forwarded-For': '203.0.113.42',
      })
      if (clientAddress) headers.set('CF-Connecting-IP', clientAddress)
      const request = new Request(apiURL, {
        body: JSON.stringify(validAssessment()),
        headers,
        method: 'POST',
      })
      const response = await handleReadinessAssessment(
        request,
        handlerDependencies({
          authorizeAI,
          enhanceReport,
          environment: configuredAIEnvironment(),
          log,
        }),
      )
      const body = await responseJSON(response)

      expect(response.status).toBe(200)
      expect(body.fallbackUsed).toBe(true)
      expect(body.report).toEqual(expect.objectContaining({ explanationSource: 'deterministic' }))
      expect(authorizeAI).not.toHaveBeenCalled()
      expect(enhanceReport).not.toHaveBeenCalled()
      expect(log).toHaveBeenCalledWith(
        expect.objectContaining({ aiOutcome: 'limit_unavailable', requestId: reportId }),
      )
    },
  )

  it.each([
    {
      authorize: async () => ({ allowed: false, reason: 'ip' }) as const,
      name: 'rate limited',
    },
    {
      authorize: async () => {
        throw new Error('private Redis failure')
      },
      name: 'rate-limit dependency throws',
    },
  ])('falls back deterministically when AI authorization is $name', async ({ authorize }) => {
    const enhanceReport = vi.fn<EnhanceReport>()
    const response = await handleReadinessAssessment(
      postRequest(),
      handlerDependencies({
        authorizeAI: vi.fn<AuthorizeAI>(authorize),
        enhanceReport,
        environment: configuredAIEnvironment(),
      }),
    )
    const body = await responseJSON(response)

    expect(response.status).toBe(200)
    expect(body.fallbackUsed).toBe(true)
    expect(body.report).toEqual(expect.objectContaining({ explanationSource: 'deterministic' }))
    expect(enhanceReport).not.toHaveBeenCalled()
  })

  it('returns an enhanced report, releases the permit, and logs only safe metadata', async () => {
    const release = vi.fn(async () => undefined)
    const authorizeAI = vi.fn<AuthorizeAI>(async () => ({ allowed: true, release }))
    const enhanceReport = vi.fn<EnhanceReport>(async (input) => ({
      model: input.config.primaryModel,
      ok: true,
      provider: 'Example Provider',
      report: {
        ...input.deterministicReport,
        explanationSource: 'model',
        summary: 'A bounded model explanation of the deterministic result.',
      },
      routingStrategy: 'fallback',
      usage: { completionTokens: 50, cost: 0.001, promptTokens: 100, totalTokens: 150 },
    }))
    const log = vi.fn()
    const response = await handleReadinessAssessment(
      postRequest(),
      handlerDependencies({
        authorizeAI,
        enhanceReport,
        environment: configuredAIEnvironment(),
        log,
      }),
    )
    const body = await responseJSON(response)

    expect(response.status).toBe(200)
    expectSafeResponseHeaders(response)
    expect(body).toEqual({
      fallbackUsed: false,
      handoffToken: expect.any(String),
      report: expect.objectContaining({
        explanationSource: 'model',
        policyVersion: readinessPolicyVersion,
        summary: 'A bounded model explanation of the deterministic result.',
      }),
      reportId,
    })
    expect(authorizeAI).toHaveBeenCalledWith({
      anonymousToken,
      clientAddress: '203.0.113.42',
    })
    expect(enhanceReport).toHaveBeenCalledOnce()
    expect(enhanceReport.mock.calls[0]?.[0].manifest).not.toHaveProperty('anonymousToken')
    expect(release).toHaveBeenCalledOnce()

    const serializedLogs = JSON.stringify(log.mock.calls)
    const serializedResponse = JSON.stringify(body)
    for (const sensitiveValue of [
      anonymousToken,
      symptom,
      '203.0.113.42',
      'private-test-openrouter-key',
      'test-handoff-secret-that-is-at-least-32-characters',
    ]) {
      expect(serializedLogs).not.toContain(sensitiveValue)
      expect(serializedResponse).not.toContain(sensitiveValue)
    }
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        aiOutcome: 'enhanced',
        completionTokens: 50,
        cost: 0.001,
        explanationSource: 'model',
        outcome: 'completed',
        policyVersion: readinessPolicyVersion,
        promptTokens: 100,
        provider: 'Example Provider',
        requestId: reportId,
        routingStrategy: 'fallback',
        servedModel: 'openai/gpt-5.1',
        totalTokens: 150,
      }),
    )
  })

  it.each(['timeout', 'network', 'throw'] as const)(
    'keeps the concurrency lease until expiry for an ambiguous %s outcome',
    async (caseName) => {
      const release = vi.fn(async () => undefined)
      const authorizeAI = vi.fn<AuthorizeAI>(async () => ({ allowed: true, release }))
      const enhanceReport = vi.fn<EnhanceReport>(async (input) => {
        if (caseName === 'throw') throw new Error('private provider failure')
        return { ok: false, reason: caseName, report: input.deterministicReport }
      })
      const response = await handleReadinessAssessment(
        postRequest(),
        handlerDependencies({
          authorizeAI,
          enhanceReport,
          environment: configuredAIEnvironment(),
        }),
      )
      const body = await responseJSON(response)

      expect(response.status).toBe(200)
      expect(body.fallbackUsed).toBe(true)
      expect(body.report).toEqual(expect.objectContaining({ explanationSource: 'deterministic' }))
      expect(release).not.toHaveBeenCalled()
    },
  )

  it('keeps the completed result when permit release itself fails', async () => {
    const release = vi.fn(async () => {
      throw new Error('private release failure')
    })
    const response = await handleReadinessAssessment(
      postRequest(),
      handlerDependencies({
        authorizeAI: vi.fn<AuthorizeAI>(async () => ({ allowed: true, release })),
        enhanceReport: vi.fn<EnhanceReport>(async (input) => ({
          ok: false,
          reason: 'http',
          report: input.deterministicReport,
        })),
        environment: configuredAIEnvironment(),
      }),
    )

    expect(response.status).toBe(200)
    await expect(responseJSON(response)).resolves.toEqual(
      expect.objectContaining({ fallbackUsed: true, reportId }),
    )
    expect(release).toHaveBeenCalledOnce()
  })
})
