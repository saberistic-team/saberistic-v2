import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { handleGiftIdeas, handleGiftIdeasStatus } from '@/lib/gifts/server/ideas-handler'
import type { GiftInventoryDatabase, GiftInventoryItem } from '@/lib/gifts/server/inventory'
import { verifyGiftQuoteToken } from '@/lib/gifts/server/quote-token'

const nowMs = 1_800_000_000_000

const validRequest = {
  anonymousToken: 'anonymous_token_1234567890',
  budget: 'under_30',
  theme: 'build_fuel',
  variationSeed: 'variation_seed_1234567890',
} as const

function environment(overrides: Partial<NodeJS.ProcessEnv> = {}): NodeJS.ProcessEnv {
  return {
    DATABASE_URL: 'postgresql://gift_inventory_test:secret@database.example:5432/gifts',
    GIFTING_AI_ENABLED: '1',
    GIFTING_CHECKOUT_ENABLED: '1',
    GIFT_QUOTE_SECRET: 'q'.repeat(40),
    NODE_ENV: 'test',
    PUBLIC_SITE_URL: 'https://saberistic.com',
    STRIPE_GIFT_WEBHOOK_SECRET: `whsec_${'w'.repeat(32)}`,
    STRIPE_RESTRICTED_KEY: `rk_test_${'r'.repeat(32)}`,
    ...overrides,
  }
}

function request(method = 'POST', origin = 'https://saberistic.com'): Request {
  return new Request('https://backend.example/api/gifts/ideas', {
    ...(method === 'POST'
      ? {
          body: JSON.stringify(validRequest),
          headers: {
            'Content-Type': 'application/json',
            Origin: origin,
          },
        }
      : { headers: { Origin: origin } }),
    method,
  })
}

function database(): GiftInventoryDatabase {
  return {
    connect: vi.fn(),
    end: vi.fn().mockResolvedValue(undefined),
    query: vi.fn(),
  } as unknown as GiftInventoryDatabase
}

const cachedProducts = [
  ['Raspberry Pi Debug Probe', 'Debugging tool', 1_200, 'Adafruit', '5699'],
  ['NeoKey 5x6 Ortho Snap-Apart', 'Input tool', 1_495, 'Adafruit', '5157'],
  ['Miniware TS101 Smart Soldering Iron', 'Bench tool', 2_995, 'Adafruit', '5645'],
  ['USB C Power Meter', 'Measurement tool', 2_495, 'Adafruit', '4232'],
  ['iFixit Essential Electronics Toolkit', 'Repair tool', 2_995, 'iFixit', 'IF145-348'],
  [
    'Pinecil Portable Mini Soldering Iron',
    'Bench tool',
    2_599,
    'PINE64',
    'pinecil-smart-mini-portable-soldering-iron',
  ],
  ['Engineer SS-02 Solder Sucker', 'Repair tool', 2_480, 'SparkFun', 'tools-19279'],
  ['Hakko CHP 3-SA Precision Tweezers', 'Precision tool', 1_195, 'DigiKey', '243-1185-ND'],
  ['Knipex Electronics Super Knips', 'Cutting tool', 2_786, 'Mouser', '12-786-125'],
] as const

function inventoryItems(): GiftInventoryItem[] {
  const checkedAt = '2026-08-31T12:00:00.000Z'
  return cachedProducts.map(([name, category, observedPriceCents, retailer, slug], index) => {
    const id = `cached_product_${String(index + 1).padStart(2, '0')}`
    const retailerHost =
      retailer === 'iFixit'
        ? 'www.ifixit.com'
        : retailer === 'PINE64'
          ? 'pine64.com'
          : retailer === 'SparkFun'
            ? 'www.sparkfun.com'
            : retailer === 'DigiKey'
              ? 'www.digikey.com'
              : retailer === 'Mouser'
                ? 'www.mouser.com'
                : 'www.adafruit.com'
    const sourceUrl = `https://${retailerHost}/products/${slug}`

    return {
      artworkUrl: `/api/gifts/artwork/${id}`,
      category,
      checkedAt,
      contributionAmountCents: observedPriceCents,
      createdAt: '2026-08-30T12:00:00.000Z',
      currency: 'usd',
      id,
      name,
      observedPriceCents,
      originalImageUrl: `https://images.example.test/cached/${id}.webp`,
      productDescription: `Retailer description cached for ${name}.`,
      retailer,
      sourceUrl,
      status: 'available',
      themes: ['build_fuel'],
      validationStatus: 'valid',
      whyItFits: `A useful real-world maker tool selected from ${retailer}'s current catalog.`,
    }
  })
}

