import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import type { GiftQuoteClaim } from '@/lib/gifts'
import { handleGiftCheckout } from '@/lib/gifts/server/checkout-handler'
import type { GiftInventoryDatabase, GiftInventoryItem } from '@/lib/gifts/server/inventory'
import { createGiftQuoteToken } from '@/lib/gifts/server/quote-token'
import {
  buildGiftCheckoutParams,
  GiftCheckoutProviderError,
  giftCheckoutIdentifiers,
  giftCheckoutLifetimeSeconds,
  giftCheckoutProviderErrorCertainty,
} from '@/lib/gifts/server/stripe'

const nowMs = 1_800_000_000_000
const publicOrigin = 'https://saberistic.com'
const backendOrigin = 'https://saberistic-web.example'
const quoteSecret = 'test-gift-quote-secret-that-is-at-least-32-characters'
const inventoryReservationId = `gift-reservation-${'a'.repeat(64)}`
const inventoryDatabase = {} as GiftInventoryDatabase

const quoteInput: Omit<GiftQuoteClaim, 'expiresAt' | 'issuedAt' | 'version'> = {
  amountCents: 12_345,
  category: 'Desk life',
  currency: 'usd',
  itemName: 'Machined aluminum desk organizer',
  offerId: 'offer_12345678',
  retailer: 'Example Maker',
  runId: 'run_1234567890123456',
  sourceUrl: 'https://maker.example/products/desk-organizer',
}

function environment(overrides: Partial<NodeJS.ProcessEnv> = {}): NodeJS.ProcessEnv {
  return {
    GIFTING_CHECKOUT_ENABLED: '1',
    GIFT_QUOTE_SECRET: quoteSecret,
    GIFT_QUOTE_TTL_SECONDS: '7200',
    NODE_ENV: 'production',
    PUBLIC_SITE_URL: publicOrigin,
    RENDER: 'true',
    RENDER_SERVICE_TYPE: 'web',
    SITE_URL: backendOrigin,
    STRIPE_GIFT_WEBHOOK_SECRET: 'whsec_giftdraft1234567890',
    STRIPE_RESTRICTED_KEY: 'rk_test_giftdraft1234567890',
    ...overrides,
  }
}

function requiredToken(issuedAt: number = nowMs): string {
  const token = createGiftQuoteToken(quoteInput, environment(), issuedAt)
  if (!token) throw new Error('Expected a signed checkout quote fixture.')
  return token
}

function reservedInventoryItem(): GiftInventoryItem {
  return {
    artworkUrl: '/api/gifts/artwork/offer_12345678',
    category: quoteInput.category,
    checkedAt: new Date(nowMs).toISOString(),
    contributionAmountCents: quoteInput.amountCents,
    createdAt: new Date(nowMs).toISOString(),
    currency: 'usd',
    id: quoteInput.offerId,
    name: quoteInput.itemName,
    observedPriceCents: quoteInput.amountCents,
    originalImageUrl: 'https://maker.example/images/desk-organizer.webp',
    productDescription: 'A durable machined aluminum desk organizer for a focused workspace.',
    retailer: quoteInput.retailer,
    sourceUrl: quoteInput.sourceUrl,
    status: 'reserved',
    themes: ['desk_life'],
    validationStatus: 'valid',
    whyItFits: 'A durable desk upgrade that keeps frequently used tools within reach.',
  }
}

function checkoutRequest(quoteToken: string, extra: Record<string, unknown> = {}): Request {
  return new Request(`${backendOrigin}/api/gifts/checkout`, {
    body: JSON.stringify({ quoteToken, ...extra }),
    headers: {
      'CF-Connecting-IP': '198.51.100.27',
      'Content-Type': 'application/json',
      Origin: publicOrigin,
    },
    method: 'POST',
  })
}

function tamper(token: string): string {
  const parts = token.split('.')
  const signature = parts[2] ?? ''
  parts[2] = `${signature[0] === 'A' ? 'B' : 'A'}${signature.slice(1)}`
  return parts.join('.')
}

