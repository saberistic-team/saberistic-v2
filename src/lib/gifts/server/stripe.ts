import 'server-only'

import { createHash } from 'node:crypto'

import Stripe from 'stripe'

import { giftRecipientProfile } from '../profile'
import type { GiftQuoteClaim } from '../types'
import type { StripeGiftConfig } from './config'
import { buildGiftSessionMetadata } from './stripe-metadata'

const stripeApiVersion = '2026-07-29.dahlia' as const
export const giftCheckoutLifetimeSeconds = 60 * 60
export const giftCheckoutMinimumLeadSeconds = 30 * 60

export class GiftCheckoutProviderError extends Error {
  constructor(
    readonly certainty: 'ambiguous' | 'definitive',
    cause?: unknown,
  ) {
    super('gift_checkout_provider_error', { cause })
    this.name = 'GiftCheckoutProviderError'
  }
}

export function giftCheckoutExpiresAt(claim: GiftQuoteClaim): number {
  return claim.issuedAt + giftCheckoutLifetimeSeconds
}

export function giftCheckoutIdentifiers(quoteToken: string): {
  idempotencyKey: string
  integrationIdentifier: string
  inventoryReservationId: string
} {
  const digest = createHash('sha256').update(quoteToken).digest()
  const suffix = Array.from(digest.subarray(0, 8), (byte) =>
    String.fromCharCode(97 + (byte % 26)),
  ).join('')

  return {
    idempotencyKey: `gift-draft-${digest.toString('hex')}`,
    integrationIdentifier: `saberistic_gift_draft_${suffix}`,
    inventoryReservationId: `gift-reservation-${digest.toString('hex')}`,
  }
}

function boundedMetadata(value: string, maximum = 500): string {
  return value.length <= maximum ? value : `${value.slice(0, maximum - 1)}…`
}

export function buildGiftCheckoutParams(
  claim: GiftQuoteClaim,
  publicSiteOrigin: string,
  quoteSecret: string,
  integrationIdentifier: string,
  inventoryReservationId: string,
  _nowMs: number = Date.now(),
): Stripe.Checkout.SessionCreateParams {
  const itemName = boundedMetadata(claim.itemName, 100)
  const sourceHost = new URL(claim.sourceUrl).hostname
  const sharedMetadata = buildGiftSessionMetadata(claim, inventoryReservationId, quoteSecret)

  return {
    billing_address_collection: 'auto',
    cancel_url: `${publicSiteOrigin}/gifts/?checkout=canceled`,
    client_reference_id: claim.runId,
    custom_fields: [
      {
        key: 'note_for_amir',
        label: { custom: 'Note for AmirSaber (optional)', type: 'custom' },
        optional: true,
        text: { maximum_length: 180, minimum_length: 0 },
        type: 'text',
      },
    ],
    custom_text: {
      after_submit: {
        message:
          'Thank you. Stripe will return you to Gift Draft. No retailer order is placed automatically; AmirSaber handles the gift manually.',
      },
      submit: {
        message:
          'This is a Gift Draft contribution based on an approximate reference listing, not a promise to buy that exact item or price. AmirSaber may apply it to the selected item, tax or shipping, or a similar gift if the listing changes. The reference retailer does not receive this payment.',
      },
    },
    expires_at: giftCheckoutExpiresAt(claim),
    integration_identifier: integrationIdentifier,
    line_items: [
      {
        price_data: {
          currency: claim.currency,
          product_data: {
            description: boundedMetadata(
              `Contribution for ${giftRecipientProfile.shortName}, inspired by an approximate listing at ${claim.retailer} (${sourceHost}). No retailer order is placed automatically; funds may cover the item, tax or shipping, or a similar gift if the listing changes.`,
              300,
            ),
            name: `Gift Draft contribution — ${itemName}`,
          },
          unit_amount: claim.amountCents,
        },
        quantity: 1,
      },
    ],
    metadata: sharedMetadata,
    mode: 'payment',
    origin_context: 'web',
    payment_intent_data: {
      description: boundedMetadata(`Gift for ${giftRecipientProfile.shortName}: ${itemName}`, 200),
      metadata: sharedMetadata,
    },
    success_url: `${publicSiteOrigin}/gifts/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
  }
}

export function createGiftStripeClient(apiKey: string): Stripe {
  return new Stripe(apiKey, {
    apiVersion: stripeApiVersion,
    maxNetworkRetries: 2,
    telemetry: false,
    timeout: 12_000,
  })
}

export function giftCheckoutProviderErrorCertainty(
  error: unknown,
): GiftCheckoutProviderError['certainty'] {
  if (!error || typeof error !== 'object') return 'ambiguous'
  const candidate = error as { statusCode?: unknown; type?: unknown }
  const statusCode = candidate.statusCode
  const type = candidate.type

  if (type === 'StripeAuthenticationError' || type === 'StripePermissionError') {
    return 'definitive'
  }
  if (
    type === 'StripeInvalidRequestError' &&
    typeof statusCode === 'number' &&
    statusCode >= 400 &&
    statusCode < 500 &&
    statusCode !== 409 &&
    statusCode !== 429
  ) {
    return 'definitive'
  }
  return 'ambiguous'
}

export async function createGiftCheckoutSession(
  claim: GiftQuoteClaim,
  quoteToken: string,
  config: StripeGiftConfig,
  nowMs: number = Date.now(),
): Promise<{ checkoutUrl: string; inventoryReservationId: string; sessionId: string }> {
  const stripe = createGiftStripeClient(config.apiKey)
  const identifiers = giftCheckoutIdentifiers(quoteToken)
  let session: Stripe.Checkout.Session
  try {
    session = await stripe.checkout.sessions.create(
      buildGiftCheckoutParams(
        claim,
        config.publicSiteOrigin,
        config.quoteSecret,
        identifiers.integrationIdentifier,
        identifiers.inventoryReservationId,
        nowMs,
      ),
      { idempotencyKey: identifiers.idempotencyKey },
    )
  } catch (error) {
    throw new GiftCheckoutProviderError(giftCheckoutProviderErrorCertainty(error), error)
  }

  if (!session.url) throw new GiftCheckoutProviderError('ambiguous')
  const url = new URL(session.url)
  if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') {
    throw new GiftCheckoutProviderError('ambiguous')
  }

  return {
    checkoutUrl: url.toString(),
    inventoryReservationId: identifiers.inventoryReservationId,
    sessionId: session.id,
  }
}
