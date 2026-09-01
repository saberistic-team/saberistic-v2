import {
  giftBudgetById,
  giftBudgetIds,
  giftThemeIds,
  type GiftBudgetId,
  type GiftIdea,
  type GiftRecommendationRequest,
  type GiftRecommendationResponse,
  type GiftThemeId,
} from './types'
import { isApprovedGiftProductHost } from './retailers'

type ValidationResult<T> = { ok: true; value: T } | { error: string; ok: false }

export type ModelGiftIdea = Omit<GiftIdea, 'checkedAt' | 'id' | 'quoteToken'>

const tokenPattern = /^[A-Za-z0-9_-]{16,160}$/
const modelTextPattern = /^[^\u0000-\u001f\u007f]+$/
const prohibitedGiftProductPatterns = [
  /\bgift\s*cards?\b/i,
  /\b(?:gift certificates?|store credit|subscriptions?|memberships?|monthly boxes?|annual plans?)\b/i,
  /\b(?:crowdfunding|crowdfunded|kickstarter|gofundme|fundraisers?|donations?|pledges?)\b/i,
  /\b(?:alcohol|beer|wine|liquor|spirits?|whisk(?:e)?y|bourbon|scotch|vodka|rum|gin|tequila|mezcal|cognac|brandy|champagne|sake|liqueur)\b/i,
  /\b(?:tobacco|cigars?|cigarettes?|nicotine|vapes?|vaping|hookah|shisha|e cigarettes?|e liquid|rolling papers?|smoking pipes?|ashtrays?|snuff)\b/i,
  /\b(?:weapons?|firearms?|guns?|ammunition|knives?|knife|blades?|axes?|daggers?|swords?|hatchets?|tomahawks?|machetes?|crossbows?|slingshots?|brass knuckles|box cutters?|utility knives?|pepper spray|stun guns?|switchblades?|multi tools?|leatherman|swiss army|self defense)\b/i,
  /\b(?:supplements?|vitamins?|protein powder|creatine|collagen|probiotics?|nootropics?|melatonin|pre workout)\b/i,
  /\b(?:medical products?|medications?|medicine|first aid|thermometers?|pulse oximeters?|glucose monitors?|diagnostic tests?|sleep aids?|pain relief)\b/i,
  /\b(?:cash equivalents?|financial assets?|cryptocurrency|crypto tokens?|bitcoin|ethereum|nfts?|stablecoins?|bullion|prepaid cards?|securities)\b/i,
  /\b(?:gambling|casino|lottery|poker chips?|sports betting|sportsbook|roulette|blackjack|slot machines?|wagering|betting)\b/i,
  /\b(?:apparel|clothing|shirts?|t shirts?|tee shirts?|tees?|pants|trousers?|jeans|shorts|shoes?|footwear|sneakers?|boots?|sandals?|slippers?|jackets?|coats?|vests?|hoodies?|sweaters?|cardigans?|beanies?|hats?|caps?|socks?|scarves?|dress(?:es)?|skirts?|gloves?|mittens?|underwear|boxers?|lingerie|bras?|pajamas?|swimwear|belts?)\b/i,
  /\b(?:personal care|skin care|cosmetics?|makeup|fragrances?|perfume|cologne|deodorant|shampoo|conditioner|grooming|razors?|toiletries|soap|sunscreen|bath bombs?|toothbrushes?|nail polish|manicures?|pedicures?)\b/i,
  /\b(?:hand|body|face|facial|eye|skin|hair|beard|shaving|lip) (?:balm|cream|lotion|oil|wash|cleanser|serum|mask|scrub)s?\b/i,
  /\b(?:cannabis|marijuana|cbd|thc|hemp extract|cannabis edibles?|delta 8|delta 9|cannabinoids?)\b/i,
  /\b(?:adult (?:products?|toys?|content)|sex toys?|vibrators?|dildos?|bondage|fetish|erotic|condoms?)\b/i,
  /\b(?:used|pre[ -]?owned|refurbished|open[ -]?box|pre[ -]?orders?|back[ -]?orders?)\b/i,
  /\b(?:replacement|spare parts?|refills?|samples?|add[ -]?ons?)\b/i,
  /\b(?:batter(?:y|ies)|breakout boards?|development boards?|microcontrollers?|single[ -]?board computers?|sensors?|electronic modules?|components?|bare pcbs?|printed circuit boards?|ribbon cables?|jumper wires?|pin headers?|solder paste|thermal paste|adhesive strips?)\b/i,
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
}

function boundedText(value: unknown, minimum: number, maximum: number): value is string {
  return (
    typeof value === 'string' &&
    value.length >= minimum &&
    value.length <= maximum &&
    value.trim() === value &&
    modelTextPattern.test(value)
  )
}