function successfulDependencies(items: GiftInventoryItem[] = inventoryItems()) {
  const inventoryDatabase = database()
  const release = vi.fn().mockResolvedValue(undefined)
  const deal = vi.fn().mockResolvedValue(items)
  const enqueueReplenish = vi.fn().mockResolvedValue(3)
  const enqueueRevalidation = vi.fn().mockResolvedValue(2)
  const scheduledTasks: Array<() => Promise<void>> = []
  const scheduleMaintenance = vi.fn((task: () => Promise<void>) => {
    scheduledTasks.push(task)
  })

  return {
    database: inventoryDatabase,
    deal,
    enqueueReplenish,
    enqueueRevalidation,
    release,
    scheduledTasks,
    dependencies: {
      authorize: vi.fn().mockResolvedValue({ allowed: true, release }),
      database: inventoryDatabase,
      deal,
      enqueueReplenish,
      enqueueRevalidation,
      environment: environment(),
      now: () => nowMs,
      randomUUID: vi
        .fn()
        .mockReturnValueOnce('00000000-0000-4000-8000-000000000001')
        .mockReturnValueOnce('00000000-0000-4000-8000-000000000002'),
      scheduleMaintenance,
    },
  }
}

describe('Gift Draft cached ideas handler', () => {
  it('reports inventory readiness without requiring live OpenRouter configuration', async () => {
    const configured = environment()
    expect(configured.OPENROUTER_API_KEY).toBeUndefined()
    expect(configured.OPENROUTER_GIFT_PRIMARY_MODEL).toBeUndefined()
    expect(configured.OPENROUTER_GIFT_FALLBACK_MODEL).toBeUndefined()

    const enabledResponse = await handleGiftIdeasStatus(request('GET'), {
      database: database(),
      environment: configured,
      readiness: vi.fn().mockResolvedValue(true),
    })
    const enabled = await enabledResponse.json()
    expect(enabled).toEqual({
      checkoutEnabled: true,
      ideasEnabled: true,
      inventoryStatus: 'ready',
    })

    const restockingResponse = await handleGiftIdeasStatus(request('GET'), {
      database: database(),
      environment: configured,
      readiness: vi.fn().mockResolvedValue(false),
    })
    await expect(restockingResponse.json()).resolves.toEqual({
      checkoutEnabled: true,
      ideasEnabled: false,
      inventoryStatus: 'restocking',
    })

    const response = await handleGiftIdeasStatus(request('GET'), {
      environment: environment({
        DATABASE_URL: '',
        GIFTING_AI_ENABLED: '0',
        GIFTING_CHECKOUT_ENABLED: '0',
      }),
    })

    await expect(response.json()).resolves.toEqual({
      checkoutEnabled: false,
      ideasEnabled: false,
      inventoryStatus: 'paused',
    })
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('access-control-allow-origin')).toBe('https://saberistic.com')
  })

  it('accepts a same-origin status GET when the browser omits Origin', async () => {
    const response = await handleGiftIdeasStatus(
      new Request('https://backend.example/api/gifts/ideas', { method: 'GET' }),
      { database: database(), environment: environment(), readiness: async () => true },
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      checkoutEnabled: true,
      ideasEnabled: true,
      inventoryStatus: 'ready',
    })
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('rejects an untrusted explicit Origin on status and draw endpoints', async () => {
    const statusResponse = await handleGiftIdeasStatus(request('GET', 'https://attacker.example'), {
      environment: environment(),
    })
    expect(statusResponse.status).toBe(403)
    await expect(statusResponse.json()).resolves.toEqual({
      error: 'Request origin is not allowed.',
    })
    expect(statusResponse.headers.get('access-control-allow-origin')).toBeNull()

    const deal = vi.fn()
    const authorize = vi.fn()
    const drawResponse = await handleGiftIdeas(request('POST', 'https://attacker.example'), {
      authorize,
      database: database(),
      deal,
      environment: environment(),
    })
    expect(drawResponse.status).toBe(403)
    await expect(drawResponse.json()).resolves.toEqual({ error: 'Request origin is not allowed.' })
    expect(authorize).not.toHaveBeenCalled()
    expect(deal).not.toHaveBeenCalled()
  })

  it('fails before rate limiting or inventory access when cached inventory is disabled', async () => {
    const authorize = vi.fn()
    const deal = vi.fn()

    const response = await handleGiftIdeas(request(), {
      authorize,
      database: database(),
      deal,
      environment: environment({ DATABASE_URL: '', GIFTING_AI_ENABLED: '0' }),
    })

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      error: 'The cached gift inventory is not configured yet. Try again later.',
    })
    expect(authorize).not.toHaveBeenCalled()
    expect(deal).not.toHaveBeenCalled()
  })

  it('maps a real limiter rejection without reading inventory or queueing work', async () => {
    const deal = vi.fn()
    const enqueueReplenish = vi.fn()
    const enqueueRevalidation = vi.fn()
    const response = await handleGiftIdeas(request(), {
      authorize: vi.fn().mockResolvedValue({ allowed: false, reason: 'token' }),
      database: database(),
      deal,
      enqueueReplenish,
      enqueueRevalidation,
      environment: environment(),
    })

    expect(response.status).toBe(429)
    await expect(response.json()).resolves.toEqual({
      error: 'That is enough rapid-fire draws for now. Try again later.',
    })
    expect(deal).not.toHaveBeenCalled()
    expect(enqueueReplenish).not.toHaveBeenCalled()
    expect(enqueueRevalidation).not.toHaveBeenCalled()
  })

  it('deals nine cached real products, signs their durable IDs, and queues maintenance', async () => {
    const items = inventoryItems()
    const setup = successfulDependencies(items)
    const log = vi.fn()

    const response = await handleGiftIdeas(request(), { ...setup.dependencies, log })

    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      disclaimer: string
      ideas: Array<Record<string, unknown> & { quoteToken: string }>
      runId: string
      searchedAt: string
    }
    expect(body).toMatchObject({
      disclaimer: expect.stringContaining('cached references that may change'),
      runId: '00000000-0000-4000-8000-000000000002',
      searchedAt: new Date(nowMs).toISOString(),
    })
    expect(Object.keys(body).sort()).toEqual(['disclaimer', 'ideas', 'runId', 'searchedAt'])
    expect(body.ideas).toHaveLength(9)

    body.ideas.forEach((idea, index) => {
      const item = items[index]
      expect(idea).toEqual({
        artworkUrl: item.artworkUrl,
        category: item.category,
        checkedAt: item.checkedAt,
        currency: item.currency,
        id: item.id,
        name: item.name,
        observedPriceCents: item.observedPriceCents,
        productDescription: item.productDescription,
        quoteToken: expect.stringMatching(/^gq1\./),
        retailer: item.retailer,
        sourceUrl: item.sourceUrl,
        whyItFits: item.whyItFits,
      })

      expect(verifyGiftQuoteToken(idea.quoteToken, environment(), nowMs)).toEqual(
        expect.objectContaining({
          amountCents: item.observedPriceCents,
          offerId: item.id,
          runId: body.runId,
          sourceUrl: item.sourceUrl,
        }),
      )
    })

    expect(setup.deal).toHaveBeenCalledWith(setup.database, {
      budget: 'under_30',
      limit: 9,
      seed: `${validRequest.variationSeed}:${body.runId}`,
      theme: 'build_fuel',
    })
    expect(setup.enqueueReplenish).not.toHaveBeenCalled()
    expect(setup.enqueueRevalidation).not.toHaveBeenCalled()
    expect(setup.scheduledTasks).toHaveLength(1)
    await setup.scheduledTasks[0]()
    expect(setup.enqueueReplenish).toHaveBeenCalledOnce()
    expect(setup.enqueueReplenish).toHaveBeenCalledWith(
      { budget: 'under_30', theme: 'build_fuel' },
      setup.database,
    )
    expect(setup.enqueueRevalidation).toHaveBeenCalledOnce()
    expect(setup.enqueueRevalidation).toHaveBeenCalledWith(setup.database)
    expect(setup.release).toHaveBeenCalledOnce()
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        budget: 'under_30',
        inventoryCandidates: 9,
        outcome: 'completed',
        theme: 'build_fuel',
      }),
    )
    expect(JSON.stringify(log.mock.calls)).not.toContain('Raspberry Pi Debug Probe')
    expect(JSON.stringify(log.mock.calls)).not.toContain(validRequest.anonymousToken)
  })

  it('returns restocking when fewer than nine products are available but still queues maintenance', async () => {
    const setup = successfulDependencies(inventoryItems().slice(0, 8))

    const response = await handleGiftIdeas(request(), setup.dependencies)

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      error: 'That product lane is restocking. Try another range or theme shortly.',
    })
    expect(setup.enqueueReplenish).not.toHaveBeenCalled()
    expect(setup.enqueueRevalidation).not.toHaveBeenCalled()
    expect(setup.scheduledTasks).toHaveLength(1)
    await setup.scheduledTasks[0]()
    expect(setup.enqueueReplenish).toHaveBeenCalledWith(
      { budget: 'under_30', theme: 'build_fuel' },
      setup.database,
    )
    expect(setup.enqueueRevalidation).toHaveBeenCalledWith(setup.database)
    expect(setup.release).toHaveBeenCalledOnce()
  })

  it('returns a bounded inventory error and releases the permit when the database fails', async () => {
    const release = vi.fn().mockResolvedValue(undefined)
    const enqueueReplenish = vi.fn()
    const enqueueRevalidation = vi.fn()
    const response = await handleGiftIdeas(request(), {
      authorize: vi.fn().mockResolvedValue({ allowed: true, release }),
      database: database(),
      deal: vi.fn().mockRejectedValue(new Error('private database details')),
      enqueueReplenish,
      enqueueRevalidation,
      environment: environment(),
    })

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      error: 'The cached product inventory is temporarily unavailable. Try again shortly.',
    })
    expect(enqueueReplenish).not.toHaveBeenCalled()
    expect(enqueueRevalidation).not.toHaveBeenCalled()
    expect(release).toHaveBeenCalledOnce()
  })
})
