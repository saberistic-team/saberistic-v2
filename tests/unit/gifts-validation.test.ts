import { describe, expect, it } from 'vitest'

import {
  buildGiftModelResponseFormat,
  isGiftRecommendationResponse,
  safeGiftSourceURL,
  validateGiftRecommendationRequest,
  validateModelGiftIdeas,
  type ModelGiftIdea,
} from '@/lib/gifts/validation'

const validRequest = {
  anonymousToken: 'anonymous_token_1234567890',
  budget: 'mixed',
  theme: 'build_fuel',
  variationSeed: 'variation_seed_1234567890',
} as const

function giftIdeas(prices: readonly number[]): ModelGiftIdea[] {
  return prices.map((observedPriceCents, index) => ({
    category: `Category ${index + 1}`,
    currency: 'usd',
    name: `Verified gift idea ${index + 1}`,
    observedPriceCents,
    retailer: `Retailer ${index + 1}`,
    sourceUrl: `https://shop${index + 1}.example/products/gift-${index + 1}`,
    whyItFits: `A durable and thoughtful choice for a curious systems builder number ${index + 1}.`,
  }))
}

function citedURLs(ideas: readonly ModelGiftIdea[]): Set<string> {
  return new Set(ideas.map((idea) => idea.sourceUrl))
}

function recommendationResponse() {
  return {
    disclaimer: 'Prices are approximate and the contribution is fixed.',
    ideas: giftIdeas([1_500, 2_500, 4_999, 5_000, 9_000, 14_999, 15_000, 22_000, 30_000]).map(
      (idea, index) => ({
        ...idea,
        checkedAt: '2026-08-31T15:30:00.000Z',
        id: `offer_${String(index + 1).padStart(8, '0')}`,
        quoteToken: `gq1.${'a'.repeat(40 + index)}.${'b'.repeat(43)}`,
      }),
    ),
    runId: 'run_1234567890123456',
    searchedAt: '2026-08-31T15:30:00.000Z',
  }
}

describe('gift recommendation request validation', () => {
  it('accepts the exact anonymous game request contract', () => {
    expect(validateGiftRecommendationRequest(validRequest)).toEqual({
      ok: true,
      value: validRequest,
    })
  })

  it.each([
    { ...validRequest, unexpected: true },
    { ...validRequest, anonymousToken: 'too-short' },
    { ...validRequest, budget: 'anything_goes' },
    { ...validRequest, theme: 'private_profile' },
    { ...validRequest, variationSeed: 'contains spaces and punctuation!' },
  ])('rejects malformed or expanded request input: %j', (value) => {
    expect(validateGiftRecommendationRequest(value)).toEqual({
      error: 'Review the gift settings and try again.',
      ok: false,
    })
  })
})

describe('gift model output validation', () => {
  it('rejects oversized source URLs before they can enter signed Stripe metadata', () => {
    expect(
      safeGiftSourceURL(`https://shop.example/products/gift?ref=${'a'.repeat(500)}`),
    ).toBeNull()
  })

  it('requires all nine listings to be backed by response citations', () => {
    const ideas = giftIdeas([1_600, 2_400, 3_200, 5_500, 8_000, 12_000, 16_000, 22_000, 29_000])
    const citations = citedURLs(ideas)
    citations.delete(ideas[8]!.sourceUrl)

    expect(validateModelGiftIdeas({ ideas }, 'mixed', citations)).toEqual({
      error: 'The gift scout could not verify every listing.',
      ok: false,
    })
  })

  it('normalizes harmless citation fragments before matching a listing', () => {
    const ideas = giftIdeas([1_600, 2_400, 3_200, 5_500, 8_000, 12_000, 16_000, 22_000, 29_000])
    const citations = new Set(ideas.map((idea) => `${idea.sourceUrl}#purchase-panel`))

    expect(validateModelGiftIdeas({ ideas }, 'mixed', citations)).toEqual({
      ok: true,
      value: ideas,
    })
  })

  it('requires a mixed deck to include low, middle, and high price bands', () => {
    const ideas = giftIdeas([1_500, 1_800, 2_000, 2_200, 2_500, 2_800, 3_000, 3_400, 4_900])

    expect(validateModelGiftIdeas({ ideas }, 'mixed', citedURLs(ideas))).toEqual({
      error: 'The mixed deck did not cover enough price ranges.',
      ok: false,
    })
  })

  it('accepts a cited mixed deck spanning every required price band', () => {
    const ideas = giftIdeas([1_500, 2_500, 4_999, 5_000, 9_000, 14_999, 15_000, 22_000, 30_000])

    expect(validateModelGiftIdeas({ ideas }, 'mixed', citedURLs(ideas))).toEqual({
      ok: true,
      value: ideas,
    })
  })

  it('rejects output with extra fields even when its listings are otherwise valid', () => {
    const ideas = giftIdeas([1_000, 1_200, 1_400, 1_600, 1_800, 2_000, 2_200, 2_400, 3_000])
    const expanded = ideas.map((idea, index) =>
      index === 0 ? { ...idea, confidence: 0.99 } : idea,
    )

    expect(validateModelGiftIdeas({ ideas: expanded }, 'under_30', citedURLs(ideas))).toEqual({
      error: 'The gift scout returned an invalid deck.',
      ok: false,
    })
  })
})

describe('gift model response schema', () => {
  it('is strict, requires exactly nine ideas, and binds prices to the selected budget', () => {
    const responseFormat = buildGiftModelResponseFormat('75_to_150')
    const schema = responseFormat.json_schema.schema
    const ideaSchema = schema.properties.ideas.items

    expect(responseFormat.type).toBe('json_schema')
    expect(responseFormat.json_schema.strict).toBe(true)
    expect(schema.additionalProperties).toBe(false)
    expect(schema.properties.ideas).toMatchObject({ maxItems: 9, minItems: 9 })
    expect(ideaSchema.additionalProperties).toBe(false)
    expect(ideaSchema.properties.observedPriceCents).toEqual({
      maximum: 15_000,
      minimum: 7_500,
      type: 'integer',
    })
    expect(ideaSchema.required).toEqual([
      'category',
      'currency',
      'name',
      'observedPriceCents',
      'retailer',
      'sourceUrl',
      'whyItFits',
    ])
  })
})

describe('gift browser response validation', () => {
  it('accepts a complete response and rejects a non-string run ID', () => {
    const response = recommendationResponse()
    expect(isGiftRecommendationResponse(response)).toBe(true)
    expect(isGiftRecommendationResponse({ ...response, runId: 1234567890123456 })).toBe(false)
  })

  it('rejects duplicate offer IDs and listing URLs', () => {
    const response = recommendationResponse()
    const duplicateId = response.ideas.map((idea, index) =>
      index === 1 ? { ...idea, id: response.ideas[0]!.id } : idea,
    )
    const duplicateURL = response.ideas.map((idea, index) =>
      index === 1 ? { ...idea, sourceUrl: response.ideas[0]!.sourceUrl } : idea,
    )

    expect(isGiftRecommendationResponse({ ...response, ideas: duplicateId })).toBe(false)
    expect(isGiftRecommendationResponse({ ...response, ideas: duplicateURL })).toBe(false)
  })
})
