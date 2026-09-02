import 'server-only'

import { randomUUID } from 'node:crypto'

import { validateGiftRecommendationRequest, type GiftIdea } from '../index'
import { isGiftInventoryEnabled, resolveStripeGiftConfig } from './config'
import {
  giftClientAddress,
  giftJSONResponse,
  giftOptionsResponse,
  giftRequestMediaType,
  GiftRequestBodyFailure,
  readBoundedGiftRequestText,
  validatedGiftOrigin,
} from './http'
import {
  dealAvailableGiftItems,
  enqueueBestEffortReplenishRequest,
  getGiftInventoryDatabase,
  isGiftInventoryReady,
  type GiftInventoryDatabase,
  type GiftInventoryItem,
} from './inventory'
import { createGiftQuoteToken } from './quote-token'
import { authorizeGiftRequest, type GiftRequestPermit } from './rate-limit'

type SafeLogRecord = Record<string, boolean | number | string | undefined>

type IdeasHandlerDependencies = {
  authorize?: (context: {
    anonymousToken: string
    clientAddress: string
  }) => Promise<GiftRequestPermit>
  database?: GiftInventoryDatabase
  deal?: typeof dealAvailableGiftItems
  environment?: NodeJS.ProcessEnv
  enqueueReplenish?: typeof enqueueBestEffortReplenishRequest
  log?: (record: SafeLogRecord) => void
  now?: () => number
  randomUUID?: () => string
  readiness?: typeof isGiftInventoryReady
  scheduleMaintenance?: (task: () => Promise<void>) => void
}

function defaultLog(record: SafeLogRecord) {
  console.info(JSON.stringify({ event: 'gift_draft_ideas', ...record }))
}

function durationBucket(durationMs: number): string {
  if (durationMs < 1_000) return 'under_1s'
  if (durationMs < 5_000) return '1s_to_5s'
  if (durationMs < 15_000) return '5s_to_15s'
  if (durationMs < 30_000) return '15s_to_30s'
  return 'over_30s'
}

