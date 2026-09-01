import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import type { GiftRecommendationRequest } from '@/lib/gifts'
import type { OpenRouterGiftConfig } from '@/lib/gifts/server/config'
import type { GiftListingLoader } from '@/lib/gifts/server/listing-verifier'
import {
  GiftSearchError,
  searchGiftIdeas,
  type OpenRouterGiftFetch,
} from '@/lib/gifts/server/openrouter'
import type { ModelGiftIdea } from '@/lib/gifts/validation'
import { verifiableGiftProductHosts } from '@/lib/gifts/retailers'

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
    sourceUrl: `https://www.adafruit.com/products/current-gift-${index + 1}`,
    whyItFits: `A useful and durable surprise for a design-conscious systems builder number ${index + 1}.`,
  }))
}

function verifiedAdafruitIdea(idea: ModelGiftIdea): ModelGiftIdea {
  return {
    ...idea,
    category: 'Builder find',
    retailer: 'Adafruit',
    whyItFits: 'A hands-on electronics find for a curious builder who values useful objects.',
  }
}

function verifiedIdeas(source: readonly ModelGiftIdea[] = ideas()): ModelGiftIdea[] {
  return source.map(verifiedAdafruitIdea)
}

function extraIdeas(start: number, count: number): ModelGiftIdea[] {
  return Array.from({ length: count }, (_, offset) => {
    const number = start + offset
    return {
      ...ideas()[7]!,
      name: `Current physical gift ${number}`,
      observedPriceCents: 18_000 + offset,
      retailer: `Verified Retailer ${number}`,
      sourceUrl: `https://www.adafruit.com/products/current-gift-${number}`,
    }
  })
}

function citationsFor(source: readonly ModelGiftIdea[]) {
  return source.map((idea) => ({
    type: 'url_citation',
    url_citation: { title: idea.name, url: idea.sourceUrl },
  }))
}

function annotations() {
  return citationsFor(ideas())
}

function listingHTML(idea: ModelGiftIdea) {
  const price = `${Math.floor(idea.observedPriceCents / 100)}.${String(idea.observedPriceCents % 100).padStart(2, '0')}`
  return `<!doctype html><html><head><script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: idea.name,
    offers: {
      '@type': 'Offer',
      availability: 'https://schema.org/InStock',
      price,
      priceCurrency: 'USD',
      url: idea.sourceUrl,
    },
  })}</script><title>${idea.name}</title><link rel="canonical" href="${idea.sourceUrl}"><meta property="og:url" content="${idea.sourceUrl}"><meta property="og:title" content="${idea.name}"></head></html>`
}

