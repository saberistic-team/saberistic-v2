import { afterEach, describe, expect, it, vi } from 'vitest'

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
  fallbackModel: 'openai/gpt-4.1-mini',
  maxCompletionTokens: 3_000,
  primaryModel: 'openai/gpt-4.1',
  quoteSecret: 'test-gift-quote-secret-that-is-at-least-32-characters',
  siteOrigin: 'https://saberistic.com',
  timeoutMs: 5_000,
}

function ideas(): ModelGiftIdea[] {
  const prices = [1_500, 2_500, 4_999, 5_000, 9_000, 14_999, 15_000, 22_000, 30_000]
  return prices.map((observedPriceCents, index) => ({
    category: `Useful object ${index + 1}`,
    currency: 'usd',
    name: `Current physical gift ${index + 1}`,
    observedPriceCents,
    retailer: 'Adafruit',
    sourceUrl: `https://www.adafruit.com/products/current-gift-${index + 1}`,
    whyItFits: `A useful and durable surprise for a design-conscious systems builder number ${index + 1}.`,
  }))
}

function annotationsFor(
  source: readonly ModelGiftIdea[],
  title: (idea: ModelGiftIdea) => string = (idea) => idea.name,
) {
  return source.map((idea) => ({
    type: 'url_citation',
    url_citation: { title: title(idea), url: idea.sourceUrl },
  }))
}

function upstreamPayload({
  annotations = [],
  content,
  kind,
  model = config.primaryModel,
}: {
  annotations?: unknown
  content?: string
  kind: 'research' | 'synthesis'
  model?: string
}) {
  const research = kind === 'research'
  return {
    choices: [
      {
        finish_reason: 'stop',
        message: {
          annotations,
          content:
            content ??
            (research
              ? 'Evidence ledger containing direct retailer products, visible prices, and concise descriptions.'
              : JSON.stringify({ ideas: ideas() })),
          role: 'assistant',
        },
      },
    ],
    model,
    usage: {
      completion_tokens: research ? 400 : 800,
      cost: research ? 0.01 : 0.03,
      prompt_tokens: research ? 600 : 1_000,
      ...(research ? { server_tool_use: { web_search_requests: 1 } } : {}),
      total_tokens: research ? 1_000 : 1_800,
    },
  }
}

function jsonResponse(payload: unknown, status = 200): Response {
  return Response.json(payload, { status })
}

function successfulFetch(
  options: {
    citations?: readonly ModelGiftIdea[]
    synthesisByModel?: (model: string) => string
  } = {},
) {
  return vi.fn<OpenRouterGiftFetch>(async (_url, init) => {
    const body = JSON.parse(String(init?.body)) as { model: string; tools?: unknown }
    const research = Array.isArray(body.tools)
    return jsonResponse(
      upstreamPayload({
        annotations: research ? annotationsFor(options.citations ?? ideas()) : [],
        content: research
          ? undefined
          : (options.synthesisByModel?.(body.model) ?? JSON.stringify({ ideas: ideas() })),
        kind: research ? 'research' : 'synthesis',
        model: body.model,
      }),
    )
  })
}

async function run(
  fetchImpl: OpenRouterGiftFetch,
  overrides: Partial<{
    config: OpenRouterGiftConfig
    request: GiftRecommendationRequest
  }> = {},
) {
  return searchGiftIdeas({
    config: overrides.config ?? config,
    fetchImpl,
    request: overrides.request ?? request,
    runId: 'recommendation_run_1234567890',
    searchedAt: '2026-09-01T12:00:00.000Z',
  })
}

afterEach(() => {
  vi.useRealTimers()
})

