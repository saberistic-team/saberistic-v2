import { describe, expect, it, vi } from 'vitest'
import Stripe from 'stripe'

vi.mock('server-only', () => ({}))

import type { GiftQuoteClaim } from '@/lib/gifts'
import { handleGiftPaymentStatus } from '@/lib/gifts/server/payment-status-handler'
import type { GiftInventoryDatabase } from '@/lib/gifts/server/inventory'
import {
  giftPaymentFromCheckoutEvent,
  giftPaymentFromRefundEvent,
  type GiftPaymentRecord,
  type GiftPaymentStore,
  upsertGiftPayment,
} from '@/lib/gifts/server/payments'
import {
  buildGiftSessionMetadata,
  validateGiftCheckoutSession,
} from '@/lib/gifts/server/stripe-metadata'
import { handleGiftWebhook } from '@/lib/gifts/server/webhook-handler'

const quoteSecret = 'gift-payment-test-secret-that-is-longer-than-32-characters'
const sessionId = 'cs_test_1234567890abcdef'
const paymentIntentId = 'pi_1234567890abcdef'
const nowSeconds = 1_800_000_000
const inventoryReservationId = `gift-reservation-${'a'.repeat(64)}`
const inventoryDatabase = {} as GiftInventoryDatabase

function successfulInventoryTransition() {
  return vi.fn(async () => 'sold' as const)
}

const claim: GiftQuoteClaim = {
  amountCents: 12_345,
  category: 'Desk life',
  currency: 'usd',
  expiresAt: nowSeconds + 7_200,
  issuedAt: nowSeconds,
  itemName: 'Machined aluminum desk organizer',
  offerId: 'offer_12345678',
  retailer: 'Example Maker',
  runId: 'run_1234567890123456',
  sourceUrl: 'https://maker.example/products/desk-organizer',
  version: 1,
}

function checkoutSession(
  overrides: Partial<Stripe.Checkout.Session> = {},
): Stripe.Checkout.Session {
  return {
    amount_total: claim.amountCents,
    client_reference_id: claim.runId,
    created: nowSeconds,
    currency: 'usd',
    custom_fields: [
      {
        key: 'note_for_amir',
        label: { custom: 'Note', type: 'custom' },
        optional: true,
        text: { value: 'For your next build.' },
        type: 'text',
      },
    ],
    customer_details: { email: 'Giver@Example.com' },
    customer_email: null,
    id: sessionId,
    integration_identifier: 'saberistic_gift_draft_abcdefgh',
    livemode: false,
    metadata: buildGiftSessionMetadata(claim, inventoryReservationId, quoteSecret),
    mode: 'payment',
    object: 'checkout.session',
    payment_intent: paymentIntentId,
    payment_status: 'paid',
    status: 'complete',
    ...overrides,
  } as unknown as Stripe.Checkout.Session
}

function stripeEvent(
  type:
    | 'charge.refunded'
    | 'checkout.session.async_payment_failed'
    | 'checkout.session.async_payment_succeeded'
    | 'checkout.session.completed'
    | 'checkout.session.expired',
  object: Stripe.Charge | Stripe.Checkout.Session,
  id = 'evt_1234567890abcdef',
  created = nowSeconds + 60,
): Stripe.Event {
  return {
    api_version: '2026-07-29.dahlia',
    created,
    data: { object },
    id,
    livemode: false,
    object: 'event',
    pending_webhooks: 1,
    request: null,
    type,
  } as unknown as Stripe.Event
}

function refundedCharge(amountRefunded: number): Stripe.Charge {
  return {
    amount: claim.amountCents,
    amount_refunded: amountRefunded,
    created: nowSeconds + 30,
    currency: 'usd',
    id: 'ch_1234567890abcdef',
    livemode: false,
    object: 'charge',
    payment_intent: paymentIntentId,
    refunded: amountRefunded === claim.amountCents,
  } as unknown as Stripe.Charge
}

function memoryStore(initial: GiftPaymentRecord | null = null): {
  current: () => GiftPaymentRecord | null
  store: GiftPaymentStore
} {
  let record = initial
  const store: GiftPaymentStore = {
    async create(data) {
      record = { ...data, id: 1 }
      return record
    },
    async findBySessionId(id) {
      return record?.stripeCheckoutSessionId === id ? record : null
    },
    async update(id, data) {
      if (!record || record.id !== id) throw new Error('missing fixture record')
      record = { ...record, ...data }
      return record
    },
  }
  return { current: () => record, store }
}

