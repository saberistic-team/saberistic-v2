import 'server-only'

import { createHash } from 'node:crypto'

import { resolveStripeGiftConfig } from './config'
import {
  giftJSONResponse,
  giftOptionsResponse,
  giftRequestMediaType,
  GiftRequestBodyFailure,
  giftClientAddress,
  readBoundedGiftRequestText,
  validatedGiftOrigin,
} from './http'
import { verifyGiftQuoteToken } from './quote-token'
import { authorizeGiftCheckout } from './rate-limit'
import {
  attachGiftInventoryStripeSession,
  getGiftInventoryDatabase,
  releaseGiftInventoryAfterDefinitiveCheckoutFailure,
  reserveGiftInventoryItem,
  type GiftInventoryDatabase,
} from './inventory'
import {
  createGiftCheckoutSession,
  GiftCheckoutProviderError,
  giftCheckoutExpiresAt,
  giftCheckoutIdentifiers,
  giftCheckoutMinimumLeadSeconds,
} from './stripe'

type CheckoutHandlerDependencies = {
  createCheckout?: typeof createGiftCheckoutSession
  authorizeCheckout?: typeof authorizeGiftCheckout
  attachInventorySession?: typeof attachGiftInventoryStripeSession
  database?: GiftInventoryDatabase
  environment?: NodeJS.ProcessEnv
  now?: () => number
  releaseInventoryAfterDefinitiveFailure?: typeof releaseGiftInventoryAfterDefinitiveCheckoutFailure
  reserveInventory?: typeof reserveGiftInventoryItem
}

function checkoutLog(record: {
  outcome:
    | 'created'
    | 'inventory_error'
    | 'provider_error'
    | 'rate_limited'
    | 'rate_limit_unavailable'
    | 'unavailable'
  quoteReference: string
  status: number
}) {
  console.info(JSON.stringify({ event: 'gift_draft_checkout', ...record }))
}

function quoteReference(quoteToken: string): string {
  return createHash('sha256').update(quoteToken).digest('hex').slice(0, 16)
}

function parseQuoteToken(text: string): string | null {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return null
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  if (
    Object.keys(record).length !== 1 ||
    typeof record.quoteToken !== 'string' ||
    record.quoteToken.length < 32 ||
    record.quoteToken.length > 4_000
  ) {
    return null
  }

  return record.quoteToken
}

export function handleGiftCheckoutOptions(
  request: Request,
  environment: NodeJS.ProcessEnv = process.env,
): Response {
  return giftOptionsResponse(request, environment)
}