describe('OpenRouter Gift Inventory discovery', () => {
  it('researches with server web search, then strictly normalizes a real-product batch', async () => {
    const fetchImpl = successfulFetch()

    const result = await run(fetchImpl)

    expect(result).toEqual({
      citations: 9,
      ideas: ideas(),
      model: config.primaryModel,
      modelCandidates: 9,
      searchModel: config.primaryModel,
      usage: {
        completionTokens: 1_200,
        cost: 0.04,
        promptTokens: 1_600,
        searchRequests: 1,
        serverToolCalls: 0,
        totalTokens: 2_800,
      },
    })
    expect(fetchImpl).toHaveBeenCalledTimes(2)

    const [researchURL, researchInit] = fetchImpl.mock.calls[0] ?? []
    const [, synthesisInit] = fetchImpl.mock.calls[1] ?? []
    expect(String(researchURL)).toBe('https://openrouter.ai/api/v1/chat/completions')
    expect(researchInit).toMatchObject({ cache: 'no-store', method: 'POST', redirect: 'error' })
    expect(researchInit?.headers).toMatchObject({
      Accept: 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': config.siteOrigin,
      'X-OpenRouter-Cache': 'false',
      'X-OpenRouter-Title': 'Saberistic Gift Inventory',
    })

    const researchBody = JSON.parse(String(researchInit?.body)) as Record<string, unknown> & {
      messages: Array<{ content: string }>
      tools: Array<{ parameters: { allowed_domains: string[] }; type: string }>
    }
    expect(researchBody).toMatchObject({
      max_tool_calls: 2,
      model: config.primaryModel,
      parallel_tool_calls: false,
      stream: false,
      temperature: 0,
      tools: [{ type: 'openrouter:web_search' }],
    })
    expect(researchBody).not.toHaveProperty('response_format')
    expect(researchBody.messages[0]?.content).toContain('background product researcher')
    expect(researchBody.messages[0]?.content).toContain(
      'copy its image and description to local storage',
    )
    expect(researchBody.tools[0]?.parameters.allowed_domains).toContain('www.adafruit.com')

    const synthesisBody = JSON.parse(String(synthesisInit?.body)) as Record<string, unknown> & {
      messages: Array<{ content: string }>
      response_format: {
        json_schema: {
          name: string
          schema: {
            properties: {
              ideas: {
                items: { properties: Record<string, unknown>; required: string[] }
                maxItems: number
                minItems: number
              }
            }
          }
          strict: boolean
        }
      }
    }
    expect(synthesisBody).not.toHaveProperty('tools')
    expect(synthesisBody.response_format).toMatchObject({
      json_schema: {
        name: 'gift_inventory_research_batch',
        schema: { properties: { ideas: { maxItems: 9, minItems: 9 } } },
        strict: true,
      },
      type: 'json_schema',
    })
    expect(
      synthesisBody.response_format.json_schema.schema.properties.ideas.items.required,
    ).toEqual([
      'category',
      'currency',
      'name',
      'observedPriceCents',
      'retailer',
      'sourceUrl',
      'whyItFits',
    ])
    expect(
      synthesisBody.response_format.json_schema.schema.properties.ideas.items.properties,
    ).not.toHaveProperty('artworkUrl')
    expect(synthesisBody.messages[0]?.content).toContain('Do not invent or return artwork')
    expect(String(researchBody)).not.toContain(request.anonymousToken)
    expect(String(synthesisBody)).not.toContain(request.anonymousToken)
    expect(researchBody.user).toMatch(/^[A-Za-z0-9_-]{40,}$/)
    expect(synthesisBody.user).toBe(researchBody.user)
  })

  it('binds the strict synthesis schema to the requested budget', async () => {
    const underThirtyRequest: GiftRecommendationRequest = { ...request, budget: 'under_30' }
    const underThirtyIdeas = ideas().map((idea, index) => ({
      ...idea,
      observedPriceCents: 1_000 + index * 200,
    }))
    const fetchImpl = successfulFetch({
      synthesisByModel: () => JSON.stringify({ ideas: underThirtyIdeas }),
    })

    await run(fetchImpl, { request: underThirtyRequest })

    const synthesisBody = JSON.parse(String(fetchImpl.mock.calls[1]?.[1]?.body)) as {
      response_format: {
        json_schema: {
          schema: {
            properties: {
              ideas: { items: { properties: { observedPriceCents: unknown } } }
            }
          }
        }
      }
    }
    expect(
      synthesisBody.response_format.json_schema.schema.properties.ideas.items.properties
        .observedPriceCents,
    ).toMatchObject({ maximum: 3_000, minimum: 1_000 })
  })

  it('uses search citations as grounding evidence without blocking uncited products before page validation', async () => {
    const fetchImpl = successfulFetch({ citations: ideas().slice(0, 3) })

    await expect(run(fetchImpl)).resolves.toMatchObject({ citations: 3, ideas: ideas() })
  })

  it('rejects research that produced no approved product citations', async () => {
    const fetchImpl = successfulFetch({ citations: [] })

    await expect(run(fetchImpl)).rejects.toEqual(
      expect.objectContaining<Partial<GiftSearchError>>({ reason: 'no_search' }),
    )
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(
      fetchImpl.mock.calls.every(([, init]) =>
        Array.isArray((JSON.parse(String(init?.body)) as { tools?: unknown }).tools),
      ),
    ).toBe(true)
  })

  it('falls back with a fresh research pass when primary synthesis is invalid', async () => {
    const fetchImpl = successfulFetch({
      synthesisByModel: (model) =>
        model === config.primaryModel ? '{"ideas":[]}' : JSON.stringify({ ideas: ideas() }),
    })

    const result = await run(fetchImpl)

    expect(result).toMatchObject({
      model: config.fallbackModel,
      searchModel: `${config.primaryModel}+${config.fallbackModel}`,
      usage: {
        completionTokens: 2_400,
        cost: 0.08,
        promptTokens: 3_200,
        searchRequests: 2,
        totalTokens: 5_600,
      },
    })
    expect(fetchImpl).toHaveBeenCalledTimes(4)
    expect(
      fetchImpl.mock.calls.map(
        ([, init]) => (JSON.parse(String(init?.body)) as { model: string }).model,
      ),
    ).toEqual([
      config.primaryModel,
      config.primaryModel,
      config.fallbackModel,
      config.fallbackModel,
    ])
    expect(fetchImpl.mock.calls[3]?.[1]?.signal).toBe(fetchImpl.mock.calls[0]?.[1]?.signal)
  })

  it.each([
    [
      'noncanonical fields',
      () => {
        const changed = ideas()
        changed[0] = {
          ...changed[0]!,
          // The cast intentionally creates provider output that violates the strict schema.
          product_name: changed[0]!.name,
        } as ModelGiftIdea & { product_name: string }
        return changed
      },
    ],
    [
      'an extra field',
      () => {
        const changed = ideas()
        changed[0] = { ...changed[0]!, availability: 'in_stock' } as ModelGiftIdea & {
          availability: string
        }
        return changed
      },
    ],
    [
      'an out-of-range price',
      () => {
        const changed = ideas()
        changed[0] = { ...changed[0]!, observedPriceCents: 30_001 }
        return changed
      },
    ],
    [
      'a duplicate URL',
      () => {
        const changed = ideas()
        changed[1] = { ...changed[1]!, sourceUrl: changed[0]!.sourceUrl }
        return changed
      },
    ],
  ])('rejects synthesis containing %s', async (_label, invalidIdeas) => {
    const fetchImpl = successfulFetch({
      synthesisByModel: () => JSON.stringify({ ideas: invalidIdeas() }),
    })

    await expect(run(fetchImpl)).rejects.toEqual(
      expect.objectContaining<Partial<GiftSearchError>>({ reason: 'invalid_model_output' }),
    )
  })

  it('uses matching citation titles in the deterministic product policy check', async () => {
    const cited = ideas()
    const fetchImpl = vi.fn<OpenRouterGiftFetch>(async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { model: string; tools?: unknown }
      const research = Array.isArray(body.tools)
      const annotations = annotationsFor(cited)
      annotations[0]!.url_citation.title = 'Digital Gift Card'
      return jsonResponse(
        upstreamPayload({
          annotations: research ? annotations : [],
          kind: research ? 'research' : 'synthesis',
          model: body.model,
        }),
      )
    })

    await expect(run(fetchImpl)).rejects.toEqual(
      expect.objectContaining<Partial<GiftSearchError>>({ reason: 'invalid_model_output' }),
    )
  })

  it.each([408, 429, 503])(
    'retries a transient research HTTP %s with the fallback',
    async (status) => {
      let calls = 0
      const fetchImpl = vi.fn<OpenRouterGiftFetch>(async (_url, init) => {
        calls += 1
        if (calls === 1) return new Response(null, { status })
        const body = JSON.parse(String(init?.body)) as { model: string; tools?: unknown }
        const research = Array.isArray(body.tools)
        return jsonResponse(
          upstreamPayload({
            annotations: research ? annotationsFor(ideas()) : [],
            kind: research ? 'research' : 'synthesis',
            model: body.model,
          }),
        )
      })

      await expect(run(fetchImpl)).resolves.toMatchObject({ model: config.fallbackModel })
      expect(fetchImpl).toHaveBeenCalledTimes(3)
    },
  )

  it.each([400, 401, 403])('does not retry hard HTTP %s', async (status) => {
    const fetchImpl = vi.fn<OpenRouterGiftFetch>(async () => new Response(null, { status }))

    await expect(run(fetchImpl)).rejects.toEqual(
      expect.objectContaining<Partial<GiftSearchError>>({
        reason: 'http',
        upstream: expect.objectContaining({ status }),
      }),
    )
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('rejects a provider response for a different model', async () => {
    const fetchImpl = vi.fn<OpenRouterGiftFetch>(async () =>
      jsonResponse(
        upstreamPayload({
          annotations: annotationsFor(ideas()),
          kind: 'research',
          model: 'openrouter/other-model',
        }),
      ),
    )

    await expect(run(fetchImpl)).rejects.toEqual(
      expect.objectContaining<Partial<GiftSearchError>>({ reason: 'invalid_response' }),
    )
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('bounds provider response size before reading it', async () => {
    const fetchImpl = vi.fn<OpenRouterGiftFetch>(
      async () =>
        new Response('{}', {
          headers: { 'content-length': String(256 * 1024 + 1) },
          status: 200,
        }),
    )

    await expect(run(fetchImpl)).rejects.toEqual(
      expect.objectContaining<Partial<GiftSearchError>>({ reason: 'oversized_response' }),
    )
  })

  it('aborts the shared deadline without starting fallback work', async () => {
    vi.useFakeTimers()
    const fetchImpl = vi.fn<OpenRouterGiftFetch>(async (_url, init) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
      })
    })
    const timeoutConfig = { ...config, timeoutMs: 10 }
    const result = expect(run(fetchImpl, { config: timeoutConfig })).rejects.toEqual(
      expect.objectContaining<Partial<GiftSearchError>>({ reason: 'timeout' }),
    )

    await vi.advanceTimersByTimeAsync(11)

    await result
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(fetchImpl.mock.calls[0]?.[1]?.signal?.aborted).toBe(true)
  })

  it('keeps raw prompts, products, tokens, and upstream bodies out of thrown errors', async () => {
    const fetchImpl = vi.fn<OpenRouterGiftFetch>(async () =>
      jsonResponse({ error: { message: 'private body with product and token' } }),
    )

    let caught: unknown
    try {
      await run(fetchImpl)
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(GiftSearchError)
    expect(JSON.stringify(caught)).not.toContain('private body')
    expect(JSON.stringify(caught)).not.toContain(request.anonymousToken)
    expect(JSON.stringify(caught)).not.toContain(ideas()[0]!.name)
  })
})