function environment(overrides: Partial<NodeJS.ProcessEnv> = {}): NodeJS.ProcessEnv {
  return {
    GIFTING_CHECKOUT_ENABLED: '0',
    GIFT_QUOTE_SECRET: quoteSecret,
    NODE_ENV: 'production',
    PUBLIC_SITE_URL: 'https://saberistic.com',
    RENDER: 'true',
    RENDER_SERVICE_TYPE: 'web',
    SITE_URL: 'https://saberistic-web.example',
    STRIPE_GIFT_WEBHOOK_SECRET: `whsec_${'w'.repeat(32)}`,
    STRIPE_RESTRICTED_KEY: `rk_test_${'s'.repeat(32)}`,
    ...overrides,
  }
}

function statusRequest(): Request {
  return new Request(
    `https://saberistic-web.example/api/gifts/payment-status?session_id=${sessionId}`,
    { headers: { 'CF-Connecting-IP': '198.51.100.27' } },
  )
}

function webhookRequest(body = '{}'): Request {
  return new Request('https://saberistic-web.example/api/gifts/webhook', {
    body,
    headers: {
      'Content-Type': 'application/json',
      'Stripe-Signature': 't=1800000000,v1=fixture',
    },
    method: 'POST',
  })
}

describe('signed Gift Draft Stripe metadata', () => {
  it('binds the exact item, source, amount, and Session invariants', () => {
    const session = checkoutSession()
    expect(validateGiftCheckoutSession(session, quoteSecret)).toMatchObject({
      amountCents: claim.amountCents,
      giftNote: 'For your next build.',
      itemName: claim.itemName,
      payerEmail: 'giver@example.com',
      referenceSource: claim.sourceUrl,
      stripePaymentIntentId: paymentIntentId,
    })

    const metadata = { ...session.metadata, gift_amount_cents: '1000' }
    expect(validateGiftCheckoutSession(checkoutSession({ metadata }), quoteSecret)).toBeNull()
  })

  it('refuses a source that cannot be stored exactly in Stripe metadata', () => {
    expect(() =>
      buildGiftSessionMetadata(
        { ...claim, sourceUrl: `https://maker.example/${'a'.repeat(500)}` },
        inventoryReservationId,
        quoteSecret,
      ),
    ).toThrow('gift_reference_source_too_long')
  })
})

describe('Gift Draft payment event normalization', () => {
  it('keeps a completed unpaid checkout pending without inventing confirmation data', () => {
    const payment = giftPaymentFromCheckoutEvent(
      stripeEvent(
        'checkout.session.completed',
        checkoutSession({ payment_intent: null, payment_status: 'unpaid' }),
      ),
      quoteSecret,
    )

    expect(payment).toMatchObject({
      paymentStatus: 'pending',
      refundedAmountCents: 0,
      stripeEventType: 'checkout.session.completed',
    })
    expect(payment).not.toHaveProperty('paymentConfirmedAt')
    expect(payment?.stripePaymentIntentId).toBeUndefined()
  })

  it('accepts only coherent async-failure and expiration state transitions', () => {
    const failed = giftPaymentFromCheckoutEvent(
      stripeEvent(
        'checkout.session.async_payment_failed',
        checkoutSession({ payment_intent: null, payment_status: 'unpaid' }),
      ),
      quoteSecret,
    )
    const expired = giftPaymentFromCheckoutEvent(
      stripeEvent(
        'checkout.session.expired',
        checkoutSession({
          payment_intent: null,
          payment_status: 'unpaid',
          status: 'expired',
        }),
        'evt_expired12345678',
      ),
      quoteSecret,
    )

    expect(failed).toMatchObject({
      paymentFailedAt: new Date((nowSeconds + 60) * 1_000).toISOString(),
      paymentStatus: 'failed',
    })
    expect(expired).toMatchObject({
      checkoutExpiredAt: new Date((nowSeconds + 60) * 1_000).toISOString(),
      paymentStatus: 'expired',
    })

    expect(
      giftPaymentFromCheckoutEvent(
        stripeEvent(
          'checkout.session.async_payment_succeeded',
          checkoutSession({ payment_intent: null, payment_status: 'unpaid' }),
        ),
        quoteSecret,
      ),
    ).toBeNull()
    expect(
      giftPaymentFromCheckoutEvent(
        stripeEvent(
          'checkout.session.completed',
          checkoutSession({ payment_intent: null, payment_status: 'paid' }),
        ),
        quoteSecret,
      ),
    ).toBeNull()
  })

  it('derives refund amounts and timestamps only from a matching Stripe charge', () => {
    const charge = refundedCharge(2_000)
    const payment = giftPaymentFromRefundEvent(
      stripeEvent('charge.refunded', charge, 'evt_partialrefund1234', nowSeconds + 120),
      checkoutSession(),
      quoteSecret,
    )

    expect(payment).toMatchObject({
      paymentConfirmedAt: new Date(charge.created * 1_000).toISOString(),
      paymentStatus: 'partially_refunded',
      refundedAmountCents: 2_000,
      refundedAt: new Date((nowSeconds + 120) * 1_000).toISOString(),
      stripeChargeId: 'ch_1234567890abcdef',
    })

    expect(
      giftPaymentFromRefundEvent(
        stripeEvent('charge.refunded', {
          ...charge,
          payment_intent: 'pi_different123456',
        } as Stripe.Charge),
        checkoutSession(),
        quoteSecret,
      ),
    ).toBeNull()
    expect(
      giftPaymentFromRefundEvent(
        stripeEvent('charge.refunded', {
          ...charge,
          amount_refunded: claim.amountCents + 1,
        } as Stripe.Charge),
        checkoutSession(),
        quoteSecret,
      ),
    ).toBeNull()
  })
})

