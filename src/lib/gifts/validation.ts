import { isApprovedGiftProductHost } from './retailers'
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

type ValidationResult<T> = { ok: true; value: T } | { error: string; ok: false }

/**
 * The model researches retailer products. The artwork URL, timestamps, inventory ID, and
 * signed quote are produced only after the retailer page and image have been cached locally.
 */
export type ModelGiftIdea = Omit<
  GiftIdea,
  'artworkUrl' | 'checkedAt' | 'id' | 'productDescription' | 'quoteToken'
>

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
  /\b(?:used (?:condition|items?|products?|copies|equipment)|pre[ -]?owned|refurbished|open[ -]?box|pre[ -]?orders?|back[ -]?orders?)\b/i,
  /\b(?:replacement (?:parts?|pieces?|components?)|spare parts?|refills?|sample packs?|add[ -]?ons?)\b/i,
  /\b(?:battery packs?|replacement batteries|loose batteries|breakout boards?|development boards?|microcontrollers?|single[ -]?board computers?|sensors?|electronic modules?|electronic components?|bare pcbs?|printed circuit boards?|ribbon cables?|jumper wires?|pin headers?|solder paste|thermal paste|adhesive strips?)\b/i,
] as const

const giftTrackingParameterPatterns = [
  /^utm_/i,
  /^(?:_ga|dclid|fbclid|gclid|gbraid|msclkid|ttclid|twclid|wbraid)$/i,
  /^(?:aff|affid|affiliate|affiliate_id|irclickid|mc_cid|mc_eid)$/i,
  /^(?:campaign|campaign_id|ref|ref_|referrer|source)$/i,
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

function normalizedGiftPolicyPart(value: string): string {
  let decoded = value
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value)
      decoded = [url.hostname, decodeURIComponent(url.pathname), ...url.searchParams.values()].join(
        ' ',
      )
    } catch {
      // Keep malformed URLs as text so they cannot bypass the policy scan.
    }
  } else {
    try {
      decoded = decodeURIComponent(value)
    } catch {
      // Keep malformed percent-encoding as text so it cannot bypass the policy scan.
    }
  }
  return decoded
    .normalize('NFKC')
    .replace(/\p{Cf}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toLowerCase()
}

export function normalizeGiftProductName(value: string): string {
  return normalizedGiftPolicyPart(value).replace(/\s+/g, ' ')
}

/**
 * One policy scanner for model metadata, retailer text, and decoded URL identity.
 * Every caller must pass all available product clues rather than checking only a title.
 */
export function isProhibitedGiftProduct(
  ...identityParts: Array<string | null | undefined>
): boolean {
  const productIdentity = identityParts
    .filter((part): part is string => typeof part === 'string')
    .map(normalizedGiftPolicyPart)
    .join('\n')
  return prohibitedGiftProductPatterns.some((pattern) => pattern.test(productIdentity))
}

export function normalizeGiftSourceURL(value: unknown): string | null {
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
    for (const key of [...url.searchParams.keys()]) {
      if (giftTrackingParameterPatterns.some((pattern) => pattern.test(key))) {
        url.searchParams.delete(key)
      }
    }
    url.searchParams.sort()
    return url.toString()
  } catch {
    return null
  }
}

export const safeGiftSourceURL = normalizeGiftSourceURL

/** Stable source identity for deduplication without rewriting the URL used for retailer fetches. */
export function giftSourceIdentityURL(value: unknown): string | null {
  const normalized = normalizeGiftSourceURL(value)
  if (!normalized) return null
  const url = new URL(normalized)
  url.hostname = url.hostname.replace(/^www\./, '')
  url.pathname = url.pathname.replace(/\/+$/, '') || '/'
  return url.toString()
}