function parseJSON(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function ideaWithQuote(
  item: GiftInventoryItem,
  runId: string,
  environment: NodeJS.ProcessEnv,
  nowMs: number,
): GiftIdea | null {
  const quoteToken = createGiftQuoteToken(
    {
      amountCents: item.observedPriceCents,
      category: item.category,
      currency: item.currency,
      itemName: item.name,
      offerId: item.id,
      retailer: item.retailer,
      runId,
      sourceUrl: item.sourceUrl,
    },
    environment,
    nowMs,
  )

  if (!quoteToken) return null

  return {
    artworkAlt: `AI-generated concept artwork for ${item.name}`,
    artworkUrl: item.artworkUrl,
    category: item.category,
    conceptDescription: item.productDescription,
    currency: item.currency,
    generatedAt: item.createdAt,
    id: item.id,
    name: item.name,
    quoteToken,
    suggestedContributionCents: item.observedPriceCents,
    whyItFits: item.whyItFits,
  }
}

export function handleGiftIdeasOptions(
  request: Request,
  environment: NodeJS.ProcessEnv = process.env,
): Response {
  return giftOptionsResponse(request, environment, 'GET, POST, OPTIONS')
}

export async function handleGiftIdeasStatus(
  request: Request,
  dependencies: Pick<IdeasHandlerDependencies, 'database' | 'environment' | 'readiness'> = {},
): Promise<Response> {
  const environment = dependencies.environment ?? process.env
  const origin = validatedGiftOrigin(request, environment)
  if (request.headers.has('origin') && !origin) {
    return giftJSONResponse(
      null,
      { error: 'Request origin is not allowed.' },
      403,
      'GET, POST, OPTIONS',
    )
  }

  let ideasEnabled = false
  const inventoryConfigured = isGiftInventoryEnabled(environment)
  if (inventoryConfigured) {
    try {
      ideasEnabled = await (dependencies.readiness ?? isGiftInventoryReady)(
        dependencies.database ?? getGiftInventoryDatabase(),
      )
    } catch {
      ideasEnabled = false
    }
  }

  return giftJSONResponse(
    origin,
    {
      checkoutEnabled: Boolean(resolveStripeGiftConfig(environment)),
      ideasEnabled,
      inventoryStatus: ideasEnabled ? 'ready' : inventoryConfigured ? 'restocking' : 'paused',
    },
    200,
    'GET, POST, OPTIONS',
  )
}

export async function handleGiftIdeas(
  request: Request,
  dependencies: IdeasHandlerDependencies = {},
): Promise<Response> {
  const environment = dependencies.environment ?? process.env
  const now = dependencies.now ?? Date.now
  const createId = dependencies.randomUUID ?? randomUUID
  const log = dependencies.log ?? defaultLog
  const startedAt = now()
  const requestId = createId()
  const safeLog = (record: SafeLogRecord) => log({ ...record, requestId })
  const origin = validatedGiftOrigin(request, environment)

  if (!origin) {
    safeLog({ outcome: 'rejected', reason: 'origin' })
    return giftJSONResponse(null, { error: 'Request origin is not allowed.' }, 403)
  }

  if (giftRequestMediaType(request) !== 'application/json') {
    safeLog({ outcome: 'rejected', reason: 'media_type' })
    return giftJSONResponse(origin, { error: 'Send the gift settings as JSON.' }, 415)
  }

  let rawBody: string
  try {
    rawBody = await readBoundedGiftRequestText(request)
  } catch (error) {
    const oversized = error instanceof GiftRequestBodyFailure && error.reason === 'oversized'
    safeLog({ outcome: 'rejected', reason: oversized ? 'oversized' : 'body' })
    return giftJSONResponse(
      origin,
      { error: oversized ? 'The gift request is too large.' : 'The gift request is invalid.' },
      oversized ? 413 : 400,
    )
  }

  const validation = validateGiftRecommendationRequest(parseJSON(rawBody))
  if (!validation.ok) {
    safeLog({ outcome: 'rejected', reason: 'validation' })
    return giftJSONResponse(origin, { error: validation.error }, 400)
  }

  if (!isGiftInventoryEnabled(environment)) {
    safeLog({ outcome: 'unavailable', reason: 'configuration' })
    return giftJSONResponse(
      origin,
      { error: 'The cached gift inventory is not configured yet. Try again later.' },
      503,
    )
  }

  const clientAddress = giftClientAddress(request, environment)
  if (!clientAddress) {
    safeLog({ outcome: 'unavailable', reason: 'client_address' })
    return giftJSONResponse(origin, { error: 'The gift scout is temporarily unavailable.' }, 503)
  }

  let permit: GiftRequestPermit
  try {
    permit = dependencies.authorize
      ? await dependencies.authorize({
          anonymousToken: validation.value.anonymousToken,
          clientAddress,
        })
      : await authorizeGiftRequest(
          { anonymousToken: validation.value.anonymousToken, clientAddress },
          { environment },
        )
  } catch {
    permit = { allowed: false, reason: 'unavailable' }
  }

  if (!permit.allowed) {
    safeLog({ outcome: 'limited', reason: permit.reason })
    const unavailable = permit.reason === 'unavailable'
    return giftJSONResponse(
      origin,
      {
        error: unavailable
          ? 'The gift scout is temporarily unavailable.'
          : 'That is enough rapid-fire draws for now. Try again later.',
      },
      unavailable ? 503 : 429,
    )
  }

  const runId = createId()
  const drawStartedAt = new Date(now()).toISOString()

  try {
    const database = dependencies.database ?? getGiftInventoryDatabase()
    const inventory = await (dependencies.deal ?? dealAvailableGiftItems)(database, {
      budget: validation.value.budget,
      limit: 9,
      seed: `${validation.value.variationSeed}:${runId}`,
      theme: validation.value.theme,
    })
    const quoteTime = now()
    const ideas = inventory.map((item) => ideaWithQuote(item, runId, environment, quoteTime))

    const maintenance = async () => {
      await (dependencies.enqueueReplenish ?? enqueueBestEffortReplenishRequest)(
        { budget: validation.value.budget, theme: validation.value.theme },
        database,
      )
    }
    try {
      if (dependencies.scheduleMaintenance) dependencies.scheduleMaintenance(maintenance)
      else void maintenance()
    } catch {
      // The next draw or worker maintenance pass will make the same idempotent checks.
    }

    if (ideas.length !== 9 || ideas.some((idea) => idea === null)) {
      safeLog({
        budget: validation.value.budget,
        duration: durationBucket(now() - startedAt),
        inventoryCandidates: inventory.length,
        outcome: 'unavailable',
        reason: 'restocking',
        theme: validation.value.theme,
      })
      return giftJSONResponse(
        origin,
        { error: 'That concept lane is restocking. Try another range or theme shortly.' },
        503,
      )
    }

    safeLog({
      budget: validation.value.budget,
      duration: durationBucket(now() - startedAt),
      inventoryCandidates: inventory.length,
      outcome: 'completed',
      theme: validation.value.theme,
    })

    return giftJSONResponse(origin, {
      disclaimer:
        'These are AI-created gift concepts with generated artwork and suggested contribution amounts, not products being sold or ordered. Any Stripe charge is a fixed gift contribution to Saberistic; AmirSaber may use it toward this idea, a substitute, related costs, or another gift.',
      ideas,
      runId,
      searchedAt: drawStartedAt,
    })
  } catch {
    safeLog({
      duration: durationBucket(now() - startedAt),
      outcome: 'failed',
      reason: 'inventory',
    })
    return giftJSONResponse(
      origin,
      { error: 'The cached concept inventory is temporarily unavailable. Try again shortly.' },
      503,
    )
  } finally {
    try {
      await permit.release()
    } catch {
      // The limiter lease expires independently.
    }
  }
}