describe('Gift Draft payment persistence', () => {
  it('creates once and treats an exact Stripe retry as an idempotent no-op', async () => {
    const payment = giftPaymentFromCheckoutEvent(
      stripeEvent('checkout.session.completed', checkoutSession()),
      quoteSecret,
    )
    if (!payment) throw new Error('Expected a valid payment fixture.')
    const memory = memoryStore()

    const first = await upsertGiftPayment(memory.store, payment)
    const duplicate = await upsertGiftPayment(memory.store, payment)

    expect(first.duplicate).toBe(false)
    expect(duplicate.duplicate).toBe(true)
    expect(memory.current()).toMatchObject({
      fulfillmentStatus: 'awaiting_review',
      payerEmail: 'giver@example.com',
      paymentStatus: 'paid',
      processedStripeEventIds: [payment.stripeEventId],
    })
  })

  it('recovers idempotently when another delivery wins the unique Session insert', async () => {
    const payment = giftPaymentFromCheckoutEvent(
      stripeEvent('checkout.session.completed', checkoutSession()),
      quoteSecret,
    )
    if (!payment) throw new Error('Expected a valid payment fixture.')
    let concurrent: GiftPaymentRecord | null = null
    const store: GiftPaymentStore = {
      async create(data) {
        concurrent = { ...data, id: 9 }
        throw new Error('duplicate key')
      },
      async findBySessionId() {
        return concurrent
      },
      async update() {
        throw new Error('duplicate delivery must not update')
      },
    }

    await expect(upsertGiftPayment(store, payment)).resolves.toMatchObject({ duplicate: true })
  })

  it('uses the store exclusivity boundary before reading an existing payment', async () => {
    const payment = giftPaymentFromCheckoutEvent(
      stripeEvent('checkout.session.completed', checkoutSession()),
      quoteSecret,
    )
    if (!payment) throw new Error('Expected a valid payment fixture.')
    const memory = memoryStore()
    const runExclusive = vi.fn(async (_sessionId, operation) => operation(memory.store))

    await upsertGiftPayment({ ...memory.store, runExclusive }, payment)

    expect(runExclusive).toHaveBeenCalledOnce()
    expect(runExclusive).toHaveBeenCalledWith(sessionId, expect.any(Function))
  })

  it('records partial then full refunds without letting older events restore paid status', async () => {
    const paid = giftPaymentFromCheckoutEvent(
      stripeEvent('checkout.session.completed', checkoutSession()),
      quoteSecret,
    )
    const partial = giftPaymentFromRefundEvent(
      stripeEvent(
        'charge.refunded',
        refundedCharge(2_000),
        'evt_partialrefund1234',
        nowSeconds + 120,
      ),
      checkoutSession(),
      quoteSecret,
    )
    const full = giftPaymentFromRefundEvent(
      stripeEvent(
        'charge.refunded',
        refundedCharge(claim.amountCents),
        'evt_fullrefund123456',
        nowSeconds + 180,
      ),
      checkoutSession(),
      quoteSecret,
    )
    if (!paid || !partial || !full) throw new Error('Expected valid refund fixtures.')

    const memory = memoryStore()
    await upsertGiftPayment(memory.store, paid)
    await upsertGiftPayment(memory.store, partial)
    expect(memory.current()).toMatchObject({
      paymentStatus: 'partially_refunded',
      refundedAmountCents: 2_000,
      stripeChargeId: 'ch_1234567890abcdef',
    })
    await upsertGiftPayment(memory.store, full)
    await upsertGiftPayment(memory.store, {
      ...paid,
      stripeEventId: 'evt_latepaid1234567',
      stripeEventCreatedAt: paid.stripeEventCreatedAt,
    })
    expect(memory.current()).toMatchObject({
      paymentStatus: 'refunded',
      refundedAmountCents: claim.amountCents,
      stripeEventId: full.stripeEventId,
      stripeEventType: 'charge.refunded',
    })
  })

  it('rejects a replay that changes the signed payment identity', async () => {
    const paid = giftPaymentFromCheckoutEvent(
      stripeEvent('checkout.session.completed', checkoutSession()),
      quoteSecret,
    )
    if (!paid) throw new Error('Expected a valid payment fixture.')
    const memory = memoryStore()
    await upsertGiftPayment(memory.store, paid)

    await expect(
      upsertGiftPayment(memory.store, {
        ...paid,
        giftOfferId: 'offer_forged123',
        stripeEventId: 'evt_forgedidentity1',
      }),
    ).rejects.toThrow('gift_payment_identity_mismatch')
    expect(memory.current()).toMatchObject({
      giftOfferId: claim.offerId,
      processedStripeEventIds: [paid.stripeEventId],
    })
  })

  it('bounds the replay ledger while retaining the newest event ID', async () => {
    const paid = giftPaymentFromCheckoutEvent(
      stripeEvent('checkout.session.completed', checkoutSession()),
      quoteSecret,
    )
    if (!paid) throw new Error('Expected a valid payment fixture.')
    const historicalIds = Array.from(
      { length: 100 },
      (_, index) => `evt_history${String(index).padStart(4, '0')}`,
    )
    const memory = memoryStore({
      ...paid,
      fulfillmentStatus: 'awaiting_review',
      id: 4,
      processedStripeEventIds: historicalIds,
    })
    const incomingId = 'evt_newesthistory123'

    await upsertGiftPayment(memory.store, {
      ...paid,
      stripeEventCreatedAt: new Date((nowSeconds + 180) * 1_000).toISOString(),
      stripeEventId: incomingId,
    })

    expect(memory.current()?.processedStripeEventIds).toHaveLength(100)
    expect(memory.current()?.processedStripeEventIds[0]).toBe(historicalIds[1])
    expect(memory.current()?.processedStripeEventIds.at(-1)).toBe(incomingId)
  })
})

