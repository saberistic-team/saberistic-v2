import 'server-only'

import { createHash } from 'node:crypto'

import Stripe from 'stripe'

import type { DiagnosticProviderConfig, DiagnosticWebhookConfig } from './config'

export const diagnosticAmountCents = 20_000 as const
export const diagnosticCurrency = 'usd' as const
export const diagnosticCheckoutLifetimeSeconds = 60 * 60
const stripeApiVersion = '2026-07-29.dahlia' as const

export type DiagnosticCheckout = {
  checkoutUrl: string
  sessionId: string
}

function deterministicLetters(value: string, length: number): string {
  return Array.from(createHash('sha256').update(value).digest().subarray(0, length), (byte) =>
    String.fromCharCode(97 + (byte % 26)),
  ).join('')
}

export function buildDiagnosticCheckoutParams(
  requestId: string,
  publicSiteOrigin: string,
  requestConsentedAt: string,
): Stripe.Checkout.SessionCreateParams {
  const requestConsentedAtMs = Date.parse(requestConsentedAt)
  if (!Number.isSafeInteger(requestConsentedAtMs) || requestConsentedAtMs < 0) {
    throw new Error('diagnostic_request_time_invalid')
  }
  const metadata = { diagnostic_request_id: requestId }

  return {
    cancel_url: `${publicSiteOrigin}/readiness/?checkout=canceled`,
    client_reference_id: requestId,
    custom_text: {
      after_submit: {
        message: 'Once payment is confirmed, check your email to choose the exact call time.',
      },
      submit: {
        message:
          'This one-time payment covers your architecture diagnostic working session. Your readiness report is emailed separately.',
      },
    },
    expires_at: Math.floor(requestConsentedAtMs / 1_000) + diagnosticCheckoutLifetimeSeconds,
    integration_identifier: `saberistic_architecture_diagnostic_${deterministicLetters(requestId, 8)}`,
    line_items: [
      {
        price_data: {
          currency: diagnosticCurrency,
          product_data: {
            description:
              'A focused architecture review of your readiness assessment with practical next-step guidance.',
            name: 'Saberistic Architecture Diagnostic',
          },
          unit_amount: diagnosticAmountCents,
        },
        quantity: 1,
      },
    ],
    metadata,
    mode: 'payment',
    origin_context: 'web',
    payment_intent_data: { metadata },
    success_url: `${publicSiteOrigin}/readiness/?checkout=success`,
  }
}

function stripeClient(apiKey: string): Stripe {
  return new Stripe(apiKey, {
    apiVersion: stripeApiVersion,
    maxNetworkRetries: 2,
    telemetry: false,
    timeout: 12_000,
  })
}

export async function createDiagnosticCheckout(
  requestId: string,
  config: DiagnosticProviderConfig,
  requestConsentedAt: string,
): Promise<DiagnosticCheckout> {
  const stripe = stripeClient(config.stripeApiKey)
  const idempotencyKey = `architecture-diagnostic-${createHash('sha256')
    .update(requestId)
    .digest('hex')}`
  const session = await stripe.checkout.sessions.create(
    buildDiagnosticCheckoutParams(requestId, config.publicSiteOrigin, requestConsentedAt),
    { idempotencyKey },
  )

  if (!session.url || !/^cs_(?:test|live)_[A-Za-z0-9]+$/.test(session.id)) {
    throw new Error('stripe_checkout_invalid')
  }
  const checkoutUrl = new URL(session.url)
  if (
    checkoutUrl.protocol !== 'https:' ||
    checkoutUrl.hostname !== 'checkout.stripe.com' ||
    checkoutUrl.username ||
    checkoutUrl.password ||
    (checkoutUrl.port && checkoutUrl.port !== '443')
  ) {
    throw new Error('stripe_checkout_url_invalid')
  }

  return { checkoutUrl: checkoutUrl.toString(), sessionId: session.id }
}

export function verifyDiagnosticStripeEvent(
  rawBody: string,
  signature: string,
  config: DiagnosticWebhookConfig,
): Stripe.Event {
  return stripeClient(config.stripeApiKey).webhooks.constructEvent(
    rawBody,
    signature,
    config.stripeWebhookSecret,
  )
}
