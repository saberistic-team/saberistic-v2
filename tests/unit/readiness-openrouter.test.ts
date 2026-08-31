import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  buildReadinessModelMessages,
  buildReadinessModelResponseFormat,
  createDeterministicReadinessReport,
  getReadinessModelContract,
  readinessPolicyVersion,
  readinessQuestionsV1,
  scoreReadiness,
  type ReadinessAnswers,
  type ReadinessManifest,
  type ReadinessModelResponse,
  type ReadinessReport,
} from '@/lib/readiness'
import type { OpenRouterReadinessConfig } from '@/lib/readiness/server/config'
import {
  enhanceReadinessReport,
  type EnhanceReadinessReportInput,
  type OpenRouterEnhancementFailureReason,
  type OpenRouterEnhancementOutcome,
  type OpenRouterFetch,
} from '@/lib/readiness/server/openrouter'

const primaryModel = 'openai/gpt-5.1'
const fallbackModel = 'anthropic/claude-sonnet-4.5'
const explanation =
  'This bounded explanation stays tied to the fixed readiness item and its verification boundary.'

const baseConfig: OpenRouterReadinessConfig = {
  apiKey: 'test-openrouter-key',
  fallbackModel,
  maxCompletionTokens: 1_800,
  primaryModel,
  siteURL: 'https://saberistic.example',
  timeoutMs: 1_000,
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function fixture(config: Partial<OpenRouterReadinessConfig> = {}): EnhanceReadinessReportInput {
  const answers = Object.fromEntries(
    readinessQuestionsV1.map((question) => [question.id, question.options[0]?.value]),
  ) as ReadinessAnswers
  const manifest: ReadinessManifest = {
    answers,
    policyVersion: readinessPolicyVersion,
    profile: 'ai_saas',
    symptom: 'Release confidence is low after a recent rollback drill.',
  }
  const policyResult = scoreReadiness(manifest)
  const deterministicReport = createDeterministicReadinessReport(manifest, policyResult)

  return {
    config: { ...baseConfig, ...config },
    deterministicReport,
    manifest,
    policyResult,
  }
}

function validModelOutput(report: ReadinessReport): ReadinessModelResponse {
  const contract = getReadinessModelContract(report)

  return {
    blockerExplanations: contract.blockerRuleIds.map((ruleId) => ({ explanation, ruleId })),
    doNotOptimizeYet: contract.doNotOptimizeActionIds.map((actionId) => ({
      actionId,
      explanation,
    })),
    nextStepReason:
      'Use the approved next step to verify the fixed readiness priorities with current evidence.',
    plan48Hours: contract.plan48HourActionIds.map((actionId) => ({ actionId, explanation })),
    planTwoWeeks: contract.planTwoWeekActionIds.map((actionId) => ({ actionId, explanation })),
    strengths: contract.strengthControlIds.map((controlId) => ({ controlId, explanation })),
    summary:
      'The deterministic readiness result identifies the fixed priorities for this declared system.',
    unknownExplanations: contract.unknownControlIds.map((controlId) => ({
      controlId,
      explanation,
    })),
  }
}

type CompletionOptions = {
  choiceError?: unknown
  content?: string
  endpointModel?: unknown
  finishReason?: unknown
  model?: string
  omitRouterMetadata?: boolean
  pipeline?: unknown
  provider?: unknown
  requestedModel?: unknown
  routingStrategy?: unknown
  topLevelError?: unknown
  usage?: unknown
}

function completionResponse(
  report: ReadinessReport,
  {
    choiceError,
    content = JSON.stringify(validModelOutput(report)),
    endpointModel,
    finishReason = 'stop',
    model = primaryModel,
    omitRouterMetadata = false,
    pipeline = [],
    provider = 'Example Provider',
    requestedModel = primaryModel,
    routingStrategy = 'fallback',
    topLevelError,
    usage = {
      completion_tokens: 123,
      cost: 0.001,
      prompt_tokens: 456,
      total_tokens: 579,
    },
  }: CompletionOptions = {},
): Response {
  const choice: Record<string, unknown> = {
    finish_reason: finishReason,
    message: { content, role: 'assistant' },
  }
  if (choiceError !== undefined) choice.error = choiceError

  const body: Record<string, unknown> = { choices: [choice], model, usage }
  if (topLevelError !== undefined) body.error = topLevelError
  if (!omitRouterMetadata) {
    body.openrouter_metadata = {
      endpoints: { available: [{ model: endpointModel ?? model, provider, selected: true }] },
      pipeline,
      requested: requestedModel,
      strategy: routingStrategy,
    }
  }

  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  })
}