describe('Gift Draft Stripe webhook', () => {
  it('accepts a real Stripe signature and rejects metadata changed after signing', async () => {
    const webhookSecret = `whsec_${'w'.repeat(32)}`
    const stripe = new Stripe(`rk_test_${'s'.repeat(32)}`, {
      apiVersion: '2026-07-29.dahlia',
    })
    const validEvent = stripeEvent('checkout.session.completed', checkoutSession())
    const validPayload = JSON.stringify(validEvent)
    const validSignature = stripe.webhooks.generateTestHeaderString({
      payload: validPayload,
      secret: webhookSecret,
    })
    const validResponse = await handleGiftWebhook(
      new Request('https://saberistic-web.example/api/gifts/webhook', {
        body: validPayload,
        headers: {
          'Content-Type': 'application/json',
          'Stripe-Signature': validSignature,
        },
        method: 'POST',
      }),
      {
        environment: environment(),
        inventoryDatabase,
        store: memoryStore().store,
        transitionInventory: successfulInventoryTransition(),
      },
    )
    expect(validResponse.status).toBe(200)

    const invalidSession = checkoutSession({
      metadata: { ...checkoutSession().metadata, gift_amount_cents: '1000' },
    })
    const invalidEvent = stripeEvent('checkout.session.completed', invalidSession)
    const invalidPayload = JSON.stringify(invalidEvent)
    const invalidSignature = stripe.webhooks.generateTestHeaderString({
      payload: invalidPayload,
      secret: webhookSecret,
    })
    const invalidResponse = await handleGiftWebhook(
      new Request('https://saberistic-web.example/api/gifts/webhook', {
        body: invalidPayload,
        headers: {
          'Content-Type': 'application/json',
          'Stripe-Signature': invalidSignature,
        },
        method: 'POST',
      }),
      { environment: environment(), store: memoryStore().store },
    )
    expect(invalidResponse.status).toBe(400)
  })

  it('verifies the exact bounded raw body and persists while new checkout is disabled', async () => {
    const raw = '{"event":"exact-✓"}'
    const event = stripeEvent('checkout.session.completed', checkoutSession())
    const memory = memoryStore()
    const transitionInventory = successfulInventoryTransition()
    const constructEvent = vi.fn((body: Buffer) => {
      expect(body.equals(Buffer.from(raw))).toBe(true)
      return event
    })
    const request = new Request('https://saberistic-web.example/api/gifts/webhook', {
      body: raw,
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': 't=1800000000,v1=fixture',
      },
      method: 'POST',
    })

    const response = await handleGiftWebhook(request, {
      constructEvent,
      environment: environment(),
      inventoryDatabase,
      store: memory.store,
      transitionInventory,
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      duplicate: false,
      handled: true,
      received: true,
    })
    expect(constructEvent).toHaveBeenCalledOnce()
    expect(transitionInventory).toHaveBeenCalledWith(inventoryDatabase, {
      offerId: claim.offerId,
      paymentStatus: 'paid',
      reservationId: inventoryReservationId,
    })
  })

  it('rejects an oversized body before signature verification', async () => {
    const constructEvent = vi.fn()
    const response = await handleGiftWebhook(
      new Request('https://saberistic-web.example/api/gifts/webhook', {
        body: 'x'.repeat(128 * 1024 + 1),
        headers: {
          'Content-Type': 'application/json',
          'Stripe-Signature': 't=1800000000,v1=fixture',
        },
        method: 'POST',
      }),
      { constructEvent, environment: environment() },
    )

    expect(response.status).toBe(413)
    expect(constructEvent).not.toHaveBeenCalled()
  })

  it('resolves the Checkout Session for a refund before persisting it', async () => {
    const event = stripeEvent(
      'charge.refunded',
      refundedCharge(2_000),
      'evt_webhookrefund123',
      nowSeconds + 120,
    )
    const findRefundSession = vi.fn(async () => checkoutSession())
    const memory = memoryStore()

    const response = await handleGiftWebhook(webhookRequest(), {
      constructEvent: () => event,
      environment: environment(),
      findRefundSession,
      inventoryDatabase,
      store: memory.store,
      transitionInventory: successfulInventoryTransition(),
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      duplicate: false,
      handled: true,
      received: true,
    })
    expect(findRefundSession).toHaveBeenCalledWith(
      paymentIntentId,
      expect.objectContaining({ quoteSecret }),
    )
    expect(memory.current()).toMatchObject({
      paymentStatus: 'partially_refunded',
      refundedAmountCents: 2_000,
      stripeChargeId: 'ch_1234567890abcdef',
    })
  })

  it('retries the inventory transition when Stripe redelivers a duplicate event', async () => {
    const event = stripeEvent('checkout.session.completed', checkoutSession())
    const memory = memoryStore()
    const transitionInventory = successfulInventoryTransition()
    const dependencies = {
      constructEvent: () => event,
      environment: environment(),
      inventoryDatabase,
      store: memory.store,
      transitionInventory,
    }

    const first = await handleGiftWebhook(webhookRequest(), dependencies)
    const duplicate = await handleGiftWebhook(webhookRequest(), dependencies)

    expect(first.status).toBe(200)
    expect(duplicate.status).toBe(200)
    await expect(duplicate.json()).resolves.toMatchObject({ duplicate: true, handled: true })
    expect(transitionInventory).toHaveBeenCalledTimes(2)
  })

  it('returns an error so Stripe retries when the inventory transition fails', async () => {
    const response = await handleGiftWebhook(webhookRequest(), {
      constructEvent: () => stripeEvent('checkout.session.completed', checkoutSession()),
      environment: environment(),
      inventoryDatabase,
      store: memoryStore().store,
      transitionInventory: async () => {
        throw new Error('inventory unavailable')
      },
    })

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: 'Gift payment processing failed.',
    })
  })

  it('returns an error so Stripe retries when no inventory row can transition', async () => {
    const response = await handleGiftWebhook(webhookRequest(), {
      constructEvent: () => stripeEvent('checkout.session.completed', checkoutSession()),
      environment: environment(),
      inventoryDatabase,
      store: memoryStore().store,
      transitionInventory: async () => 'unchanged',
    })

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: 'Gift payment processing failed.',
    })
  })

  it('acknowledges unrelated events without touching persistence', async () => {
    const store = memoryStore().store
    const create = vi.spyOn(store, 'create')
    const response = await handleGiftWebhook(webhookRequest(), {
      constructEvent: () =>
        ({
          data: { object: { object: 'customer' } },
          id: 'evt_unrelated12345',
          type: 'customer.created',
        }) as unknown as Stripe.Event,
      environment: environment(),
      store,
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ handled: false, received: true })
    expect(create).not.toHaveBeenCalled()
  })
})

