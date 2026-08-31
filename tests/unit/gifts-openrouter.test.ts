import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import type { GiftRecommendationRequest } from '@/lib/gifts'
import type { OpenRouterGiftConfig } from '@/lib/gifts/server/config'
import {
  GiftSearchError,
  searchGiftIdeas,
  type OpenRouterGiftFetch,
} from '@/lib/gifts/server/openrouter'
import type { ModelGiftIdea } from '@/lib/gifts/validation'

const request: GiftRecommendationRequest = {
  anonymousToken: 'anonymous_token_1234567890',
  budget: 'mixed',
  theme: 'wildcard',
  variationSeed: 'variation_seed_1234567890',
}

const config: OpenRouterGiftConfig = {
  apiKey: 'private-openrouter-test-key',
  fallbackModel: 'anthropic/claude-sonnet-4.5',
  maxCompletionTokens: 3_000,
  primaryModel: 'openai/gpt-5.1',
  quoteSecret: 'test-gift-quote-secret-that-is-at-least-32-characters',
  siteOrigin: 'https://saberistic.com',
  timeoutMs: 5_000,
}

function ideas(): ModelGiftIdea[] {
  const prices = [1_500, 2_500, 4_999, 5_000, 9_000, 14_999, 15_000, 22_000, 30_000]
  return prices.map((observedPriceCents, index) => ({
    category: `Category ${index + 1}`,
    currency: 'usd',
    name: `Current physical gift ${index + 1}`,
    observedPriceCents,
    retailer: `Verified Retailer ${index + 1}`,
    sourceUrl: `https://retailer${index + 1}.example/products/current-gift-${index + 1}`,
    whyItFits: `A useful and durable surprise for a design-conscious systems builder number ${index + 1}.`,
  }))
}

function annotations() {
  return ideas().map((idea) => ({
    type: 'url_citation',
    url_citation: { url: idea.sourceUrl },
  }))
}

function upstreamPayload({
  annotations: responseAnnotations = annotations(),
  content = JSON.stringify({ ideas: ideas() }),
  model = config.primaryModel,
  searchRequests = 2,
}: {
  annotations?: unknown
  content?: string
  model?: string
  searchRequests?: number
} = {}) {
  return {
    choices: [
      {
        finish_reason: 'stop',
        message: { annotations: responseAnnotations, content, role: 'assistant' },
      },
    ],
    model,
    usage: {
      completion_tokens: 900,
      cost: 0.08,
      prompt_tokens: 1_200,
      server_tool_use: { web_search_requests: searchRequests },
      total_tokens: 2_100,
    },
  }
}