function isProhibitedGiftProduct(
  name: string,
  category: string,
  whyItFits: string,
  retailer: string,
  sourceUrl: string,
  citationTitle?: string,
): boolean {
  let decodedURL = sourceUrl
  try {
    const url = new URL(sourceUrl)
    decodedURL = [decodeURIComponent(url.pathname), ...url.searchParams.values()].join(' ')
  } catch {
    return true
  }

  const productIdentity = [name, category, whyItFits, retailer, decodedURL, citationTitle ?? '']
    .join('\n')
    .normalize('NFKC')
    .replace(/\p{Cf}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .toLowerCase()
  return prohibitedGiftProductPatterns.some((pattern) => pattern.test(productIdentity))
}

export function safeGiftSourceURL(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 500) return null

  try {
    const url = new URL(value)
    const hostname = url.hostname.toLowerCase()

    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      (url.port && url.port !== '443') ||
      !hostname.includes('.') ||
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      /^\d+(?:\.\d+){3}$/.test(hostname) ||
      hostname === '[::1]'
    ) {
      return null
    }

    url.hash = ''
    return url.toString()
  } catch {
    return null
  }
}

function isGiftBudgetId(value: unknown): value is GiftBudgetId {
  return giftBudgetIds.some((id) => id === value)
}

function isGiftThemeId(value: unknown): value is GiftThemeId {
  return giftThemeIds.some((id) => id === value)
}

export function validateGiftRecommendationRequest(
  value: unknown,
): ValidationResult<GiftRecommendationRequest> {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ['anonymousToken', 'budget', 'theme', 'variationSeed'])
  ) {
    return { error: 'Review the gift settings and try again.', ok: false }
  }

  if (
    typeof value.anonymousToken !== 'string' ||
    !tokenPattern.test(value.anonymousToken) ||
    typeof value.variationSeed !== 'string' ||
    !tokenPattern.test(value.variationSeed) ||
    !isGiftBudgetId(value.budget) ||
    !isGiftThemeId(value.theme)
  ) {
    return { error: 'Review the gift settings and try again.', ok: false }
  }

  return {
    ok: true,
    value: {
      anonymousToken: value.anonymousToken,
      budget: value.budget,
      theme: value.theme,
      variationSeed: value.variationSeed,
    },
  }
}

export function validateModelGiftIdea(
  value: unknown,
  budget: GiftBudgetId,
  citationTitle?: string,
): ModelGiftIdea | null {
  const candidate = validateModelGiftResearchCandidate(value, citationTitle)
  if (!candidate) return null

  const range = giftBudgetById(budget)
  if (
    candidate.observedPriceCents < range.minimumCents ||
    candidate.observedPriceCents > range.maximumCents
  ) {
    return null
  }

  return candidate
}

export function validateModelGiftResearchCandidate(
  value: unknown,
  citationTitle?: string,
): ModelGiftIdea | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      'category',
      'currency',
      'name',
      'observedPriceCents',
      'retailer',
      'sourceUrl',
      'whyItFits',
    ]) ||
    !boundedText(value.name, 3, 120) ||
    !boundedText(value.category, 2, 50) ||
    !boundedText(value.whyItFits, 20, 280) ||
    !boundedText(value.retailer, 2, 80) ||
    typeof value.sourceUrl !== 'string' ||
    value.currency !== 'usd' ||
    !Number.isSafeInteger(value.observedPriceCents)
  ) {
    return null
  }

  const sourceUrl = safeGiftSourceURL(value.sourceUrl)
  const price = Number(value.observedPriceCents)

  if (
    !sourceUrl ||
    !isApprovedGiftProductHost(new URL(sourceUrl).hostname) ||
    price < 0 ||
    price > 1_000_000 ||
    isProhibitedGiftProduct(
      value.name,
      value.category,
      value.whyItFits,
      value.retailer,
      sourceUrl,
      citationTitle,
    )
  ) {
    return null
  }

  return {
    category: value.category,
    currency: 'usd',
    name: value.name,
    observedPriceCents: price,
    retailer: value.retailer,
    sourceUrl,
    whyItFits: value.whyItFits,
  }
}

