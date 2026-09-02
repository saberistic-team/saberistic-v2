import { describe, expect, it } from 'vitest'

import {
  buildGiftModelResponseFormat,
  isGiftRecommendationResponse,
  safeGiftSourceURL,
  validateGiftRecommendationRequest,
  validateModelGiftIdea,
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
    sourceUrl: `https://www.adafruit.com/products/gift-${index + 1}`,
    whyItFits: `A durable and thoughtful choice for a curious systems builder number ${index + 1}.`,
  }))
}

function recommendationResponse() {
  return {
    disclaimer: 'These are AI-created concepts and the suggested contribution is fixed.',
    ideas: giftIdeas([1_500, 2_500, 4_999, 5_000, 9_000, 14_999, 15_000, 22_000, 30_000]).map(
      (idea, index) => ({
        artworkAlt: `AI-generated concept artwork for ${idea.name}`,
        artworkUrl: `/api/gifts/artwork/inventory_${String(index + 1).padStart(8, '0')}`,
        category: idea.category,
        conceptDescription: `An AI-created description for gift concept ${index + 1}.`,
        currency: idea.currency,
        generatedAt: '2026-08-31T15:30:00.000Z',
        id: `offer_${String(index + 1).padStart(8, '0')}`,
        name: idea.name,
        quoteToken: `gq1.${'a'.repeat(40 + index)}.${'b'.repeat(43)}`,
        suggestedContributionCents: idea.observedPriceCents,
        whyItFits: idea.whyItFits,
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

  it('accepts model-authored references without response citations', () => {
    const ideas = giftIdeas([1_600, 2_400, 3_200, 5_500, 8_000, 12_000, 16_000, 22_000, 29_000])

    expect(validateModelGiftIdeas({ ideas }, 'mixed')).toEqual({
      ok: true,
      value: ideas,
    })
  })

  it('requires a mixed deck to include low, middle, and high price bands', () => {
    const ideas = giftIdeas([1_500, 1_800, 2_000, 2_200, 2_500, 2_800, 3_000, 3_400, 4_900])

    expect(validateModelGiftIdeas({ ideas }, 'mixed')).toEqual({
      error: 'The mixed deck did not cover enough price ranges.',
      ok: false,
    })
  })

  it('accepts a mixed deck spanning every required price band', () => {
    const ideas = giftIdeas([1_500, 2_500, 4_999, 5_000, 9_000, 14_999, 15_000, 22_000, 30_000])

    expect(validateModelGiftIdeas({ ideas }, 'mixed')).toEqual({
      ok: true,
      value: ideas,
    })
  })

  it('rejects output with extra fields even when its listings are otherwise valid', () => {
    const ideas = giftIdeas([1_000, 1_200, 1_400, 1_600, 1_800, 2_000, 2_200, 2_400, 3_000])
    const expanded = ideas.map((idea, index) =>
      index === 0 ? { ...idea, confidence: 0.99 } : idea,
    )

    expect(validateModelGiftIdeas({ ideas: expanded }, 'under_30')).toEqual({
      error: 'The gift scout returned an invalid deck.',
      ok: false,
    })
  })

  it.each([
    'https://learn.adafruit.com/products/gift-1',
    'https://www.adafruit.com.attacker.example/products/gift-1',
    'https://marketplace.example/products/gift-1',
  ])('rejects a product URL outside the exact reviewed host set: %s', (sourceUrl) => {
    const ideas = giftIdeas([1_000, 1_200, 1_400, 1_600, 1_800, 2_000, 2_200, 2_400, 3_000])
    const unapproved = ideas.map((idea, index) => (index === 0 ? { ...idea, sourceUrl } : idea))

    expect(validateModelGiftIdeas({ ideas: unapproved }, 'under_30')).toEqual({
      error: 'The gift scout returned an invalid deck.',
      ok: false,
    })
  })

  it.each([
    ['Digital gift card', 'Gift card'],
    ['Monthly maker box', 'Subscription'],
    ['Small-batch whiskey bottle', 'Beverage'],
    ['Daily vitamin set', 'Wellness supplement'],
    ['Crypto token voucher', 'Financial asset'],
    ['Compact camping knife', 'Outdoor tool'],
    ['Casino poker chip set', 'Game'],
    ['CBD relaxation gummies', 'Personal care'],
    ['Merino hoodie', 'Clothing'],
    ['Merino beanie', 'Accessories'],
    ['Leatherman Wave+ Multi-Tool', 'Everyday carry'],
  ])('rejects prohibited product identity %s', (name, category) => {
    const ideas = giftIdeas([1_000, 1_200, 1_400, 1_600, 1_800, 2_000, 2_200, 2_400, 3_000])
    const prohibited = ideas.map((idea, index) =>
      index === 0 ? { ...idea, category, name } : idea,
    )

    expect(validateModelGiftIdeas({ ideas: prohibited }, 'under_30')).toEqual({
      error: 'The gift scout returned an invalid deck.',
      ok: false,
    })
  })

  it.each([
    {
      whyItFits:
        'A compact desk comfort set with nourishing hand cream for long building sessions.',
    },
    { retailer: 'Leatherman' },
    { sourceUrl: 'https://www.adafruit.com/products/merino-%62eanie' },
    { name: `Merino be​anie` },
  ])('rejects prohibited product clues outside name and category: %o', (clue) => {
    const ideas = giftIdeas([1_000, 1_200, 1_400, 1_600, 1_800, 2_000, 2_200, 2_400, 3_000])
    const prohibited = ideas.map((idea, index) => (index === 0 ? { ...idea, ...clue } : idea))

    expect(validateModelGiftIdeas({ ideas: prohibited }, 'under_30')).toEqual({
      error: 'The gift scout returned an invalid deck.',
      ok: false,
    })
  })

  it('rejects a prohibited identity exposed only by the independent citation title', () => {
    const candidate = giftIdeas([1_500])[0]!
    expect(validateModelGiftIdea(candidate, 'under_30', 'Leatherman Wave+ multi-tool')).toBeNull()
  })

  it.each([
    'A collection of short stories',
    'Security token holder',
    'The Body of Knowledge desk book',
    'Axis design reference',
    'Spirited software teams',
    'Bottle opener stand',
  ])('keeps a safe near-miss valid: %s', (name) => {
    const candidate = { ...giftIdeas([1_500])[0]!, name }
    expect(validateModelGiftIdea(candidate, 'under_30')).toEqual(candidate)
  })

  it('does not reject ordinary retailer prose as a used, component, or battery listing', () => {
    const candidate = {
      ...giftIdeas([1_500])[0]!,
      whyItFits:
        'Designed to be used every day, with sturdy components and batteries included for convenience.',
    }

    expect(validateModelGiftIdea(candidate, 'under_30')).toEqual(candidate)
  })
})

describe('gift model response schema', () => {
  it('is strict, requires exactly nine ideas, and binds prices to the selected budget', () => {
    const responseFormat = buildGiftModelResponseFormat('75_to_150')
    const schema = responseFormat.json_schema.schema
    const ideaSchema = schema.properties.ideas.items

    expect(responseFormat.type).toBe('json_schema')
    expect(responseFormat.json_schema.strict).toBe(true)
    expect(responseFormat.json_schema.name).toBe('gift_inventory_research_batch')
    expect(schema.additionalProperties).toBe(false)
    expect(schema.properties.ideas).toMatchObject({ maxItems: 9, minItems: 9 })
    expect(ideaSchema.additionalProperties).toBe(false)
    expect(ideaSchema.properties.observedPriceCents).toMatchObject({
      description: expect.stringContaining('between 7500 and 15000 inclusive'),
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

  it('rejects duplicate offer IDs and concept names', () => {
    const response = recommendationResponse()
    const duplicateId = response.ideas.map((idea, index) =>
      index === 1 ? { ...idea, id: response.ideas[0]!.id } : idea,
    )
    const duplicateName = response.ideas.map((idea, index) =>
      index === 1 ? { ...idea, name: response.ideas[0]!.name } : idea,
    )

    expect(isGiftRecommendationResponse({ ...response, ideas: duplicateId })).toBe(false)
    expect(isGiftRecommendationResponse({ ...response, ideas: duplicateName })).toBe(false)
  })

  it('requires locally cached concept artwork and the searchedAt response timestamp', () => {
    const response = recommendationResponse()
    const remoteArtwork = response.ideas.map((idea, index) =>
      index === 0 ? { ...idea, artworkUrl: 'https://retailer.example/product.jpg' } : idea,
    )

    expect(isGiftRecommendationResponse({ ...response, ideas: remoteArtwork })).toBe(false)
    expect(response.ideas[0]).not.toHaveProperty('retailer')
    expect(response.ideas[0]).not.toHaveProperty('sourceUrl')
    expect(
      isGiftRecommendationResponse({
        ...response,
        generatedAt: response.searchedAt,
        searchedAt: undefined,
      }),
    ).toBe(false)
  })
})