function successfulListingLoader(overrides: ReadonlyMap<string, ModelGiftIdea> = new Map()) {
  return vi.fn<GiftListingLoader>(async (url) => {
    const configured = overrides.get(url.toString())
    if (configured) return listingHTML(configured)

    const index = Number(url.pathname.match(/current-gift-(\d+)$/)?.[1])
    const base = ideas()[index - 1]
    const idea =
      base ??
      (index === 10
        ? {
            ...ideas()[0]!,
            name: 'Current physical gift 10',
            observedPriceCents: 18_000,
            retailer: 'Verified Retailer 10',
            sourceUrl: 'https://www.adafruit.com/products/current-gift-10',
          }
        : null)
    return idea ? listingHTML(idea) : null
  })
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

function synthesisPayload({
  content = JSON.stringify({
    candidateIds: Array.from(
      { length: 9 },
      (_, index) => `candidate_${String(index + 1).padStart(2, '0')}`,
    ),
  }),
  model = config.primaryModel,
}: {
  content?: string
  model?: string
} = {}) {
  return {
    choices: [
      {
        finish_reason: 'stop',
        message: { content, role: 'assistant' },
      },
    ],
    model,
    usage: {
      completion_tokens: 400,
      cost: 0.01,
      prompt_tokens: 700,
      total_tokens: 1_100,
    },
  }
}

function successfulFetch(
  researchPayload: unknown = upstreamPayload(),
  finalPayload: unknown = synthesisPayload(),
) {
  return vi.fn<OpenRouterGiftFetch>(async (_input, init) => {
    const requestBody = JSON.parse(String(init?.body)) as {
      model?: unknown
      response_format?: unknown
      tools?: unknown
    }
    const synthesis = requestBody.tools === undefined
    const payload = synthesis ? finalPayload : researchPayload
    const requestedModel = requestBody.model
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

function run(
  fetchImpl: OpenRouterGiftFetch,
  listingLoader: GiftListingLoader = successfulListingLoader(),
) {
  return searchGiftIdeas({
    config,
    fetchImpl,
    listingLoader,
    request,
    runId: 'run_1234567890123456',
    searchedAt: '2026-08-31T15:30:00.000Z',
  })
}

describe('OpenRouter gift search', () => {
  it('separates cited web research from strict no-tools synthesis', async () => {
    const fetchImpl = successfulFetch()

    const result = await run(fetchImpl)

    expect(result).toMatchObject({
      citations: 9,
      ideas: expect.any(Array),
      listingChecks: 9,
      model: config.primaryModel,
      searchModel: config.primaryModel,
      sourcePricesChanged: 9,
      usage: {
        completionTokens: 1_300,
        cost: 0.09,
        promptTokens: 1_900,
        searchRequests: 2,
        serverToolCalls: 0,
        totalTokens: 3_200,
      },
      verifiedCandidates: 9,
    })
    expect(result.ideas).toHaveLength(9)
    expect(fetchImpl).toHaveBeenCalledTimes(2)

    const [url, init] = fetchImpl.mock.calls[0] ?? []
    const [, synthesisInit] = fetchImpl.mock.calls[1] ?? []
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

    const researchBody = JSON.parse(String(init?.body)) as {
      max_completion_tokens?: unknown
      max_tokens?: unknown
      model?: unknown
      models?: unknown
      max_tool_calls?: unknown
      parallel_tool_calls?: unknown
      plugins?: unknown
      provider?: unknown
      response_format?: {
        json_schema?: {
          schema?: { properties?: { candidateIds?: { items?: unknown } } }
        }
      }
      stop_server_tools_when?: unknown
      tools?: unknown
      user?: unknown
    }
    const synthesisBody = JSON.parse(String(synthesisInit?.body)) as typeof researchBody
    expect(researchBody.tools).toEqual([
      {
        parameters: {
          allowed_domains: verifiableGiftProductHosts,
          engine: 'exa',
          max_characters: 1500,
          max_results: 20,
          max_uses: 2,
          max_total_results: 40,
        },
        type: 'openrouter:web_search',
      },
    ])
    expect(researchBody.max_tool_calls).toBe(2)
    expect(researchBody.parallel_tool_calls).toBe(false)
    expect(researchBody.stop_server_tools_when).toEqual([
      { step_count: 2, type: 'step_count_is' },
      { max_cost_in_dollars: 0.08, type: 'max_cost' },
    ])
    expect(researchBody).not.toHaveProperty('response_format')
    expect(synthesisBody.response_format).toMatchObject({
      json_schema: {
        name: 'gift_draft_selection',
        schema: {
          additionalProperties: false,
          properties: {
            candidateIds: {
              maxItems: 9,
              minItems: 9,
              type: 'array',
            },
          },
          required: ['candidateIds'],
          type: 'object',
        },
        strict: true,
      },
      type: 'json_schema',
    })
    expect(
      synthesisBody.response_format?.json_schema?.schema?.properties?.candidateIds?.items,
    ).toEqual({
      enum: Array.from(
        { length: 9 },
        (_, index) => `candidate_${String(index + 1).padStart(2, '0')}`,
      ),
      type: 'string',
    })
    expect(researchBody.plugins).toEqual([
      { enabled: false, id: 'context-compression' },
      { enabled: false, id: 'file-parser' },
      { enabled: false, id: 'fusion' },
      { enabled: false, id: 'pareto-router' },
      { enabled: false, id: 'response-healing' },
      { enabled: false, id: 'web' },
    ])
    expect(synthesisBody.plugins).toEqual(researchBody.plugins)
    expect(researchBody.provider).toEqual({
      allow_fallbacks: true,
      data_collection: 'deny',
      zdr: true,
    })
    expect(synthesisBody.provider).toEqual({
      allow_fallbacks: true,
      data_collection: 'deny',
      require_parameters: true,
      zdr: true,
    })
    expect(researchBody.model).toBe(config.primaryModel)
    expect(researchBody).not.toHaveProperty('models')
    expect(researchBody.max_completion_tokens).toBe(config.maxCompletionTokens)
    expect(researchBody).not.toHaveProperty('max_tokens')
    expect(synthesisBody.model).toBe(config.primaryModel)
    expect(synthesisBody).not.toHaveProperty('models')
    expect(synthesisBody.max_completion_tokens).toBe(config.maxCompletionTokens)
    expect(synthesisBody).not.toHaveProperty('max_tokens')
    expect(synthesisBody).not.toHaveProperty('tools')
    expect(researchBody.user).toMatch(/^[A-Za-z0-9_-]{40,}$/)
    expect(synthesisBody.user).toBe(researchBody.user)
    expect(researchBody.user).not.toBe(request.anonymousToken)
    expect(String(init?.body)).not.toContain(request.anonymousToken)
    expect(String(synthesisInit?.body)).not.toContain(request.anonymousToken)
  })

  it('exposes only retailer-verified candidate IDs to the strict selector', async () => {
    const prices = [
      1_500, 2_500, 4_500, 5_500, 9_000, 14_000, 15_000, 18_000, 22_000, 26_000, 28_000, 30_000,
    ]
    const researchIdeas = Array.from({ length: 12 }, (_, index): ModelGiftIdea => ({
      category: `Category ${index + 1}`,
      currency: 'usd',
      name: `Current physical gift ${index + 1}`,
      observedPriceCents: prices[index]!,
      retailer: `Verified Retailer ${index + 1}`,
      sourceUrl: `https://www.adafruit.com/products/current-gift-${index + 1}`,
      whyItFits: `A useful and durable surprise for a design-conscious systems builder number ${index + 1}.`,
    }))
    const responseAnnotations = researchIdeas.map((idea) => ({
      type: 'url_citation',
      url_citation: { title: idea.name, url: idea.sourceUrl },
    }))
    const listingLoader = vi.fn<GiftListingLoader>(async (url) => {
      const index = Number(url.pathname.match(/current-gift-(\d+)$/)?.[1]) - 1
      return index < 2 ? null : listingHTML(researchIdeas[index]!)
    })
    const fetchImpl = successfulFetch(
      upstreamPayload({
        annotations: responseAnnotations,
        content: JSON.stringify({ candidates: researchIdeas }),
      }),
      synthesisPayload({
        content: JSON.stringify({
          candidateIds: Array.from(
            { length: 9 },
            (_, index) => `candidate_${String(index + 1).padStart(2, '0')}`,
          ),
        }),
      }),
    )

    const result = await run(fetchImpl, listingLoader)

    expect(result).toMatchObject({ listingChecks: 12, verifiedCandidates: 10 })
    expect(result.ideas.map((idea) => idea.name)).toEqual(
      researchIdeas.slice(2, 11).map((idea) => idea.name),
    )
    const synthesisBody = JSON.parse(String(fetchImpl.mock.calls[1]?.[1]?.body)) as {
      response_format?: {
        json_schema?: {
          schema?: { properties?: { candidateIds?: { items?: { enum?: unknown } } } }
        }
      }
    }
    expect(
      synthesisBody.response_format?.json_schema?.schema?.properties?.candidateIds?.items?.enum,
    ).toEqual(
      Array.from({ length: 10 }, (_, index) => `candidate_${String(index + 1).padStart(2, '0')}`),
    )
  })

  it('merges distinct fallback listings after a primary listing shortage', async () => {
    const primaryIdeas = ideas()
    const fallbackIdeas = extraIdeas(10, 9)
    const defaultLoader = successfulListingLoader(
      new Map(fallbackIdeas.map((idea) => [idea.sourceUrl, idea])),
    )
    const listingLoader = vi.fn<GiftListingLoader>(async (url, signal) =>
      url.toString() === primaryIdeas[0]!.sourceUrl
        ? listingHTML(primaryIdeas[0]!).replace('schema.org/InStock', 'schema.org/OutOfStock')
        : defaultLoader(url, signal),
    )
    let researchCall = 0
    const fetchImpl = vi.fn<OpenRouterGiftFetch>(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as { model: string; tools?: unknown }
      if (!body.tools) {
        return Response.json(synthesisPayload({ model: body.model }), { status: 200 })
      }

      researchCall += 1
      return Response.json(
        upstreamPayload({
          annotations: citationsFor(researchCall === 1 ? primaryIdeas : fallbackIdeas),
          content: '{"status":"researched"}',
          model: body.model,
        }),
        { status: 200 },
      )
    })

    const result = await run(fetchImpl, listingLoader)

    expect(result).toMatchObject({
      citations: 18,
      ideas: verifiedIdeas([...primaryIdeas.slice(1), fallbackIdeas[0]!]),
      listingChecks: 18,
      model: config.primaryModel,
      searchModel: `${config.primaryModel}+${config.fallbackModel}`,
      sourcePricesChanged: 17,
      usage: {
        completionTokens: 2_200,
        cost: 0.17,
        promptTokens: 3_100,
        searchRequests: 4,
        serverToolCalls: 0,
        totalTokens: 5_300,
      },
      verifiedCandidates: 17,
    })
    expect(fetchImpl).toHaveBeenCalledTimes(3)
    const requestBodies = fetchImpl.mock.calls.map(([, init]) =>
      JSON.parse(String(init?.body)),
    ) as Array<{
      messages?: Array<{ content?: string }>
      model?: string
      response_format?: {
        json_schema?: {
          schema?: { properties?: { candidateIds?: { items?: { enum?: unknown } } } }
        }
      }
    }>
    expect(requestBodies.map((body) => body.model)).toEqual([
      config.primaryModel,
      config.fallbackModel,
      config.primaryModel,
    ])
    expect(fetchImpl.mock.calls[1]?.[1]?.signal).toBe(fetchImpl.mock.calls[0]?.[1]?.signal)
    expect(fetchImpl.mock.calls[2]?.[1]?.signal).toBe(fetchImpl.mock.calls[0]?.[1]?.signal)
    expect(String(fetchImpl.mock.calls[1]?.[1]?.body)).toContain(primaryIdeas[0]!.sourceUrl)
    expect(
      requestBodies[2]?.response_format?.json_schema?.schema?.properties?.candidateIds?.items?.enum,
    ).toEqual(
      Array.from({ length: 17 }, (_, index) => `candidate_${String(index + 1).padStart(2, '0')}`),
    )
    const selectorLedger = JSON.parse(requestBodies[2]?.messages?.at(-1)?.content ?? '{}') as {
      candidates?: Array<{ sourceUrl?: string }>
    }
    expect(selectorLedger.candidates?.map((candidate) => candidate.sourceUrl)).not.toContain(
      primaryIdeas[0]!.sourceUrl,
    )
    expect(selectorLedger.candidates?.map((candidate) => candidate.sourceUrl)).toContain(
      fallbackIdeas[0]!.sourceUrl,
    )
  })

  it('preserves eight primary citations and merges them with supplemental fallback research', async () => {
    const primaryIdeas = ideas().slice(0, 8)
    const fallbackIdeas = extraIdeas(10, 9)
    const listingLoader = successfulListingLoader(
      new Map(fallbackIdeas.map((idea) => [idea.sourceUrl, idea])),
    )
    let researchCall = 0
    const fetchImpl = vi.fn<OpenRouterGiftFetch>(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as { model: string; tools?: unknown }
      if (!body.tools) {
        return Response.json(synthesisPayload({ model: body.model }), { status: 200 })
      }

      researchCall += 1
      return Response.json(
        upstreamPayload({
          annotations: citationsFor(researchCall === 1 ? primaryIdeas : fallbackIdeas),
          content: '{"status":"researched"}',
          model: body.model,
        }),
        { status: 200 },
      )
    })

    const result = await run(fetchImpl, listingLoader)

    expect(result).toMatchObject({
      citations: 17,
      ideas: verifiedIdeas([...primaryIdeas, fallbackIdeas[0]!]),
      listingChecks: 17,
      searchModel: `${config.primaryModel}+${config.fallbackModel}`,
      sourcePricesChanged: 17,
      verifiedCandidates: 17,
    })
    expect(fetchImpl).toHaveBeenCalledTimes(3)
    expect(String(fetchImpl.mock.calls[1]?.[1]?.body)).toContain(primaryIdeas[0]!.sourceUrl)
  })

  it('supplements nine verified mixed-budget listings when one price band is missing', async () => {
    const primaryPrices = [1_500, 2_500, 4_500, 5_500, 9_000, 14_000, 3_500, 6_500, 12_000]
    const primaryIdeas = ideas().map((idea, index) => ({
      ...idea,
      observedPriceCents: primaryPrices[index]!,
    }))
    const fallbackIdeas = extraIdeas(10, 9)
    const listingLoader = successfulListingLoader(
      new Map([...primaryIdeas, ...fallbackIdeas].map((idea) => [idea.sourceUrl, idea] as const)),
    )
    let researchCall = 0
    const fetchImpl = vi.fn<OpenRouterGiftFetch>(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as { model: string; tools?: unknown }
      if (!body.tools) {
        return Response.json(
          synthesisPayload({
            content: JSON.stringify({
              candidateIds: [
                ...Array.from(
                  { length: 8 },
                  (_, index) => `candidate_${String(index + 1).padStart(2, '0')}`,
                ),
                'candidate_10',
              ],
            }),
            model: body.model,
          }),
          { status: 200 },
        )
      }

      researchCall += 1
      return Response.json(
        upstreamPayload({
          annotations: citationsFor(researchCall === 1 ? primaryIdeas : fallbackIdeas),
          content: '{"status":"researched"}',
          model: body.model,
        }),
        { status: 200 },
      )
    })

    const result = await run(fetchImpl, listingLoader)

    expect(result).toMatchObject({
      citations: 18,
      ideas: verifiedIdeas([...primaryIdeas.slice(0, 8), fallbackIdeas[0]!]),
      listingChecks: 18,
      searchModel: `${config.primaryModel}+${config.fallbackModel}`,
      verifiedCandidates: 18,
    })
    expect(fetchImpl).toHaveBeenCalledTimes(3)
    const fallbackBody = JSON.parse(String(fetchImpl.mock.calls[1]?.[1]?.body)) as {
      messages: Array<{ content: string; role: string }>
    }
    const fallbackUserPayload = JSON.parse(fallbackBody.messages[1]!.content) as {
      requiredPriceBands?: unknown
    }
    expect(fallbackUserPayload.requiredPriceBands).toEqual(['high'])
    expect(fallbackBody.messages[0]!.content).toContain(
      'Devote the searches to different exact product pages in the still-missing mixed-deck bands: high.',
    )
  })

  it('fails closed when supplemental research cannot make a three-band mixed deck', async () => {
    const primaryPrices = [1_500, 2_500, 4_500, 5_500, 9_000, 14_000, 3_500, 6_500, 12_000]
    const fallbackPrices = [1_600, 2_600, 4_600, 5_600, 9_100, 14_100, 3_600, 6_600, 12_100]
    const primaryIdeas = ideas().map((idea, index) => ({
      ...idea,
      observedPriceCents: primaryPrices[index]!,
    }))
    const fallbackIdeas = extraIdeas(10, 9).map((idea, index) => ({
      ...idea,
      observedPriceCents: fallbackPrices[index]!,
    }))
    const listingLoader = successfulListingLoader(
      new Map([...primaryIdeas, ...fallbackIdeas].map((idea) => [idea.sourceUrl, idea] as const)),
    )
    let researchCall = 0
    const fetchImpl = vi.fn<OpenRouterGiftFetch>(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as { model: string }
      researchCall += 1
      return Response.json(
        upstreamPayload({
          annotations: citationsFor(researchCall === 1 ? primaryIdeas : fallbackIdeas),
          content: '{"status":"researched"}',
          model: body.model,
        }),
        { status: 200 },
      )
    })

    await expect(run(fetchImpl, listingLoader)).rejects.toEqual(
      expect.objectContaining<Partial<GiftSearchError>>({
        reason: 'listing_verification',
        usage: expect.objectContaining({ cost: 0.16, searchRequests: 4 }),
        verification: expect.objectContaining({
          checked: 18,
          priceBands: { high: 0, low: 8, middle: 10 },
          sourcePricesChanged: 18,
          verified: 18,
        }),
      }),
    )
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('does not re-fetch fallback query or www variants of primary product URLs', async () => {
    const primaryIdeas = ideas().slice(0, 8)
    const fallbackIdeas = [
      ...primaryIdeas.map((idea) => ({
        ...idea,
        sourceUrl: idea.sourceUrl.replace('www.adafruit.com', 'adafruit.com') + '?ref=fallback',
      })),
      ideas()[8]!,
    ]
    const listingLoader = successfulListingLoader()
    let researchCall = 0
    const fetchImpl = vi.fn<OpenRouterGiftFetch>(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as { model: string; tools?: unknown }
      if (!body.tools) {
        return Response.json(synthesisPayload({ model: body.model }), { status: 200 })
      }

      researchCall += 1
      return Response.json(
        upstreamPayload({
          annotations: citationsFor(researchCall === 1 ? primaryIdeas : fallbackIdeas),
          content: '{"status":"researched"}',
          model: body.model,
        }),
        { status: 200 },
      )
    })

    const result = await run(fetchImpl, listingLoader)

    expect(result).toMatchObject({
      citations: 9,
      listingChecks: 9,
      sourcePricesChanged: 9,
      verifiedCandidates: 9,
    })
    expect(listingLoader).toHaveBeenCalledTimes(9)
    const loadedURLs = listingLoader.mock.calls.map(([url]) => url.toString())
    for (const duplicate of fallbackIdeas.slice(0, 8)) {
      expect(loadedURLs).not.toContain(duplicate.sourceUrl)
    }
    expect(fetchImpl).toHaveBeenCalledTimes(3)
  })

  it('does not start a third research call after provider fallback still has too few listings', async () => {
    const defaultLoader = successfulListingLoader()
    const listingLoader = vi.fn<GiftListingLoader>(async (url, signal) =>
      url.toString() === ideas()[0]!.sourceUrl
        ? listingHTML(ideas()[0]!).replace('schema.org/InStock', 'schema.org/OutOfStock')
        : defaultLoader(url, signal),
    )
    let researchCall = 0
    const fetchImpl = vi.fn<OpenRouterGiftFetch>(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as { model: string }
      researchCall += 1
      return Response.json(
        researchCall === 1
          ? upstreamPayload({ annotations: [], model: body.model })
          : upstreamPayload({ model: body.model }),
        { status: 200 },
      )
    })

    await expect(run(fetchImpl, listingLoader)).rejects.toEqual(
      expect.objectContaining<Partial<GiftSearchError>>({
        reason: 'listing_verification',
        usage: expect.objectContaining({ cost: 0.16, searchRequests: 4 }),
        verification: expect.objectContaining({
          checked: 9,
          rejections: { availability: 1 },
          sourcePricesChanged: 8,
          verified: 8,
        }),
      }),
    )
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(fetchImpl.mock.calls.map(([, init]) => JSON.parse(String(init?.body)).model)).toEqual([
      config.primaryModel,
      config.fallbackModel,
    ])
    expect(fetchImpl.mock.calls[1]?.[1]?.signal).toBe(fetchImpl.mock.calls[0]?.[1]?.signal)
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
    ).resolves.toMatchObject({
      usage: { searchRequests: 0, serverToolCalls: 2 },
    })
  })

  it('prefers the web-search-specific usage counter over a broader tool total', async () => {
    const payload = upstreamPayload()
    const { server_tool_use: _legacyCounter, ...usage } = payload.usage

    await expect(
      run(
        successfulFetch({
          ...payload,
          usage: {
            ...usage,
            server_tool_use_details: {
              tool_calls_executed: 4,
              tool_calls_requested: 4,
              web_search_requests: 2,
            },
          },
        }),
      ),
    ).resolves.toMatchObject({
      usage: { searchRequests: 2, serverToolCalls: 4 },
    })
  })

  it('rejects research that reports more than two actual searches', async () => {
    await expect(run(successfulFetch(upstreamPayload({ searchRequests: 3 })))).rejects.toEqual(
      expect.objectContaining<Partial<GiftSearchError>>({ reason: 'invalid_response' }),
    )
  })

  it('requires URL citations even when usage reports a search request', async () => {
    await expect(run(successfulFetch(upstreamPayload({ annotations: [] })))).rejects.toEqual(
      expect.objectContaining<Partial<GiftSearchError>>({ reason: 'no_search' }),
    )
  })

  it('requires a bounded title for every citation admitted as product evidence', async () => {
    const untitled = ideas().map((idea) => ({
      type: 'url_citation',
      url_citation: { url: idea.sourceUrl },
    }))

    await expect(run(successfulFetch(upstreamPayload({ annotations: untitled })))).rejects.toEqual(
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

  it.each([408, 429, 503])(
    'tries the fallback model after retryable HTTP status %i using the same deadline',
    async (status) => {
      let attempt = 0
      const fetchImpl = vi.fn<OpenRouterGiftFetch>(async (_input, init) => {
        const body = JSON.parse(String(init?.body)) as {
          model: string
          tools?: unknown
        }
        attempt += 1
        if (attempt === 1) {
          return Response.json({ error: { message: 'provider unavailable' } }, { status })
        }

        return Response.json(
          body.tools
            ? upstreamPayload({ model: body.model })
            : synthesisPayload({ model: body.model }),
          { status: 200 },
        )
      })

      const result = await run(fetchImpl)

      expect(result.model).toBe(config.primaryModel)
      expect(result.searchModel).toBe(config.fallbackModel)
      expect(fetchImpl).toHaveBeenCalledTimes(3)
      const requestBodies = fetchImpl.mock.calls.map(([, init]) =>
        JSON.parse(String(init?.body)),
      ) as Array<Record<string, unknown>>
      expect(requestBodies.map((body) => body.model)).toEqual([
        config.primaryModel,
        config.fallbackModel,
        config.primaryModel,
      ])
      expect(requestBodies.every((body) => !Object.hasOwn(body, 'models'))).toBe(true)
      expect(fetchImpl.mock.calls[1]?.[1]?.signal).toBe(fetchImpl.mock.calls[0]?.[1]?.signal)
      expect(fetchImpl.mock.calls[2]?.[1]?.signal).toBe(fetchImpl.mock.calls[0]?.[1]?.signal)
    },
  )

  it('tries fallback research after the primary returns no usable search evidence', async () => {
    let attempt = 0
    const fetchImpl = vi.fn<OpenRouterGiftFetch>(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as {
        model: string
        tools?: unknown
      }
      attempt += 1
      return Response.json(
        attempt === 1
          ? upstreamPayload({ annotations: [], model: body.model })
          : body.tools
            ? upstreamPayload({ model: body.model })
            : synthesisPayload({ model: body.model }),
        { status: 200 },
      )
    })

    await expect(run(fetchImpl)).resolves.toMatchObject({
      model: config.primaryModel,
      searchModel: config.fallbackModel,
    })
    expect(fetchImpl).toHaveBeenCalledTimes(3)
  })

  it('tries fallback synthesis after a locally invalid primary selection', async () => {
    let synthesisAttempt = 0
    const fetchImpl = vi.fn<OpenRouterGiftFetch>(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as {
        model: string
        response_format?: unknown
        tools?: unknown
      }
      if (body.tools) {
        return Response.json(upstreamPayload({ model: body.model }), { status: 200 })
      }

      synthesisAttempt += 1
      return Response.json(
        synthesisAttempt === 1
          ? synthesisPayload({ content: '{"candidateIds":[]}', model: body.model })
          : synthesisPayload({ model: body.model }),
        { status: 200 },
      )
    })

    const result = await run(fetchImpl)
    expect(result).toMatchObject({
      model: config.fallbackModel,
      searchModel: config.primaryModel,
      usage: {
        completionTokens: 1_700,
        promptTokens: 2_600,
        totalTokens: 4_300,
      },
    })
    expect(result.usage.cost).toBeCloseTo(0.1)
    expect(fetchImpl).toHaveBeenCalledTimes(3)
    expect(fetchImpl.mock.calls[1]?.[1]?.signal).toBe(fetchImpl.mock.calls[0]?.[1]?.signal)
    expect(fetchImpl.mock.calls[2]?.[1]?.signal).toBe(fetchImpl.mock.calls[0]?.[1]?.signal)
  })

  it('ignores tentative prices and derives current retailer facts without wasting fallback', async () => {
    const primaryIdeas = ideas().map((idea, index) =>
      index === 0 ? { ...idea, observedPriceCents: 30_001 } : idea,
    )
    const fallbackIdeas = ideas().map((idea) => ({
      category: idea.category,
      currency: idea.currency,
      observed_price_cents: idea.observedPriceCents,
      product_name: idea.name,
      retailer: idea.retailer,
      source_url: idea.sourceUrl,
      why_it_fits: idea.whyItFits,
    }))
    const fetchImpl = vi.fn<OpenRouterGiftFetch>(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as {
        model: string
        tools?: unknown
      }
      if (!body.tools) {
        return Response.json(synthesisPayload({ model: body.model }), { status: 200 })
      }

      return Response.json(
        upstreamPayload({
          content: JSON.stringify({
            candidates: body.model === config.primaryModel ? primaryIdeas : fallbackIdeas,
          }),
          model: body.model,
        }),
        { status: 200 },
      )
    })

    const result = await run(fetchImpl)

    expect(result.searchModel).toBe(config.primaryModel)
    expect(result.model).toBe(config.primaryModel)
    expect(result.ideas).toEqual(verifiedIdeas())
    expect(result.sourcePricesChanged).toBe(9)
    expect(result.usage).toMatchObject({
      completionTokens: 1_300,
      cost: 0.09,
      promptTokens: 1_900,
      searchRequests: 2,
      totalTokens: 3_200,
    })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('aborts the shared deadline without starting a fallback or synthesis call', async () => {
    vi.useFakeTimers()
    try {
      let requestSignal: AbortSignal | undefined
      const fetchImpl = vi.fn<OpenRouterGiftFetch>(
        async (_input, init) =>
          new Promise<Response>((_resolve, reject) => {
            requestSignal = init?.signal ?? undefined
            requestSignal?.addEventListener('abort', () => reject(new Error('aborted')), {
              once: true,
            })
          }),
      )

      const result = expect(run(fetchImpl)).rejects.toEqual(
        expect.objectContaining<Partial<GiftSearchError>>({ reason: 'timeout' }),
      )
      await vi.advanceTimersByTimeAsync(config.timeoutMs)

      await result
      expect(requestSignal?.aborted).toBe(true)
      expect(fetchImpl).toHaveBeenCalledOnce()
    } finally {
      vi.useRealTimers()
    }
  })

  it('preserves completed research usage when strict synthesis reaches the shared deadline', async () => {
    vi.useFakeTimers()
    try {
      let synthesisSignal: AbortSignal | undefined
      const fetchImpl = vi.fn<OpenRouterGiftFetch>(async (_input, init) => {
        const body = JSON.parse(String(init?.body)) as { tools?: unknown }
        if (body.tools) return Response.json(upstreamPayload(), { status: 200 })

        return new Promise<Response>((_resolve, reject) => {
          synthesisSignal = init?.signal ?? undefined
          synthesisSignal?.addEventListener('abort', () => reject(new Error('aborted')), {
            once: true,
          })
        })
      })

      const result = expect(run(fetchImpl)).rejects.toEqual(
        expect.objectContaining<Partial<GiftSearchError>>({
          reason: 'timeout',
          usage: expect.objectContaining({
            completionTokens: 900,
            cost: 0.08,
            promptTokens: 1_200,
            searchRequests: 2,
            totalTokens: 2_100,
          }),
        }),
      )
      await vi.advanceTimersByTimeAsync(config.timeoutMs)

      await result
      expect(synthesisSignal?.aborted).toBe(true)
      expect(fetchImpl).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('preserves billed invalid primary research usage when fallback research times out', async () => {
    vi.useFakeTimers()
    try {
      const fetchImpl = vi.fn<OpenRouterGiftFetch>(async (_input, init) => {
        if (fetchImpl.mock.calls.length === 1) {
          return Response.json(upstreamPayload({ annotations: [] }), { status: 200 })
        }

        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), {
            once: true,
          })
        })
      })

      const result = expect(run(fetchImpl)).rejects.toEqual(
        expect.objectContaining<Partial<GiftSearchError>>({
          reason: 'timeout',
          usage: expect.objectContaining({
            completionTokens: 900,
            cost: 0.08,
            promptTokens: 1_200,
            searchRequests: 2,
            totalTokens: 2_100,
          }),
        }),
      )
      await vi.advanceTimersByTimeAsync(config.timeoutMs)

      await result
      expect(fetchImpl).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('preserves billed primary synthesis usage when fallback synthesis times out', async () => {
    vi.useFakeTimers()
    try {
      const fetchImpl = vi.fn<OpenRouterGiftFetch>(async (_input, init) => {
        const body = JSON.parse(String(init?.body)) as { tools?: unknown }
        if (body.tools) return Response.json(upstreamPayload(), { status: 200 })
        if (fetchImpl.mock.calls.length === 2) {
          return Response.json(synthesisPayload({ content: '{"candidateIds":[]}' }), {
            status: 200,
          })
        }

        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), {
            once: true,
          })
        })
      })

      const result = expect(run(fetchImpl)).rejects.toEqual(
        expect.objectContaining<Partial<GiftSearchError>>({
          reason: 'timeout',
          usage: expect.objectContaining({
            completionTokens: 1_300,
            cost: 0.09,
            promptTokens: 1_900,
            searchRequests: 2,
            totalTokens: 3_200,
          }),
        }),
      )
      await vi.advanceTimersByTimeAsync(config.timeoutMs)

      await result
      expect(fetchImpl).toHaveBeenCalledTimes(3)
    } finally {
      vi.useRealTimers()
    }
  })

  it.each([400, 401, 402, 403, 404])(
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
    ['freeform text', 'A freeform research brief.'],
    [
      'noncanonical fields',
      JSON.stringify({
        candidates: ideas().map(() => ({
          ADDRESS: 'not-a-url',
          observed_price_cents: 999_999,
          product_name: 'Leatherman Wave+ multi-tool',
          source_url: 'https://example.com/untrusted',
          unexpected: true,
        })),
      }),
    ],
  ])('ignores model-authored %s and trusts cited retailer pages', async (_label, content) => {
    const fetchImpl = successfulFetch(upstreamPayload({ content }))

    await expect(run(fetchImpl)).resolves.toMatchObject({
      ideas: verifiedIdeas(),
      sourcePricesChanged: 9,
    })
    const synthesisBody = JSON.parse(String(fetchImpl.mock.calls[1]?.[1]?.body)) as Record<
      string,
      unknown
    >
    expect(synthesisBody).not.toHaveProperty('tools')
    expect(synthesisBody.provider).toMatchObject({ require_parameters: true })
  })

  it('does not treat a citation title as retailer-verified product identity', async () => {
    const responseAnnotations = annotations()
    responseAnnotations[0] = {
      ...responseAnnotations[0]!,
      url_citation: {
        ...responseAnnotations[0]!.url_citation,
        title: 'Leatherman Wave+ multi-tool',
      },
    }

    await expect(
      run(successfulFetch(upstreamPayload({ annotations: responseAnnotations }))),
    ).resolves.toMatchObject({ ideas: verifiedIdeas() })
  })

  it('uses the exact current offer price instead of trusting an in-range model price', async () => {
    const changedResearch = ideas().map((idea, index) =>
      index === 0 ? { ...idea, observedPriceCents: 1_600 } : idea,
    )

    await expect(
      run(
        successfulFetch(upstreamPayload({ content: JSON.stringify({ ideas: changedResearch }) })),
      ),
    ).resolves.toMatchObject({
      ideas: expect.arrayContaining([
        expect.objectContaining({
          observedPriceCents: ideas()[0]!.observedPriceCents,
          sourceUrl: changedResearch[0]!.sourceUrl,
        }),
      ]),
      sourcePricesChanged: 9,
    })
  })

  it('does not inflate verified inventory with duplicate fallback citations', async () => {
    const defaultLoader = successfulListingLoader()
    const listingLoader = vi.fn<GiftListingLoader>(async (url, signal) =>
      url.toString() === ideas()[0]!.sourceUrl
        ? listingHTML(ideas()[0]!).replace('schema.org/InStock', 'schema.org/OutOfStock')
        : defaultLoader(url, signal),
    )
    const fetchImpl = successfulFetch()

    await expect(run(fetchImpl, listingLoader)).rejects.toEqual(
      expect.objectContaining<Partial<GiftSearchError>>({
        reason: 'listing_verification',
        usage: expect.objectContaining({
          completionTokens: 1_800,
          cost: 0.16,
          promptTokens: 2_400,
          searchRequests: 4,
          totalTokens: 4_200,
        }),
        verification: expect.objectContaining({
          checked: 9,
          rejections: { availability: 1 },
          sourcePricesChanged: 8,
          verified: 8,
        }),
      }),
    )
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(fetchImpl.mock.calls.map(([, init]) => JSON.parse(String(init?.body)).model)).toEqual([
      config.primaryModel,
      config.fallbackModel,
    ])
  })

  it('preserves an exact retailer-verified price without letting synthesis rewrite it', async () => {
    const changedResearch = ideas().map((idea, index) =>
      index === 0 ? { ...idea, observedPriceCents: 1_600 } : idea,
    )
    const listingLoader = successfulListingLoader(
      new Map([[changedResearch[0]!.sourceUrl, changedResearch[0]!]]),
    )

    await expect(
      run(
        successfulFetch(upstreamPayload({ content: JSON.stringify({ ideas: changedResearch }) })),
        listingLoader,
      ),
    ).resolves.toMatchObject({
      ideas: expect.arrayContaining([
        expect.objectContaining({
          observedPriceCents: 1_600,
          sourceUrl: changedResearch[0]?.sourceUrl,
        }),
      ]),
    })
  })

  it('uses cited retailer facts despite out-of-range or extra model-authored fields', async () => {
    const baseIdeas = ideas()
    const extraIdea: ModelGiftIdea = {
      ...baseIdeas[0]!,
      name: 'Current physical gift 10',
      observedPriceCents: 18_000,
      retailer: 'Verified Retailer 10',
      sourceUrl: 'https://www.adafruit.com/products/current-gift-10',
    }
    const firstURL = baseIdeas[0]!.sourceUrl
    const researchIdeas = [
      { ...baseIdeas[0]!, observedPriceCents: 30_001 },
      ...baseIdeas.slice(1),
      extraIdea,
    ]
    const responseAnnotations = researchIdeas.map((idea) => ({
      type: 'url_citation',
      url_citation: { title: idea.name, url: idea.sourceUrl },
    }))

    const result = await run(
      successfulFetch(
        upstreamPayload({
          annotations: responseAnnotations,
          content: JSON.stringify({ candidates: researchIdeas }),
        }),
      ),
    )

    expect(result.ideas).toHaveLength(9)
    expect(result.ideas.every((idea) => idea.observedPriceCents <= 30_000)).toBe(true)
    expect(result.ideas).toContainEqual(verifiedAdafruitIdea(baseIdeas[0]!))
    expect(result.ideas).not.toContainEqual(verifiedAdafruitIdea(extraIdea))

    const unknownFieldIdeas = [
      { ...baseIdeas[0]!, salePrice: '$15.00' },
      ...baseIdeas.slice(1),
      extraIdea,
    ]
    const unknownFieldResult = await run(
      successfulFetch(
        upstreamPayload({
          annotations: unknownFieldIdeas.map((idea) => ({
            type: 'url_citation',
            url_citation: { title: idea.name, url: idea.sourceUrl },
          })),
          content: JSON.stringify({ candidates: unknownFieldIdeas }),
        }),
      ),
    )
    expect(unknownFieldResult.ideas.some((idea) => idea.sourceUrl === firstURL)).toBe(true)
  })

  it.each([
    ['non-JSON synthesis', 'not valid JSON'],
    ['noncanonical synthesis keys', JSON.stringify({ selections: [] })],
    [
      'duplicate candidate IDs',
      JSON.stringify({
        candidateIds: Array.from({ length: 9 }, () => 'candidate_01'),
      }),
    ],
    [
      'unknown candidate ID',
      JSON.stringify({
        candidateIds: [
          ...Array.from(
            { length: 8 },
            (_, index) => `candidate_${String(index + 1).padStart(2, '0')}`,
          ),
          'candidate_99',
        ],
      }),
    ],
  ])('rejects malformed strict synthesis: %s', async (_label, content) => {
    await expect(
      run(successfulFetch(upstreamPayload(), synthesisPayload({ content }))),
    ).rejects.toEqual(
      expect.objectContaining<Partial<GiftSearchError>>({ reason: 'invalid_model_output' }),
    )
  })

  it('fails closed when supplemental research still leaves fewer than nine listings', async () => {
    const fetchImpl = successfulFetch(upstreamPayload({ annotations: annotations().slice(0, 8) }))

    await expect(run(fetchImpl)).rejects.toEqual(
      expect.objectContaining<Partial<GiftSearchError>>({
        reason: 'listing_verification',
        usage: expect.objectContaining({ cost: 0.16, searchRequests: 4 }),
        verification: expect.objectContaining({ checked: 8, verified: 8 }),
      }),
    )
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })
})
