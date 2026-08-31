import 'server-only'

import type Stripe from 'stripe'

import { resolveStripeGiftReadConfig, type StripeGiftConfig } from './config'
import {
  allowedGiftOrigins,
  giftClientAddress,
  giftCORSHeaders,
  giftJSONResponse,
  validatedGiftOrigin,
} from './http'
import type { GiftPaymentStatus } from './payments'
import { authorizeGiftPaymentStatus } from './rate-limit'
import { createGiftStripeClient } from './stripe'
import { validateGiftCheckoutSession } from './stripe-metadata'

type PaymentStatusDependencies = {
  authorizeStatus?: typeof authorizeGiftPaymentStatus
  environment?: NodeJS.ProcessEnv
  findPaymentStatus?: (sessionId: string) => Promise<GiftPaymentStatus | null>
  retrieveSession?: (
    sessionId: string,
    config: StripeGiftConfig,
  ) => Promise<Stripe.Checkout.Session>
}

function requestOrigin(
  request: Request,
  environment: NodeJS.ProcessEnv,
): { allowed: boolean; origin: string | null } {
  if (!request.headers.has('origin')) {
    return {
      allowed: allowedGiftOrigins(request, environment).has(new URL(request.url).origin),
      origin: null,
    }
  }
  const origin = validatedGiftOrigin(request, environment)
  return { allowed: Boolean(origin), origin }
}

async function defaultFindPaymentStatus(sessionId: string): Promise<GiftPaymentStatus | null> {
  const { payloadGiftPaymentStore } = await import('./payload-payments')
  return (await payloadGiftPaymentStore.findBySessionId(sessionId))?.paymentStatus ?? null
}

async function defaultRetrieveSession(
  sessionId: string,
  config: StripeGiftConfig,
): Promise<Stripe.Checkout.Session> {
  return createGiftStripeClient(config.apiKey).checkout.sessions.retrieve(sessionId)
}

function providerPaymentStatus(session: Stripe.Checkout.Session): GiftPaymentStatus {
  if (session.payment_status === 'paid' || session.payment_status === 'no_payment_required') {
    return 'paid'
  }
  return session.status === 'expired' ? 'expired' : 'pending'
}

export function reconcileGiftPaymentStatus(
  stored: GiftPaymentStatus | null,
  provider: GiftPaymentStatus,
): GiftPaymentStatus {
  if (stored === 'refunded' || stored === 'partially_refunded') return stored
  if (provider === 'paid' || stored === 'paid') return 'paid'
  if (stored === 'failed') return 'failed'
  if (provider === 'expired') return 'expired'
  return stored ?? provider
}

export function handleGiftPaymentStatusOptions(
  request: Request,
  environment: NodeJS.ProcessEnv = process.env,
): Response {
  const result = requestOrigin(request, environment)
  if (!result.allowed) {
    return giftJSONResponse(null, { error: 'Request origin is not allowed.' }, 403, 'GET, OPTIONS')
  }
  return new Response(null, {
    headers: giftCORSHeaders(result.origin, 'GET, OPTIONS'),
    status: 204,
  })
}

export async function handleGiftPaymentStatus(
  request: Request,
  dependencies: PaymentStatusDependencies = {},
): Promise<Response> {
  const environment = dependencies.environment ?? process.env
  const origin = requestOrigin(request, environment)
  if (!origin.allowed) {
    return giftJSONResponse(null, { error: 'Request origin is not allowed.' }, 403, 'GET, OPTIONS')
  }

  const sessionIds = new URL(request.url).searchParams.getAll('session_id')
  const sessionId = sessionIds[0]
  if (
    sessionIds.length !== 1 ||
    !sessionId ||
    !/^cs_(?:test|live)_[A-Za-z0-9]{16,255}$/.test(sessionId)
  ) {
    return giftJSONResponse(
      origin.origin,
      { error: 'The checkout reference is invalid.' },
      400,
      'GET, OPTIONS',
    )
  }

  const config = resolveStripeGiftReadConfig(environment)
  if (!config) {
    return giftJSONResponse(
      origin.origin,
      { error: 'Payment status is temporarily unavailable.' },
      503,
      'GET, OPTIONS',
    )
  }

  const clientAddress = giftClientAddress(request, environment)
  if (!clientAddress) {
    return giftJSONResponse(
      origin.origin,
      { error: 'Payment status is temporarily unavailable.' },
      503,
      'GET, OPTIONS',
    )
  }

  let permit
  try {
    permit = await (dependencies.authorizeStatus ?? authorizeGiftPaymentStatus)(
      { clientAddress },
      { environment },
    )
  } catch {
    return giftJSONResponse(
      origin.origin,
      { error: 'Payment status is temporarily unavailable.' },
      503,
      'GET, OPTIONS',
    )
  }
  if (!permit.allowed) {
    const unavailable = permit.reason === 'unavailable'
    return giftJSONResponse(
      origin.origin,
      {
        error: unavailable
          ? 'Payment status is temporarily unavailable.'
          : 'Too many payment status checks. Try again later.',
      },
      unavailable ? 503 : 429,
      'GET, OPTIONS',
    )
  }

  let session: Stripe.Checkout.Session
  try {
    session = await (dependencies.retrieveSession ?? defaultRetrieveSession)(sessionId, config)
  } catch {
    return giftJSONResponse(
      origin.origin,
      { error: 'Payment status is temporarily unavailable.' },
      502,
      'GET, OPTIONS',
    )
  }

  if (!validateGiftCheckoutSession(session, config.quoteSecret)) {
    return giftJSONResponse(
      origin.origin,
      { error: 'The checkout reference was not found.' },
      404,
      'GET, OPTIONS',
    )
  }

  let storedStatus: GiftPaymentStatus | null
  try {
    storedStatus = await (dependencies.findPaymentStatus ?? defaultFindPaymentStatus)(sessionId)
  } catch {
    return giftJSONResponse(
      origin.origin,
      { error: 'Payment status is temporarily unavailable.' },
      503,
      'GET, OPTIONS',
    )
  }

  return giftJSONResponse(
    origin.origin,
    { paymentStatus: reconcileGiftPaymentStatus(storedStatus, providerPaymentStatus(session)) },
    200,
    'GET, OPTIONS',
  )
}