export async function handleGiftCheckout(
  request: Request,
  dependencies: CheckoutHandlerDependencies = {},
): Promise<Response> {
  const environment = dependencies.environment ?? process.env
  const now = dependencies.now ?? Date.now
  const origin = validatedGiftOrigin(request, environment)

  if (!origin) return giftJSONResponse(null, { error: 'Request origin is not allowed.' }, 403)
  if (giftRequestMediaType(request) !== 'application/json') {
    return giftJSONResponse(origin, { error: 'Send the selected gift as JSON.' }, 415)
  }

  let rawBody: string
  try {
    rawBody = await readBoundedGiftRequestText(request)
  } catch (error) {
    const oversized = error instanceof GiftRequestBodyFailure && error.reason === 'oversized'
    return giftJSONResponse(
      origin,
      {
        error: oversized
          ? 'The checkout request is too large.'
          : 'The checkout request is invalid.',
      },
      oversized ? 413 : 400,
    )
  }

  const quoteToken = parseQuoteToken(rawBody)
  if (!quoteToken) return giftJSONResponse(origin, { error: 'The selected gift is invalid.' }, 400)

  const currentTime = now()
  const claim = verifyGiftQuoteToken(quoteToken, environment, currentTime)
  const minimumCheckoutExpiry = Math.floor(currentTime / 1_000) + giftCheckoutMinimumLeadSeconds
  if (!claim || giftCheckoutExpiresAt(claim) <= minimumCheckoutExpiry) {
    return giftJSONResponse(
      origin,
      { error: 'That gift price expired. Deal a fresh deck before checking out.' },
      409,
    )
  }

  const config = resolveStripeGiftConfig(environment)
  if (!config) {
    return giftJSONResponse(
      origin,
      { error: 'Secure checkout is not configured yet. No payment was taken.' },
      503,
    )
  }

  const clientAddress = giftClientAddress(request, environment)
  const reference = quoteReference(quoteToken)
  if (!clientAddress) {
    checkoutLog({ outcome: 'rate_limit_unavailable', quoteReference: reference, status: 503 })
    return giftJSONResponse(
      origin,
      { error: 'Secure checkout is temporarily unavailable. No payment was taken.' },
      503,
    )
  }

  let permit
  try {
    permit = await (dependencies.authorizeCheckout ?? authorizeGiftCheckout)(
      { clientAddress, quoteToken },
      { environment },
    )
  } catch {
    checkoutLog({ outcome: 'rate_limit_unavailable', quoteReference: reference, status: 503 })
    return giftJSONResponse(
      origin,
      { error: 'Secure checkout is temporarily unavailable. No payment was taken.' },
      503,
    )
  }
  if (!permit.allowed) {
    const unavailable = permit.reason === 'unavailable'
    checkoutLog({
      outcome: unavailable ? 'rate_limit_unavailable' : 'rate_limited',
      quoteReference: reference,
      status: unavailable ? 503 : 429,
    })
    return giftJSONResponse(
      origin,
      {
        error: unavailable
          ? 'Secure checkout is temporarily unavailable. No payment was taken.'
          : 'That checkout has been retried too many times. Deal a fresh deck.',
      },
      unavailable ? 503 : 429,
    )
  }

  const reservationId = giftCheckoutIdentifiers(quoteToken).inventoryReservationId
  const reservationTtlSeconds = giftCheckoutExpiresAt(claim) - Math.floor(currentTime / 1_000)
  let database: GiftInventoryDatabase
  let reservation
  try {
    database = dependencies.database ?? getGiftInventoryDatabase()
    reservation = await (dependencies.reserveInventory ?? reserveGiftInventoryItem)(database, {
      expected: {
        category: claim.category,
        currency: claim.currency,
        name: claim.itemName,
        observedPriceCents: claim.amountCents,
        retailer: claim.retailer,
        sourceUrl: claim.sourceUrl,
      },
      offerId: claim.offerId,
      reservationId,
      ttlSeconds: reservationTtlSeconds,
    })
  } catch {
    checkoutLog({ outcome: 'inventory_error', quoteReference: reference, status: 503 })
    return giftJSONResponse(
      origin,
      { error: 'Gift inventory is temporarily unavailable. No payment was taken.' },
      503,
    )
  }

  if (!reservation) {
    checkoutLog({ outcome: 'unavailable', quoteReference: reference, status: 409 })
    return giftJSONResponse(
      origin,
      { error: 'That gift was just claimed. Choose another product from a fresh deck.' },
      409,
    )
  }

  try {
    const checkout = await (dependencies.createCheckout ?? createGiftCheckoutSession)(
      claim,
      quoteToken,
      config,
      currentTime,
    )
    if (checkout.inventoryReservationId !== reservationId) {
      throw new GiftCheckoutProviderError('ambiguous')
    }
    const attached = await (
      dependencies.attachInventorySession ?? attachGiftInventoryStripeSession
    )(database, {
      offerId: claim.offerId,
      reservationId,
      stripeCheckoutSessionId: checkout.sessionId,
    })
    if (!attached) throw new GiftCheckoutProviderError('ambiguous')
    checkoutLog({ outcome: 'created', quoteReference: reference, status: 200 })
    return giftJSONResponse(origin, { checkoutUrl: checkout.checkoutUrl })
  } catch (error) {
    if (error instanceof GiftCheckoutProviderError && error.certainty === 'definitive') {
      try {
        await (
          dependencies.releaseInventoryAfterDefinitiveFailure ??
          releaseGiftInventoryAfterDefinitiveCheckoutFailure
        )(database, { offerId: claim.offerId, reservationId })
      } catch {
        // The reservation expires if a definitive provider rejection cannot be released now.
      }
    }
    checkoutLog({ outcome: 'provider_error', quoteReference: reference, status: 502 })
    return giftJSONResponse(
      origin,
      {
        error:
          error instanceof GiftCheckoutProviderError && error.certainty === 'definitive'
            ? 'Stripe Checkout did not open. No payment was taken.'
            : 'Stripe Checkout status could not be confirmed. Check for an existing confirmation before trying again.',
      },
      502,
    )
  }
}