describe('gift checkout handler', () => {
  it.each([
    ['tampered', () => tamper(requiredToken()), nowMs],
    ['expired', () => requiredToken(), nowMs + 7_201_000],
  ] as const)('rejects a %s quote before calling Stripe', async (_label, token, checkoutTime) => {
    const createCheckout = vi.fn(async () => ({
      checkoutUrl: 'https://checkout.stripe.com/c/pay_never',
      inventoryReservationId,
      sessionId: 'cs_test_1234567890abcdef',
    }))

    const response = await handleGiftCheckout(checkoutRequest(token()), {
      createCheckout,
      environment: environment(),
      now: () => checkoutTime,
    })

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      error: 'That gift price expired. Deal a fresh deck before checking out.',
    })
    expect(createCheckout).not.toHaveBeenCalled()
  })

  it('passes the signed listing amount and claim to the injected checkout boundary', async () => {
    const token = requiredToken()
    const expectedReservationId = giftCheckoutIdentifiers(token).inventoryReservationId
    const createCheckout = vi.fn(async () => ({
      checkoutUrl: 'https://checkout.stripe.com/c/pay_gift_draft',
      inventoryReservationId: expectedReservationId,
      sessionId: 'cs_test_1234567890abcdef',
    }))
    const reserveInventory = vi.fn(async () => reservedInventoryItem())
    const attachInventorySession = vi.fn(async () => true)

    const response = await handleGiftCheckout(checkoutRequest(token), {
      attachInventorySession,
      authorizeCheckout: async () => ({ allowed: true }),
      createCheckout,
      database: inventoryDatabase,
      environment: environment(),
      now: () => nowMs,
      reserveInventory,
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      checkoutUrl: 'https://checkout.stripe.com/c/pay_gift_draft',
    })
    expect(createCheckout).toHaveBeenCalledOnce()
    expect(createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        amountCents: quoteInput.amountCents,
        itemName: quoteInput.itemName,
        offerId: quoteInput.offerId,
        sourceUrl: quoteInput.sourceUrl,
      }),
      token,
      {
        apiKey: 'rk_test_giftdraft1234567890',
        publicSiteOrigin: publicOrigin,
        quoteSecret,
      },
      nowMs,
    )
    expect(reserveInventory).toHaveBeenCalledWith(
      inventoryDatabase,
      expect.objectContaining({
        offerId: quoteInput.offerId,
        reservationId: expectedReservationId,
      }),
    )
    expect(attachInventorySession).toHaveBeenCalledWith(inventoryDatabase, {
      offerId: quoteInput.offerId,
      reservationId: expectedReservationId,
      stripeCheckoutSessionId: 'cs_test_1234567890abcdef',
    })
    expect(reserveInventory.mock.invocationCallOrder[0]).toBeLessThan(
      createCheckout.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
    )
  })

  it('returns a conflict without calling Stripe when the product is already claimed', async () => {
    const token = requiredToken()
    const createCheckout = vi.fn()

    const response = await handleGiftCheckout(checkoutRequest(token), {
      authorizeCheckout: async () => ({ allowed: true }),
      createCheckout,
      database: inventoryDatabase,
      environment: environment(),
      now: () => nowMs,
      reserveInventory: async () => null,
    })

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      error: 'That gift was just claimed. Choose another product from a fresh deck.',
    })
    expect(createCheckout).not.toHaveBeenCalled()
  })

  it('releases a reservation after a definitive Stripe rejection', async () => {
    const token = requiredToken()
    const releaseInventoryAfterDefinitiveFailure = vi.fn(async () => true)

    const response = await handleGiftCheckout(checkoutRequest(token), {
      authorizeCheckout: async () => ({ allowed: true }),
      createCheckout: async () => {
        throw new GiftCheckoutProviderError('definitive')
      },
      database: inventoryDatabase,
      environment: environment(),
      now: () => nowMs,
      releaseInventoryAfterDefinitiveFailure,
      reserveInventory: async () => reservedInventoryItem(),
    })

    expect(response.status).toBe(502)
    expect(releaseInventoryAfterDefinitiveFailure).toHaveBeenCalledWith(inventoryDatabase, {
      offerId: quoteInput.offerId,
      reservationId: giftCheckoutIdentifiers(token).inventoryReservationId,
    })
  })

  it('keeps the reservation when Stripe creation has an ambiguous outcome', async () => {
    const releaseInventoryAfterDefinitiveFailure = vi.fn(async () => true)

    const response = await handleGiftCheckout(checkoutRequest(requiredToken()), {
      authorizeCheckout: async () => ({ allowed: true }),
      createCheckout: async () => {
        throw new GiftCheckoutProviderError('ambiguous')
      },
      database: inventoryDatabase,
      environment: environment(),
      now: () => nowMs,
      releaseInventoryAfterDefinitiveFailure,
      reserveInventory: async () => reservedInventoryItem(),
    })

    expect(response.status).toBe(502)
    await expect(response.json()).resolves.toEqual({
      error:
        'Stripe Checkout status could not be confirmed. Check for an existing confirmation before trying again.',
    })
    expect(releaseInventoryAfterDefinitiveFailure).not.toHaveBeenCalled()
  })

  it('treats an unexpected checkout failure as ambiguous and does not release inventory', async () => {
    const releaseInventoryAfterDefinitiveFailure = vi.fn(async () => true)

    const response = await handleGiftCheckout(checkoutRequest(requiredToken()), {
      authorizeCheckout: async () => ({ allowed: true }),
      createCheckout: async () => {
        throw new Error('unexpected checkout boundary failure')
      },
      database: inventoryDatabase,
      environment: environment(),
      now: () => nowMs,
      releaseInventoryAfterDefinitiveFailure,
      reserveInventory: async () => reservedInventoryItem(),
    })

    expect(response.status).toBe(502)
    await expect(response.json()).resolves.toEqual({
      error:
        'Stripe Checkout status could not be confirmed. Check for an existing confirmation before trying again.',
    })
    expect(releaseInventoryAfterDefinitiveFailure).not.toHaveBeenCalled()
  })

  it('rejects client-supplied checkout fields alongside the signed quote', async () => {
    const createCheckout = vi.fn(async () => ({
      checkoutUrl: 'https://checkout.stripe.com/c/pay_never',
      inventoryReservationId,
      sessionId: 'cs_test_1234567890abcdef',
    }))

    const response = await handleGiftCheckout(
      checkoutRequest(requiredToken(), { amountCents: 1_000 }),
      {
        createCheckout,
        environment: environment(),
        now: () => nowMs,
      },
    )

    expect(response.status).toBe(400)
    expect(createCheckout).not.toHaveBeenCalled()
  })

  it('rejects a quote when its stable Session expiry has only the minimum lead remaining', async () => {
    const createCheckout = vi.fn(async () => ({
      checkoutUrl: 'https://checkout.stripe.com/c/pay_never',
      inventoryReservationId,
      sessionId: 'cs_test_1234567890abcdef',
    }))
    const authorizeCheckout = vi.fn(async () => ({ allowed: true }) as const)

    const response = await handleGiftCheckout(checkoutRequest(requiredToken()), {
      authorizeCheckout,
      createCheckout,
      environment: environment(),
      now: () => nowMs + 30 * 60 * 1_000,
    })

    expect(response.status).toBe(409)
    expect(authorizeCheckout).not.toHaveBeenCalled()
    expect(createCheckout).not.toHaveBeenCalled()
  })

  it('fails closed when checkout admission throws', async () => {
    const createCheckout = vi.fn(async () => ({
      checkoutUrl: 'https://checkout.stripe.com/c/pay_never',
      inventoryReservationId,
      sessionId: 'cs_test_1234567890abcdef',
    }))
    const response = await handleGiftCheckout(checkoutRequest(requiredToken()), {
      authorizeCheckout: async () => {
        throw new Error('redis unavailable')
      },
      createCheckout,
      environment: environment(),
      now: () => nowMs,
    })

    expect(response.status).toBe(503)
    expect(createCheckout).not.toHaveBeenCalled()
  })
})

