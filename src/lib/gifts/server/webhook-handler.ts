import 'server-only'

import type Stripe from 'stripe'

import { resolveStripeGiftWebhookConfig, type StripeGiftWebhookConfig } from './config'
import {
  giftPaymentFromCheckoutEvent,
  giftPaymentFromRefundEvent,
  type GiftPaymentStore,
  upsertGiftPayment,
} from './payments'
import {
  getGiftInventoryDatabase,
  transitionGiftInventoryFromPaymentStatus,
  type GiftInventoryDatabase,
} from './inventory'
import { createGiftStripeClient } from './stripe'
import { hasGiftDraftMetadata } from './stripe-metadata'

const maximumWebhookBytes = 128 * 1024

type WebhookDependencies = {
  constructEvent?: (
    body: Buffer,
    signature: string,
    config: StripeGiftWebhookConfig,
  ) => Stripe.Event
  environment?: NodeJS.ProcessEnv
  findRefundSession?: (
    paymentIntentId: string,
    config: StripeGiftWebhookConfig,
  ) => Promise<Stripe.Checkout.Session | null>
  inventoryDatabase?: GiftInventoryDatabase
  store?: GiftPaymentStore
  transitionInventory?: typeof transitionGiftInventoryFromPaymentStatus
}

function webhookResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
    status,
  })
}

function webhookLog(record: {
  duplicate?: boolean
  outcome: 'handled' | 'ignored' | 'invalid' | 'persistence_error'
  stripeEventType?: string
}) {
  console.info(JSON.stringify({ event: 'gift_draft_webhook', ...record }))
}

async function readBoundedWebhookBody(request: Request): Promise<Buffer | null> {
  const contentLength = request.headers.get('content-length')
  if (contentLength !== null) {
    const declared = Number(contentLength)
    if (!Number.isSafeInteger(declared) || declared < 0 || declared > maximumWebhookBytes) {
      return null
    }
  }
  if (!request.body) return null

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const result = await reader.read()
      if (result.done) break
      if (!result.value) continue
      length += result.value.byteLength
      if (length > maximumWebhookBytes) {
        try {
          await reader.cancel()
        } catch {
          // The oversized body is already rejected.
        }
        return null
      }
      chunks.push(result.value)
    }
  } finally {
    reader.releaseLock()
  }
  if (length === 0) return null
  return Buffer.concat(
    chunks.map((chunk) => Buffer.from(chunk)),
    length,
  )
}

function defaultConstructEvent(
  body: Buffer,
  signature: string,
  config: StripeGiftWebhookConfig,
): Stripe.Event {
  return createGiftStripeClient(config.apiKey).webhooks.constructEvent(
    body,
    signature,
    config.webhookSecret,
  )
}

async function defaultFindRefundSession(
  paymentIntentId: string,
  config: StripeGiftWebhookConfig,
): Promise<Stripe.Checkout.Session | null> {
  const sessions = await createGiftStripeClient(config.apiKey).checkout.sessions.list({
    limit: 2,
    payment_intent: paymentIntentId,
  })
  if (sessions.data.length === 0) return null
  if (sessions.data.length !== 1 || sessions.has_more) {
    throw new Error('gift_refund_session_ambiguous')
  }
  return sessions.data[0] ?? null
}

function refundPaymentIntentId(event: Stripe.Event): string | null {
  if (event.type !== 'charge.refunded' || event.data.object.object !== 'charge') return null
  const charge = event.data.object as Stripe.Charge
  if (typeof charge.payment_intent === 'string') return charge.payment_intent
  if (charge.payment_intent && typeof charge.payment_intent === 'object') {
    return charge.payment_intent.id
  }
  return null
}

async function defaultStore(): Promise<GiftPaymentStore> {
  const { payloadGiftPaymentStore } = await import('./payload-payments')
  return payloadGiftPaymentStore
}