export function safeGiftArtworkURL(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 240) return null
  if (/^\/api\/gifts\/artwork\/[A-Za-z0-9_-]{8,160}$/.test(value)) return value
  if (/^\/media\/gifts\/[a-z0-9]+(?:-[a-z0-9]+)*\.webp$/.test(value)) return value
  return null
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
  return candidate.observedPriceCents >= range.minimumCents &&
    candidate.observedPriceCents <= range.maximumCents
    ? candidate
    : null
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
): ValidationResult<ModelGiftIdea[]> {
  if (!isRecord(value) || !hasExactKeys(value, ['ideas']) || !Array.isArray(value.ideas)) {
    return { error: 'The gift scout returned an invalid deck.', ok: false }
  }

  const ideas = value.ideas.map((idea) => validateModelGiftIdea(idea, budget))
  if (ideas.length !== 9 || ideas.some((idea) => idea === null)) {
    return { error: 'The gift scout returned an invalid deck.', ok: false }
  }

  const validIdeas = ideas as ModelGiftIdea[]
  const names = new Set(validIdeas.map((idea) => idea.name.toLocaleLowerCase('en-US')))
  const urls = new Set(validIdeas.map((idea) => idea.sourceUrl))
  if (names.size !== validIdeas.length || urls.size !== validIdeas.length) {
    return { error: 'The gift scout returned duplicate suggestions.', ok: false }
  }

  if (budget === 'mixed') {
    const bands = new Set(
      validIdeas.map((idea) => {
        if (idea.observedPriceCents < 5_000) return 'low'
        if (idea.observedPriceCents < 15_000) return 'middle'
        return 'high'
      }),
    )
    if (bands.size < 3) {
      return { error: 'The mixed deck did not cover enough price ranges.', ok: false }
    }
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
    const sourceUrl = safeGiftSourceURL(idea.sourceUrl)

    return (
      hasExactKeys(idea, [
        'artworkUrl',
        'category',
        'checkedAt',
        'currency',
        'id',
        'name',
        'observedPriceCents',
        'productDescription',
        'quoteToken',
        'retailer',
        'sourceUrl',
        'whyItFits',
      ]) &&
      safeGiftArtworkURL(idea.artworkUrl) !== null &&
      boundedText(idea.id, 8, 120) &&
      boundedText(idea.name, 3, 120) &&
      boundedText(idea.category, 2, 50) &&
      boundedText(idea.whyItFits, 20, 280) &&
      boundedText(idea.productDescription, 20, 2_000) &&
      boundedText(idea.retailer, 2, 80) &&
      idea.currency === 'usd' &&
      Number.isSafeInteger(idea.observedPriceCents) &&
      Number(idea.observedPriceCents) >= 1_000 &&
      Number(idea.observedPriceCents) <= 30_000 &&
      typeof idea.checkedAt === 'string' &&
      !Number.isNaN(Date.parse(idea.checkedAt)) &&
      boundedText(idea.quoteToken, 32, 4_000) &&
      sourceUrl !== null &&
      isApprovedGiftProductHost(new URL(sourceUrl).hostname)
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
      name: 'gift_inventory_research_batch',
      schema: {
        additionalProperties: false,
        properties: {
          ideas: {
            description:
              'Exactly nine distinct real physical products from the supplied retailer research. Product pages and media will be independently cached and revalidated later.',
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
                  description: 'The real product name used by the retailer.',
                  maxLength: 120,
                  minLength: 3,
                  type: 'string',
                },
                observedPriceCents: {
                  description: `The researched single-item price in integer USD cents, between ${range.minimumCents} and ${range.maximumCents} inclusive. Never clamp an out-of-range price.`,
                  maximum: range.maximumCents,
                  minimum: range.minimumCents,
                  type: 'integer',
                },
                retailer: {
                  description: 'The actual retailer or maker for the product page.',
                  maxLength: 80,
                  minLength: 2,
                  type: 'string',
                },
                sourceUrl: {
                  description: 'A direct HTTPS product-detail URL from an approved retailer.',
                  maxLength: 500,
                  type: 'string',
                },
                whyItFits: {
                  description: 'A concise explanation of why this real product fits the recipient.',
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