function responseFetch(response: Response): OpenRouterFetch {
  return vi.fn<OpenRouterFetch>(async () => response)
}

function expectFallback(
  outcome: OpenRouterEnhancementOutcome,
  report: ReadinessReport,
  reason: OpenRouterEnhancementFailureReason,
) {
  expect(outcome).toEqual({ ok: false, reason, report })
  expect(outcome.report).toBe(report)
}

describe('OpenRouter readiness enhancement', () => {
  it('sends exactly one bounded, non-streaming, privacy-constrained structured-output request', async () => {
    const input = fixture()
    const calls: Array<{ init?: RequestInit; url: RequestInfo | URL }> = []
    const fetchImpl: OpenRouterFetch = async (url, init) => {
      calls.push({ init, url })
      return completionResponse(input.deterministicReport)
    }

    const outcome = await enhanceReadinessReport({ ...input, fetchImpl })

    expect(outcome.ok).toBe(true)
    expect(calls).toHaveLength(1)
    const call = calls[0]
    expect(String(call?.url)).toBe('https://openrouter.ai/api/v1/chat/completions')
    expect(call?.init).toEqual({
      body: expect.any(String),
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer test-openrouter-key',
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://saberistic.example',
        'X-OpenRouter-Cache': 'false',
        'X-OpenRouter-Metadata': 'enabled',
        'X-OpenRouter-Title': 'Saberistic Readiness Check',
      },
      method: 'POST',
      redirect: 'error',
      signal: expect.any(AbortSignal),
    })

    const body = JSON.parse(String(call?.init?.body)) as Record<string, unknown>
    expect(body).toEqual({
      max_completion_tokens: 1_800,
      messages: buildReadinessModelMessages(input.manifest, input.deterministicReport),
      models: [primaryModel, fallbackModel],
      plugins: [
        { enabled: false, id: 'context-compression' },
        { enabled: false, id: 'file-parser' },
        { enabled: false, id: 'fusion' },
        { enabled: false, id: 'pareto-router' },
        { enabled: false, id: 'response-healing' },
        { enabled: false, id: 'web' },
      ],
      provider: {
        allow_fallbacks: true,
        data_collection: 'deny',
        require_parameters: true,
        zdr: true,
      },
      response_format: buildReadinessModelResponseFormat(input.deterministicReport),
      stream: false,
      temperature: 0,
    })
    expect(JSON.stringify(body)).not.toContain(baseConfig.apiKey)
    expect(body).not.toHaveProperty('tools')
    expect(body).not.toHaveProperty('model')
    expect(body).not.toHaveProperty('max_tokens')
  })

  it('omits optional attribution headers when no public site origin is configured', async () => {
    const input = fixture({ siteURL: null })
    let requestHeaders: HeadersInit | undefined
    const fetchImpl: OpenRouterFetch = async (_url, init) => {
      requestHeaders = init?.headers
      return completionResponse(input.deterministicReport)
    }

    await enhanceReadinessReport({ ...input, fetchImpl })

    expect(requestHeaders).toEqual({
      Accept: 'application/json',
      Authorization: 'Bearer test-openrouter-key',
      'Content-Type': 'application/json',
      'X-OpenRouter-Cache': 'false',
      'X-OpenRouter-Metadata': 'enabled',
    })
  })

  it.each([primaryModel, fallbackModel])(
    'accepts a successful response served by configured model %s',
    async (model) => {
      const input = fixture()
      const outcome = await enhanceReadinessReport({
        ...input,
        fetchImpl: responseFetch(completionResponse(input.deterministicReport, { model })),
      })

      expect(outcome.ok).toBe(true)
      if (!outcome.ok) return

      expect(outcome.model).toBe(model)
      expect(outcome.provider).toBe('Example Provider')
      expect(outcome.routingStrategy).toBe('fallback')
      expect(outcome.usage).toEqual({
        completionTokens: 123,
        cost: 0.001,
        promptTokens: 456,
        totalTokens: 579,
      })
      expect(outcome.report.explanationSource).toBe('model')
      expect(outcome.report.score).toBe(input.deterministicReport.score)
      expect(outcome.report.level).toBe(input.deterministicReport.level)
      expect(outcome.report.policyVersion).toBe(input.deterministicReport.policyVersion)
      expect(outcome.report.nextStep.id).toBe(input.deterministicReport.nextStep.id)
      expect(outcome.report.blockers.map((item) => item.ruleId)).toEqual(
        input.deterministicReport.blockers.map((item) => item.ruleId),
      )
    },
  )

  it('accepts a versioned provider endpoint for the configured served model', async () => {
    const input = fixture()
    const outcome = await enhanceReadinessReport({
      ...input,
      fetchImpl: responseFetch(
        completionResponse(input.deterministicReport, {
          endpointModel: `${fallbackModel}-2025-04-14`,
          model: fallbackModel,
          requestedModel: `${primaryModel},${fallbackModel}`,
        }),
      ),
    })

    expect(outcome.ok).toBe(true)
  })

  it('times out a fetch that ignores its AbortSignal and returns the original report', async () => {
    vi.useFakeTimers()
    const input = fixture({ timeoutMs: 50 })
    let signal: AbortSignal | null | undefined
    const fetchImpl = vi.fn<OpenRouterFetch>((_url, init) => {
      signal = init?.signal
      return new Promise<Response>(() => undefined)
    })

    const pending = enhanceReadinessReport({ ...input, fetchImpl })
    await vi.advanceTimersByTimeAsync(50)
    const outcome = await pending

    expect(fetchImpl).toHaveBeenCalledOnce()
    expect(signal?.aborted).toBe(true)
    expectFallback(outcome, input.deterministicReport, 'timeout')
  })

  it('returns the original report for non-success HTTP responses without exposing provider text', async () => {
    const input = fixture()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const response = new Response(
      JSON.stringify({ error: { message: 'private-provider-error-detail' } }),
      { status: 403 },
    )

    const outcome = await enhanceReadinessReport({
      ...input,
      fetchImpl: responseFetch(response),
    })

    expectFallback(outcome, input.deterministicReport, 'http')
    expect(JSON.stringify(outcome)).not.toContain('private-provider-error-detail')
    expect(errorSpy).not.toHaveBeenCalled()
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('classifies a transport failure as ambiguous network work', async () => {
    const input = fixture()
    const fetchImpl = vi.fn<OpenRouterFetch>(async () => {
      throw new TypeError('connection reset')
    })

    const outcome = await enhanceReadinessReport({ ...input, fetchImpl })

    expectFallback(outcome, input.deterministicReport, 'network')
  })

  it('rejects a response stream larger than the byte cap', async () => {
    const input = fixture()
    const response = new Response(new Uint8Array(129 * 1024), { status: 200 })

    const outcome = await enhanceReadinessReport({
      ...input,
      fetchImpl: responseFetch(response),
    })

    expectFallback(outcome, input.deterministicReport, 'oversized_response')
  })

  it('rejects model content larger than its separate byte cap', async () => {
    const input = fixture()
    const response = completionResponse(input.deterministicReport, {
      content: ' '.repeat(65 * 1024),
    })

    const outcome = await enhanceReadinessReport({
      ...input,
      fetchImpl: responseFetch(response),
    })

    expectFallback(outcome, input.deterministicReport, 'oversized_response')
  })

  it.each([
    ['malformed response JSON', new Response('{not-json', { status: 200 })],
    ['missing choices', new Response(JSON.stringify({ model: primaryModel }), { status: 200 })],
  ])('rejects %s', async (_caseName, response) => {
    const input = fixture()
    const outcome = await enhanceReadinessReport({
      ...input,
      fetchImpl: responseFetch(response),
    })

    expectFallback(outcome, input.deterministicReport, 'invalid_response')
  })

  it.each([
    ['error', 'error_response'],
    ['length', 'invalid_response'],
    ['tool_calls', 'invalid_response'],
    [null, 'invalid_response'],
  ] as const)('rejects finish_reason %j', async (finishReason, reason) => {
    const input = fixture()
    const outcome = await enhanceReadinessReport({
      ...input,
      fetchImpl: responseFetch(completionResponse(input.deterministicReport, { finishReason })),
    })

    expectFallback(outcome, input.deterministicReport, reason)
  })

  it.each([
    ['top-level', { topLevelError: { code: 503, message: 'provider unavailable' } }],
    ['choice-level', { choiceError: { code: 429, message: 'provider rate limited' } }],
  ])('rejects a 200 response containing a %s error', async (_location, responseOptions) => {
    const input = fixture()
    const outcome = await enhanceReadinessReport({
      ...input,
      fetchImpl: responseFetch(completionResponse(input.deterministicReport, responseOptions)),
    })

    expectFallback(outcome, input.deterministicReport, 'error_response')
  })

  it('rejects an otherwise valid response attributed to an unconfigured model', async () => {
    const input = fixture()
    const outcome = await enhanceReadinessReport({
      ...input,
      fetchImpl: responseFetch(
        completionResponse(input.deterministicReport, { model: 'unconfigured/model' }),
      ),
    })

    expectFallback(outcome, input.deterministicReport, 'invalid_response')
  })

  it('rejects a successful response without auditable router metadata', async () => {
    const input = fixture()
    const outcome = await enhanceReadinessReport({
      ...input,
      fetchImpl: responseFetch(
        completionResponse(input.deterministicReport, { omitRouterMetadata: true }),
      ),
    })

    expectFallback(outcome, input.deterministicReport, 'invalid_response')
  })

  it.each([{ endpointModel: 'anthropic/other-model' }, { requestedModel: 'unconfigured/model' }])(
    'rejects router metadata outside the configured model families: %j',
    async (metadata) => {
      const input = fixture()
      const outcome = await enhanceReadinessReport({
        ...input,
        fetchImpl: responseFetch(completionResponse(input.deterministicReport, metadata)),
      })

      expectFallback(outcome, input.deterministicReport, 'invalid_response')
    },
  )

  it.each([
    [{ name: 'web-search', type: 'plugin' }],
    [{ name: 'server-tools', type: 'server_tools' }],
    [{ name: 'middle-out', type: 'context_compression' }],
    [{ name: 'response-healing', type: 'response_healing' }],
    [{ name: 'future-stage', type: 'unknown_stage' }],
  ])('rejects an unexpected routing pipeline: %j', async (pipeline) => {
    const input = fixture()
    const outcome = await enhanceReadinessReport({
      ...input,
      fetchImpl: responseFetch(completionResponse(input.deterministicReport, { pipeline })),
    })

    expectFallback(outcome, input.deterministicReport, 'invalid_response')
  })

  it.each([
    { provider: '', routingStrategy: 'fallback' },
    { provider: 'Example Provider', routingStrategy: 'auto' },
  ])('rejects unsafe routing metadata: %j', async (routing) => {
    const input = fixture()
    const outcome = await enhanceReadinessReport({
      ...input,
      fetchImpl: responseFetch(completionResponse(input.deterministicReport, routing)),
    })

    expectFallback(outcome, input.deterministicReport, 'invalid_response')
  })

  it('rejects malformed model JSON', async () => {
    const input = fixture()
    const outcome = await enhanceReadinessReport({
      ...input,
      fetchImpl: responseFetch(
        completionResponse(input.deterministicReport, { content: '{not-model-json' }),
      ),
    })

    expectFallback(outcome, input.deterministicReport, 'invalid_model_output')
  })

  it('rejects schema-invalid model output that attempts to add a deterministic score', async () => {
    const input = fixture()
    const modelOutput = { ...validModelOutput(input.deterministicReport), score: 100 }
    const outcome = await enhanceReadinessReport({
      ...input,
      fetchImpl: responseFetch(
        completionResponse(input.deterministicReport, {
          content: JSON.stringify(modelOutput),
        }),
      ),
    })

    expectFallback(outcome, input.deterministicReport, 'invalid_model_output')
  })

  it('rejects shape-valid output that violates the narrative business rules', async () => {
    const input = fixture()
    const modelOutput = {
      ...validModelOutput(input.deterministicReport),
      summary: 'Run rm -rf before treating this system as production-safe.',
    }
    const outcome = await enhanceReadinessReport({
      ...input,
      fetchImpl: responseFetch(
        completionResponse(input.deterministicReport, {
          content: JSON.stringify(modelOutput),
        }),
      ),
    })

    expectFallback(outcome, input.deterministicReport, 'invalid_model_output')
  })
})
