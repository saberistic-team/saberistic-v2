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
  createGiftCheckoutSession,
  giftCheckoutExpiresAt,
  giftCheckoutMinimumLeadSeconds,
} from './stripe'

type CheckoutHandlerDependencies = {
  createCheckout?: typeof createGiftCheckoutSession
  authorizeCheckout?: typeof authorizeGiftCheckout
  environment?: NodeJS.ProcessEnv
  now?: () => number
}

function checkoutLog(record: {
  outcome: 'created' | 'provider_error' | 'rate_limited' | 'rate_limit_unavailable'
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

  try {
    const checkoutUrl = await (dependencies.createCheckout ?? createGiftCheckoutSession)(
      claim,
      quoteToken,
      config,
      currentTime,
    )
    checkoutLog({ outcome: 'created', quoteReference: reference, status: 200 })
    return giftJSONResponse(origin, { checkoutUrl })
  } catch {
    checkoutLog({ outcome: 'provider_error', quoteReference: reference, status: 502 })
    return giftJSONResponse(
      origin,
      { error: 'Stripe Checkout did not open. No payment was taken.' },
      502,
    )
  }
}