describe('Stripe gift checkout parameters', () => {
  it('only classifies explicit non-retryable Stripe rejections as definitive', () => {
    expect(
      giftCheckoutProviderErrorCertainty({
        statusCode: 400,
        type: 'StripeIdempotencyError',
      }),
    ).toBe('ambiguous')
    expect(
      giftCheckoutProviderErrorCertainty({ statusCode: 400, type: 'UnknownStripeError' }),
    ).toBe('ambiguous')
    expect(
      giftCheckoutProviderErrorCertainty({
        statusCode: 400,
        type: 'StripeInvalidRequestError',
      }),
    ).toBe('definitive')
  })

  it('derives stable Stripe idempotency and integration identifiers from the signed quote', () => {
    const first = giftCheckoutIdentifiers('signed-quote-one')
    expect(giftCheckoutIdentifiers('signed-quote-one')).toEqual(first)
    expect(giftCheckoutIdentifiers('signed-quote-two')).not.toEqual(first)
    expect(first.idempotencyKey).toMatch(/^gift-draft-[a-f0-9]{64}$/)
    expect(first.integrationIdentifier).toMatch(/^saberistic_gift_draft_[a-z]{8}$/)
    expect(first.inventoryReservationId).toMatch(/^gift-reservation-[a-f0-9]{64}$/)
  })

  it('uses the signed amount and current Checkout API conventions with clear disclosure', () => {
    const claim: GiftQuoteClaim = {
      ...quoteInput,
      expiresAt: Math.floor(nowMs / 1_000) + 7_200,
      issuedAt: Math.floor(nowMs / 1_000),
      version: 1,
    }

    const integrationIdentifier = giftCheckoutIdentifiers('test-quote-token').integrationIdentifier
    const params = buildGiftCheckoutParams(
      claim,
      publicOrigin,
      quoteSecret,
      integrationIdentifier,
      inventoryReservationId,
      nowMs,
    )
    const delayedRetry = buildGiftCheckoutParams(
      claim,
      publicOrigin,
      quoteSecret,
      integrationIdentifier,
      inventoryReservationId,
      nowMs + 15 * 60 * 1_000,
    )
    const lineItem = params.line_items?.[0]
    if (!lineItem || typeof lineItem === 'string') throw new Error('Expected inline price data.')

    expect(lineItem.price_data).toMatchObject({
      currency: 'usd',
      product_data: {
        description: expect.stringContaining('No retailer order is placed automatically'),
        name: `Gift Draft contribution — ${quoteInput.itemName}`,
      },
      unit_amount: quoteInput.amountCents,
    })
    expect(params).not.toHaveProperty('payment_method_types')
    expect(params).not.toHaveProperty('automatic_tax')
    expect(params.integration_identifier).toMatch(/^saberistic_gift_draft_[a-z]{8}$/)
    expect(params.origin_context).toBe('web')
    expect(params.mode).toBe('payment')
    expect(params.expires_at).toBe(claim.issuedAt + giftCheckoutLifetimeSeconds)
    expect(delayedRetry.expires_at).toBe(params.expires_at)
    expect(params.cancel_url).toBe(`${publicOrigin}/gifts/?checkout=canceled`)
    expect(params.success_url).toBe(
      `${publicOrigin}/gifts/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    )
    const submitText = params.custom_text?.submit
    const afterSubmitText = params.custom_text?.after_submit
    const submitMessage =
      submitText && typeof submitText === 'object' ? submitText.message : undefined
    const afterSubmitMessage =
      afterSubmitText && typeof afterSubmitText === 'object' ? afterSubmitText.message : undefined

    expect(submitMessage).toContain('The reference retailer does not receive this payment.')
    expect(afterSubmitMessage).toContain('AmirSaber handles the gift manually.')
    expect(params.metadata).toMatchObject({
      gift_amount_cents: String(quoteInput.amountCents),
      gift_category: quoteInput.category,
      gift_currency: quoteInput.currency,
      gift_draft_version: '1',
      gift_item_name: quoteInput.itemName,
      gift_inventory_reservation_id: inventoryReservationId,
      gift_offer_id: quoteInput.offerId,
      gift_run_id: quoteInput.runId,
      reference_retailer: quoteInput.retailer,
      reference_source: quoteInput.sourceUrl,
    })
    expect(params.metadata?.gift_metadata_signature).toMatch(/^[A-Za-z0-9_-]{43}$/)
  })
})
