import 'server-only'

import { randomUUID } from 'node:crypto'

import { validateGiftRecommendationRequest, type GiftIdea } from '../index'
import { resolveOpenRouterGiftConfig } from './config'
import {
  giftClientAddress,
  giftJSONResponse,
  giftOptionsResponse,
  giftRequestMediaType,
  GiftRequestBodyFailure,
  readBoundedGiftRequestText,
  validatedGiftOrigin,
} from './http'
import { GiftSearchError, searchGiftIdeas, type GiftSearchResult } from './openrouter'
import { createGiftQuoteToken } from './quote-token'
import { authorizeGiftRequest, type GiftRequestPermit } from './rate-limit'

type SafeLogRecord = Record<string, boolean | number | string | undefined>

type IdeasHandlerDependencies = {
  authorize?: (context: {
    anonymousToken: string
    clientAddress: string
  }) => Promise<GiftRequestPermit>
  environment?: NodeJS.ProcessEnv
  log?: (record: SafeLogRecord) => void
  now?: () => number
  randomUUID?: () => string
  search?: typeof searchGiftIdeas
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

function publicSearchError(error: unknown): { message: string; status: number } {
  if (!(error instanceof GiftSearchError)) {
    return { message: 'The gift scout could not finish this draw. Try again.', status: 502 }
  }

  if (error.reason === 'timeout' || error.reason === 'network' || error.reason === 'http') {
    return { message: 'The gift scout is taking a break. Try another draw shortly.', status: 502 }
  }

  return {
    message: 'Nothing trustworthy landed in that draw. Try a new range or theme.',
    status: 502,
  }
}

function ideaWithQuote(
  result: GiftSearchResult['ideas'][number],
  runId: string,
  searchedAt: string,
  environment: NodeJS.ProcessEnv,
  nowMs: number,
  createId: () => string,
): GiftIdea | null {
  const id = createId()
  const quoteToken = createGiftQuoteToken(
    {
      amountCents: result.observedPriceCents,
      category: result.category,
      currency: result.currency,
      itemName: result.name,
      offerId: id,
      retailer: result.retailer,
      runId,
      sourceUrl: result.sourceUrl,
    },
    environment,
    nowMs,
  )

  if (!quoteToken) return null

  return {
    ...result,
    checkedAt: searchedAt,
    id,
    quoteToken,
  }
}

export function handleGiftIdeasOptions(
  request: Request,
  environment: NodeJS.ProcessEnv = process.env,
): Response {
  return giftOptionsResponse(request, environment)
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

  const config = resolveOpenRouterGiftConfig(environment)
  if (!config) {
    safeLog({ outcome: 'unavailable', reason: 'configuration' })
    return giftJSONResponse(
      origin,
      { error: 'The live gift scout is not configured yet. Try again later.' },
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
  const searchedAt = new Date(now()).toISOString()

  try {
    const result = await (dependencies.search ?? searchGiftIdeas)({
      config,
      request: validation.value,
      runId,
      searchedAt,
    })
    const quoteTime = now()
    const ideas = result.ideas.map((idea) =>
      ideaWithQuote(idea, runId, searchedAt, environment, quoteTime, createId),
    )

    if (ideas.some((idea) => idea === null)) throw new Error('quote_creation_failed')

    safeLog({
      budget: validation.value.budget,
      citations: result.citations,
      completionTokens: result.usage.completionTokens,
      cost: result.usage.cost,
      duration: durationBucket(now() - startedAt),
      model: result.model,
      outcome: 'completed',
      promptTokens: result.usage.promptTokens,
      searchRequests: result.usage.searchRequests,
      theme: validation.value.theme,
      totalTokens: result.usage.totalTokens,
    })

    return giftJSONResponse(origin, {
      disclaimer:
        'Prices are recent online observations before tax and shipping. Any Stripe charge is a fixed contribution to Saberistic; AmirSaber may apply it to the selected gift, related costs, or a similar gift if the listing changes.',
      ideas,
      runId,
      searchedAt,
    })
  } catch (error) {
    const response = publicSearchError(error)
    safeLog({
      duration: durationBucket(now() - startedAt),
      generationId: error instanceof GiftSearchError ? error.upstream.generationId : undefined,
      outcome: 'failed',
      reason: error instanceof GiftSearchError ? error.reason : 'internal',
      retryAfter: error instanceof GiftSearchError ? error.upstream.retryAfter : undefined,
      upstreamStatus: error instanceof GiftSearchError ? error.upstream.status : undefined,
    })
    return giftJSONResponse(origin, { error: response.message }, response.status)
  } finally {
    try {
      await permit.release()
    } catch {
      // The limiter lease expires independently.
    }
  }
}