function successfulFetch(payload: unknown = upstreamPayload()) {
  return vi.fn<OpenRouterGiftFetch>(async (_input, init) => {
    const requestedModel = (JSON.parse(String(init?.body)) as { model?: unknown }).model
    const responsePayload =
      typeof payload === 'object' && payload !== null && !Array.isArray(payload)
        ? { ...payload, model: requestedModel }
        : payload

    return Response.json(responsePayload, {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  })
}

function run(fetchImpl: OpenRouterGiftFetch) {
  return searchGiftIdeas({
    config,
    fetchImpl,
    request,
    runId: 'run_1234567890123456',
    searchedAt: '2026-08-31T15:30:00.000Z',
  })
}

describe('OpenRouter gift search', () => {
  it('uses the web-search server tool and a strict structured-output schema', async () => {
    const fetchImpl = successfulFetch()

    const result = await run(fetchImpl)

    expect(result).toMatchObject({
      citations: 9,
      ideas: expect.any(Array),
      model: config.primaryModel,
      usage: {
        completionTokens: 900,
        cost: 0.08,
        promptTokens: 1_200,
        searchRequests: 2,
        totalTokens: 2_100,
      },
    })
    expect(result.ideas).toHaveLength(9)
    expect(fetchImpl).toHaveBeenCalledOnce()

    const [url, init] = fetchImpl.mock.calls[0] ?? []
    expect(String(url)).toBe('https://openrouter.ai/api/v1/chat/completions')
    expect(init).toMatchObject({ cache: 'no-store', method: 'POST', redirect: 'error' })
    expect(init?.headers).toMatchObject({
      Accept: 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': config.siteOrigin,
      'X-OpenRouter-Cache': 'false',
      'X-OpenRouter-Title': 'Saberistic Gift Draft',
    })

    const body = JSON.parse(String(init?.body)) as {
      max_completion_tokens?: unknown
      max_tokens?: unknown
      model?: unknown
      models?: unknown
      plugins?: unknown
      provider?: unknown
      response_format?: {
        json_schema?: {
          schema?: { properties?: { ideas?: { items?: unknown } } }
        }
      }
      tools?: unknown
      user?: unknown
    }
    expect(body.tools).toEqual([
      {
        parameters: {
          engine: 'exa',
          max_characters: 1500,
          max_results: 12,
          max_total_results: 24,
          max_uses: 3,
        },
        type: 'openrouter:web_search',
      },
    ])
    expect(body.response_format).toMatchObject({
      json_schema: {
        name: 'gift_draft_deck',
        schema: {
          additionalProperties: false,
          properties: {
            ideas: {
              maxItems: 9,
              minItems: 9,
              type: 'array',
            },
          },
          required: ['ideas'],
          type: 'object',
        },
        strict: true,
      },
      type: 'json_schema',
    })
    expect(body.response_format?.json_schema?.schema?.properties?.ideas?.items).toMatchObject({
      additionalProperties: false,
      properties: {
        observedPriceCents: { maximum: 30_000, minimum: 1_500, type: 'integer' },
      },
    })
    expect(body.plugins).toEqual([
      { enabled: false, id: 'context-compression' },
      { enabled: false, id: 'file-parser' },
      { enabled: false, id: 'fusion' },
      { enabled: false, id: 'pareto-router' },
      { enabled: false, id: 'response-healing' },
      { enabled: false, id: 'web' },
    ])
    expect(body.provider).toEqual({
      allow_fallbacks: true,
      data_collection: 'deny',
      zdr: true,
    })
    expect(body.model).toBe(config.primaryModel)
    expect(body).not.toHaveProperty('models')
    expect(body.max_tokens).toBe(config.maxCompletionTokens)
    expect(body).not.toHaveProperty('max_completion_tokens')
    expect(body.user).toMatch(/^[A-Za-z0-9_-]{40,}$/)
    expect(body.user).not.toBe(request.anonymousToken)
    expect(String(init?.body)).not.toContain(request.anonymousToken)
  })

  it('requires nonzero web-search usage even when citations are present', async () => {
    await expect(run(successfulFetch(upstreamPayload({ searchRequests: 0 })))).rejects.toEqual(
      expect.objectContaining<Partial<GiftSearchError>>({ reason: 'no_search' }),
    )
  })

  it('accepts the current generic executed server-tool counter', async () => {
    const payload = upstreamPayload()
    const { server_tool_use: _legacyCounter, ...usage } = payload.usage

    await expect(
      run(
        successfulFetch({
          ...payload,
          usage: {
            ...usage,
            server_tool_use_details: { tool_calls_executed: 2, tool_calls_requested: 2 },
          },
        }),
      ),
    ).resolves.toMatchObject({ usage: { searchRequests: 2 } })
  })

  it('requires URL citations even when usage reports a search request', async () => {
    await expect(run(successfulFetch(upstreamPayload({ annotations: [] })))).rejects.toEqual(
      expect.objectContaining<Partial<GiftSearchError>>({ reason: 'no_search' }),
    )
  })

  it('preserves only bounded operational metadata from an upstream HTTP failure', async () => {
    const fetchImpl = vi.fn<OpenRouterGiftFetch>(async () =>
      Response.json(
        { error: { message: 'private upstream detail must not be logged or returned' } },
        {
          headers: {
            'Retry-After': '30',
            'X-Generation-Id': 'gen-gift_123',
          },
          status: 429,
        },
      ),
    )

    await expect(run(fetchImpl)).rejects.toEqual(
      expect.objectContaining<Partial<GiftSearchError>>({
        reason: 'http',
        upstream: {
          generationId: 'gen-gift_123',
          retryAfter: '30',
          status: 429,
        },
      }),
    )
  })

  it.each([404, 503])(
    'tries the fallback model after retryable HTTP status %i using the same deadline',
    async (status) => {
      let attempt = 0
      const fetchImpl = vi.fn<OpenRouterGiftFetch>(async () => {
        attempt += 1
        if (attempt === 1) {
          return Response.json({ error: { message: 'provider unavailable' } }, { status })
        }

        return Response.json(upstreamPayload({ model: config.fallbackModel }), { status: 200 })
      })

      const result = await run(fetchImpl)

      expect(result.model).toBe(config.fallbackModel)
      expect(fetchImpl).toHaveBeenCalledTimes(2)
      const requestBodies = fetchImpl.mock.calls.map(([, init]) =>
        JSON.parse(String(init?.body)),
      ) as Array<Record<string, unknown>>
      expect(requestBodies.map((body) => body.model)).toEqual([
        config.primaryModel,
        config.fallbackModel,
      ])
      expect(requestBodies.every((body) => !Object.hasOwn(body, 'models'))).toBe(true)
      expect(fetchImpl.mock.calls[1]?.[1]?.signal).toBe(fetchImpl.mock.calls[0]?.[1]?.signal)
    },
  )

  it('tries the fallback model after invalid primary model output', async () => {
    let attempt = 0
    const fetchImpl = vi.fn<OpenRouterGiftFetch>(async () => {
      attempt += 1
      return Response.json(
        attempt === 1
          ? upstreamPayload({ content: 'not valid JSON' })
          : upstreamPayload({ model: config.fallbackModel }),
        { status: 200 },
      )
    })

    await expect(run(fetchImpl)).resolves.toMatchObject({ model: config.fallbackModel })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it.each([400, 401, 402, 403])(
    'does not try the fallback model after hard HTTP status %i',
    async (status) => {
      const fetchImpl = vi.fn<OpenRouterGiftFetch>(async () =>
        Response.json({ error: { message: 'hard request failure' } }, { status }),
      )

      await expect(run(fetchImpl)).rejects.toEqual(
        expect.objectContaining<Partial<GiftSearchError>>({
          reason: 'http',
          upstream: expect.objectContaining({ status }),
        }),
      )
      expect(fetchImpl).toHaveBeenCalledOnce()
    },
  )

  it.each([
    ['non-JSON content', 'not valid JSON', annotations()],
    ['uncited listing', JSON.stringify({ ideas: ideas() }), annotations().slice(0, 8)],
    ['wrong response shape', JSON.stringify({ gifts: ideas() }), annotations()],
  ])('rejects malformed model output: %s', async (_label, content, annotations) => {
    await expect(run(successfulFetch(upstreamPayload({ annotations, content })))).rejects.toEqual(
      expect.objectContaining<Partial<GiftSearchError>>({ reason: 'invalid_model_output' }),
    )
  })
})