export async function handleGiftWebhook(
  request: Request,
  dependencies: WebhookDependencies = {},
): Promise<Response> {
  const environment = dependencies.environment ?? process.env
  const config = resolveStripeGiftWebhookConfig(environment)
  if (!config) return webhookResponse({ error: 'Gift payment webhooks are unavailable.' }, 503)

  if (request.headers.get('content-type')?.split(';', 1)[0]?.trim() !== 'application/json') {
    return webhookResponse({ error: 'Unsupported webhook content type.' }, 415)
  }
  const signature = request.headers.get('stripe-signature')?.trim()
  if (!signature || signature.length > 2_048) {
    return webhookResponse({ error: 'Invalid webhook signature.' }, 400)
  }

  const body = await readBoundedWebhookBody(request)
  if (!body) return webhookResponse({ error: 'Invalid webhook body.' }, 413)

  let event: Stripe.Event
  try {
    event = (dependencies.constructEvent ?? defaultConstructEvent)(body, signature, config)
  } catch {
    webhookLog({ outcome: 'invalid' })
    return webhookResponse({ error: 'Invalid webhook signature.' }, 400)
  }

  if (
    event.type !== 'checkout.session.completed' &&
    event.type !== 'checkout.session.async_payment_succeeded' &&
    event.type !== 'checkout.session.async_payment_failed' &&
    event.type !== 'checkout.session.expired' &&
    event.type !== 'charge.refunded'
  ) {
    webhookLog({ outcome: 'ignored', stripeEventType: event.type })
    return webhookResponse({ handled: false, received: true })
  }

  let payment
  if (event.type === 'charge.refunded') {
    const paymentIntentId = refundPaymentIntentId(event)
    if (!paymentIntentId) {
      webhookLog({ outcome: 'ignored', stripeEventType: event.type })
      return webhookResponse({ handled: false, received: true })
    }
    let session: Stripe.Checkout.Session | null
    try {
      session = await (dependencies.findRefundSession ?? defaultFindRefundSession)(
        paymentIntentId,
        config,
      )
    } catch {
      webhookLog({ outcome: 'persistence_error', stripeEventType: event.type })
      return webhookResponse({ error: 'Gift payment processing failed.' }, 500)
    }
    if (!session || !hasGiftDraftMetadata(session)) {
      webhookLog({ outcome: 'ignored', stripeEventType: event.type })
      return webhookResponse({ handled: false, received: true })
    }
    payment = giftPaymentFromRefundEvent(event, session, config.quoteSecret)
  } else {
    const session = event.data.object as Stripe.Checkout.Session
    if (!hasGiftDraftMetadata(session)) {
      webhookLog({ outcome: 'ignored', stripeEventType: event.type })
      return webhookResponse({ handled: false, received: true })
    }
    payment = giftPaymentFromCheckoutEvent(event, config.quoteSecret)
  }

  if (!payment) {
    webhookLog({ outcome: 'invalid', stripeEventType: event.type })
    return webhookResponse({ error: 'Invalid Gift Draft payment event.' }, 400)
  }

  try {
    const result = await upsertGiftPayment(dependencies.store ?? (await defaultStore()), payment)
    const inventoryTransition = await (
      dependencies.transitionInventory ?? transitionGiftInventoryFromPaymentStatus
    )(dependencies.inventoryDatabase ?? getGiftInventoryDatabase(), {
      offerId: result.record.giftOfferId,
      paymentStatus: result.record.paymentStatus,
      reservationId: result.record.inventoryReservationId,
    })
    if (inventoryTransition === 'unchanged') {
      throw new Error('gift_inventory_transition_failed')
    }
    webhookLog({
      duplicate: result.duplicate,
      outcome: 'handled',
      stripeEventType: event.type,
    })
    return webhookResponse({
      duplicate: result.duplicate,
      handled: true,
      received: true,
    })
  } catch {
    webhookLog({ outcome: 'persistence_error', stripeEventType: event.type })
    return webhookResponse({ error: 'Gift payment processing failed.' }, 500)
  }
}