export function validateModelGiftIdeas(
  value: unknown,
  budget: GiftBudgetId,
  citedURLs: ReadonlySet<string>,
): ValidationResult<ModelGiftIdea[]> {
  if (!isRecord(value) || !hasExactKeys(value, ['ideas']) || !Array.isArray(value.ideas)) {
    return { error: 'The gift scout returned an invalid deck.', ok: false }
  }

  const ideas = value.ideas.map((idea) => validateModelGiftIdea(idea, budget))
  if (ideas.length !== 9 || ideas.some((idea) => idea === null)) {
    return { error: 'The gift scout returned an invalid deck.', ok: false }
  }

  const validIdeas = ideas as ModelGiftIdea[]
  const normalizedCitations = new Set(
    [...citedURLs]
      .map((url) => safeGiftSourceURL(url))
      .filter((url): url is string => Boolean(url)),
  )
  const names = new Set(validIdeas.map((idea) => idea.name.toLowerCase()))
  const urls = new Set(validIdeas.map((idea) => idea.sourceUrl))

  if (
    names.size !== validIdeas.length ||
    urls.size !== validIdeas.length ||
    validIdeas.some((idea) => !normalizedCitations.has(idea.sourceUrl))
  ) {
    return { error: 'The gift scout could not verify every listing.', ok: false }
  }

  if (budget === 'mixed') {
    const bands = new Set(
      validIdeas.map((idea) => {
        if (idea.observedPriceCents < 5_000) return 'low'
        if (idea.observedPriceCents < 15_000) return 'middle'
        return 'high'
      }),
    )
    if (bands.size < 3)
      return { error: 'The mixed deck did not cover enough price ranges.', ok: false }
  }

  return { ok: true, value: validIdeas }
}

export function isGiftRecommendationResponse(value: unknown): value is GiftRecommendationResponse {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ['disclaimer', 'ideas', 'runId', 'searchedAt']) ||
    !boundedText(value.disclaimer, 10, 400) ||
    typeof value.runId !== 'string' ||
    !tokenPattern.test(value.runId) ||
    typeof value.searchedAt !== 'string' ||
    Number.isNaN(Date.parse(value.searchedAt)) ||
    !Array.isArray(value.ideas) ||
    value.ideas.length !== 9
  ) {
    return false
  }

  const validIdeas = value.ideas.every((idea) => {
    if (!isRecord(idea)) return false
    return (
      hasExactKeys(idea, [
        'category',
        'checkedAt',
        'currency',
        'id',
        'name',
        'observedPriceCents',
        'quoteToken',
        'retailer',
        'sourceUrl',
        'whyItFits',
      ]) &&
      boundedText(idea.id, 8, 120) &&
      boundedText(idea.name, 3, 120) &&
      boundedText(idea.category, 2, 50) &&
      boundedText(idea.whyItFits, 20, 280) &&
      boundedText(idea.retailer, 2, 80) &&
      idea.currency === 'usd' &&
      Number.isSafeInteger(idea.observedPriceCents) &&
      Number(idea.observedPriceCents) >= 1_000 &&
      Number(idea.observedPriceCents) <= 30_000 &&
      typeof idea.checkedAt === 'string' &&
      !Number.isNaN(Date.parse(idea.checkedAt)) &&
      boundedText(idea.quoteToken, 32, 4_000) &&
      safeGiftSourceURL(idea.sourceUrl) !== null &&
      isApprovedGiftProductHost(new URL(String(idea.sourceUrl)).hostname)
    )
  })

  if (!validIdeas) return false

  const ideas = value.ideas as Array<Record<string, unknown>>
  return (
    new Set(ideas.map((idea) => idea.id)).size === ideas.length &&
    new Set(ideas.map((idea) => safeGiftSourceURL(idea.sourceUrl))).size === ideas.length
  )
}

export function buildGiftModelResponseFormat(budget: GiftBudgetId) {
  const range = giftBudgetById(budget)

  return {
    json_schema: {
      name: 'gift_draft_deck',
      schema: {
        additionalProperties: false,
        properties: {
          ideas: {
            description:
              'Exactly nine distinct, currently buyable physical gifts backed by the response URL citations.',
            items: {
              additionalProperties: false,
              properties: {
                category: {
                  description: 'A short product category.',
                  maxLength: 50,
                  minLength: 2,
                  type: 'string',
                },
                currency: {
                  const: 'usd',
                  description: 'The literal lowercase currency code usd.',
                  type: 'string',
                },
                name: {
                  description: 'The current product listing name.',
                  maxLength: 120,
                  minLength: 3,
                  type: 'string',
                },
                observedPriceCents: {
                  description: `The observed single-item price in integer USD cents, between ${range.minimumCents} and ${range.maximumCents} inclusive. Never clamp or alter a listing price.`,
                  maximum: range.maximumCents,
                  minimum: range.minimumCents,
                  type: 'integer',
                },
                retailer: {
                  description: 'The retailer or maker shown by the cited listing.',
                  maxLength: 80,
                  minLength: 2,
                  type: 'string',
                },
                sourceUrl: {
                  description:
                    'The exact HTTPS product URL copied from one URL citation in the response.',
                  maxLength: 500,
                  type: 'string',
                },
                whyItFits: {
                  description: 'A concise, evidence-bounded explanation of why the gift fits.',
                  maxLength: 280,
                  minLength: 20,
                  type: 'string',
                },
              },
              required: [
                'category',
                'currency',
                'name',
                'observedPriceCents',
                'retailer',
                'sourceUrl',
                'whyItFits',
              ],
              type: 'object',
            },
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
  } as const
}