describe('Gift Draft payment status response', () => {
  it('returns only a reconciled status and lets provider-paid outrank stale stored failure', async () => {
    const response = await handleGiftPaymentStatus(statusRequest(), {
      authorizeStatus: async () => ({ allowed: true }),
      environment: environment(),
      findPaymentStatus: async () => 'failed',
      retrieveSession: async () => checkoutSession(),
    })

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({ paymentStatus: 'paid' })
    expect(JSON.stringify(body)).not.toContain('email')
    expect(JSON.stringify(body)).not.toContain('note')
  })

  it('keeps a webhook-confirmed refund authoritative over the provider paid flag', async () => {
    const response = await handleGiftPaymentStatus(statusRequest(), {
      authorizeStatus: async () => ({ allowed: true }),
      environment: environment(),
      findPaymentStatus: async () => 'partially_refunded',
      retrieveSession: async () => checkoutSession(),
    })

    await expect(response.json()).resolves.toEqual({ paymentStatus: 'partially_refunded' })
  })

  it('lets a provider-expired Session outrank a stale stored pending state', async () => {
    const response = await handleGiftPaymentStatus(statusRequest(), {
      authorizeStatus: async () => ({ allowed: true }),
      environment: environment(),
      findPaymentStatus: async () => 'pending',
      retrieveSession: async () =>
        checkoutSession({ payment_intent: null, payment_status: 'unpaid', status: 'expired' }),
    })

    await expect(response.json()).resolves.toEqual({ paymentStatus: 'expired' })
  })

  it('rate-limits a syntactically valid random Session ID before Stripe retrieval', async () => {
    const retrieveSession = vi.fn(async () => checkoutSession())
    const response = await handleGiftPaymentStatus(statusRequest(), {
      authorizeStatus: async () => ({ allowed: false, reason: 'ip' }),
      environment: environment(),
      retrieveSession,
    })

    expect(response.status).toBe(429)
    expect(retrieveSession).not.toHaveBeenCalled()
  })

  it('fails closed when stored refund reconciliation is unavailable', async () => {
    const response = await handleGiftPaymentStatus(statusRequest(), {
      authorizeStatus: async () => ({ allowed: true }),
      environment: environment(),
      findPaymentStatus: async () => {
        throw new Error('database unavailable')
      },
      retrieveSession: async () => checkoutSession(),
    })

    expect(response.status).toBe(503)
  })

  it('rejects cross-origin and malformed checkout references before any provider call', async () => {
    const authorizeStatus = vi.fn(async () => ({ allowed: true as const }))
    const retrieveSession = vi.fn(async () => checkoutSession())
    const crossOrigin = await handleGiftPaymentStatus(
      new Request(
        `https://saberistic-web.example/api/gifts/payment-status?session_id=${sessionId}`,
        {
          headers: {
            'CF-Connecting-IP': '198.51.100.27',
            Origin: 'https://attacker.example',
          },
        },
      ),
      { authorizeStatus, environment: environment(), retrieveSession },
    )
    const malformed = await handleGiftPaymentStatus(
      new Request(
        'https://saberistic-web.example/api/gifts/payment-status?session_id=not-a-session',
        { headers: { 'CF-Connecting-IP': '198.51.100.27' } },
      ),
      { authorizeStatus, environment: environment(), retrieveSession },
    )

    expect(crossOrigin.status).toBe(403)
    expect(malformed.status).toBe(400)
    expect(authorizeStatus).not.toHaveBeenCalled()
    expect(retrieveSession).not.toHaveBeenCalled()
  })

  it('does not disclose payment status for a Session with forged metadata', async () => {
    const session = checkoutSession()
    const forged = checkoutSession({
      metadata: { ...session.metadata, gift_amount_cents: '1000' },
    })
    const findPaymentStatus = vi.fn(async () => 'paid' as const)
    const response = await handleGiftPaymentStatus(statusRequest(), {
      authorizeStatus: async () => ({ allowed: true }),
      environment: environment(),
      findPaymentStatus,
      retrieveSession: async () => forged,
    })

    expect(response.status).toBe(404)
    expect(findPaymentStatus).not.toHaveBeenCalled()
  })
})
