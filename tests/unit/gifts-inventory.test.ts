import { createHash } from 'node:crypto'
import type { LookupFunction } from 'node:net'

import type { QueryResultRow } from 'pg'
import sharp from 'sharp'
import type { Dispatcher } from 'undici'
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { readinessPolicyVersion } from '@/lib/readiness/types'
import { giftProductRetailerName } from '@/lib/gifts/retailers'
import {
  attachGiftInventoryStripeSession,
  countAvailableGiftInventory,
  dealAvailableGiftItems,
  discoveryFingerprint,
  enqueueGiftInventoryReplenishment,
  getGiftInventoryArtwork,
  isGiftInventoryReady,
  releaseGiftInventoryAfterDefinitiveCheckoutFailure,
  reservationFingerprint,
  reserveGiftInventoryItem,
  transitionGiftInventoryFromPaymentStatus,
  type GiftInventoryDatabase,
} from '@/lib/gifts/server/inventory'
import {
  buildGiftInventoryResearchMessages,
  buildGiftInventorySynthesisMessages,
  claimGiftInventoryJob,
  createPinnedRemoteLookup,
  drainGiftInventoryJobs,
  discoveryTargetForJob,
  extractGiftResearchCitations,
  extractRetailerProductPage,
  failGiftInventoryJob,
  fetchRemote,
  giftProductNamesMateriallyMatch,
  GiftInventoryWorkerError,
  isPublicNetworkAddress,
  normalizeRetailerImage,
  parseGiftDiscoveryMetadata,
  readBoundedBytes,
  readGiftInventoryWorkerConfig,
  refreshGiftProduct,
  retailerProductMatchesMetadata,
  type GiftInventoryWorkerConfig,
  type GiftInventoryJob,
  type GiftInventoryJobLease,
} from '@/lib/gifts/server/inventory-worker'

function inventoryRow(overrides: Record<string, unknown> = {}) {
  return {
    cached_image_webp: Buffer.from('unused'),
    category: 'Desk tool',
    checked_at: new Date('2026-09-01T00:00:00.000Z'),
    created_at: new Date('2026-09-01T00:00:00.000Z'),
    currency: 'usd',
    id: 'gift-12345678',
    name: 'Real Product',
    observed_price_cents: 4_999,
    original_image_url: 'https://cdn.example.com/product.jpg',
    product_description: 'A canonical description extracted from the retailer product page.',
    retailer: 'MoMA Design Store',
    source_url: 'https://store.moma.org/products/real-product',
    status: 'available',
    theme_ids: ['desk_life'],
    validation_status: 'valid',
    why_it_fits: 'A useful physical object for a considered workspace and daily building.',
    ...overrides,
  }
}

function mockDatabase(
  handler: (
    text: string,
    values: readonly unknown[],
  ) => Promise<{ rowCount: number; rows: QueryResultRow[] }>,
) {
  const query = vi.fn((text: string, values: readonly unknown[] = []) => handler(text, values))
  const connectionQuery = vi.fn((text: string, values: readonly unknown[] = []) =>
    handler(text, values),
  )
  const release = vi.fn()
  const database = {
    connect: vi.fn(async () => ({ query: connectionQuery, release })),
    end: vi.fn(async () => undefined),
    query,
  } as unknown as GiftInventoryDatabase
  return { connectionQuery, database, query, release }
}

const workerConfig: GiftInventoryWorkerConfig = {
  apiKey: 'secret',
  databaseURL: 'postgres://example.test/inventory',
  jobTimeoutMilliseconds: 75_000,
  pollMilliseconds: 5_000,
  researchModel: 'openai/gpt-4.1-mini',
  synthesisModel: 'openai/gpt-4.1-mini',
  timeoutMilliseconds: 60_000,
}

function lookupAll(lookup: LookupFunction, hostname: string, family = 0) {
  return new Promise<Array<{ address: string; family: number }>>((resolve, reject) => {
    lookup(hostname, { all: true, family }, (error, addresses) => {
      if (error) {
        reject(error)
        return
      }
      if (!Array.isArray(addresses)) {
        reject(new Error('expected_all_lookup_addresses'))
        return
      }
      resolve(addresses)
    })
  })
}

function fakeDispatcher(destroy = vi.fn(async (): Promise<void> => undefined)): {
  destroy: typeof destroy
  dispatcher: Dispatcher
} {
  return { destroy, dispatcher: { destroy } as unknown as Dispatcher }
}

describe('gift inventory', () => {
  it('deals cached products by budget and prefers the requested theme without making it a gate', async () => {
    const { connectionQuery, database } = mockDatabase(async (text) => ({
      rowCount: text.startsWith('SELECT id,') ? 1 : 0,
      rows: text.startsWith('SELECT id,') ? [inventoryRow()] : [],
    }))

    const result = await dealAvailableGiftItems(database, {
      budget: '30_to_75',
      seed: 'stable-draw-seed',
      theme: 'desk_life',
    })

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      artworkUrl: '/api/gifts/artwork/gift-12345678',
      contributionAmountCents: 4_999,
      productDescription: expect.stringContaining('canonical description'),
      validationStatus: 'valid',
    })
    const select = connectionQuery.mock.calls.find(([text]) =>
      String(text).startsWith('SELECT id,'),
    )
    expect(select?.[0]).toContain('observed_price_cents BETWEEN $2 AND $3')
    expect(select?.[0]).toContain('CASE WHEN $4::text IS NULL OR $4 = ANY(theme_ids)')
    expect(select?.[0]).not.toContain('AND ($4::text IS NULL')
    expect(select?.[1]?.slice(1)).toEqual([3_000, 7_500, 'desk_life', 54])
  })

  it('deals distinct normalized product names even when duplicate rows rank first', async () => {
    const { database } = mockDatabase(async (text) => ({
      rowCount: text.startsWith('SELECT id,') ? 3 : 0,
      rows: text.startsWith('SELECT id,')
        ? [
            inventoryRow({ id: 'gift-12345678', name: 'Real Product' }),
            inventoryRow({ id: 'gift-22345678', name: 'REAL—PRODUCT' }),
            inventoryRow({ id: 'gift-32345678', name: 'Another Useful Object' }),
          ]
        : [],
    }))

    const result = await dealAvailableGiftItems(database, {
      budget: '30_to_75',
      limit: 2,
      seed: 'stable-draw-seed',
      theme: 'desk_life',
    })

    expect(result.map(({ id }) => id)).toEqual(['gift-12345678', 'gift-32345678'])
  })

  it('counts only distinct normalized product names for availability and readiness', async () => {
    const readinessRow = {
      high_count: 9,
      low_count: 9,
      lower_middle_count: 9,
      upper_middle_count: 9,
    }
    const { connectionQuery, database, query } = mockDatabase(async (text) => {
      if (text.includes('AS low_count')) return { rowCount: 1, rows: [readinessRow] }
      if (text.includes('count(DISTINCT normalized_name)')) {
        return { rowCount: 1, rows: [{ count: 9 }] }
      }
      return { rowCount: 0, rows: [] }
    })

    await expect(countAvailableGiftInventory(database)).resolves.toBe(9)
    await expect(isGiftInventoryReady(database)).resolves.toBe(true)

    expect(
      connectionQuery.mock.calls.some(([text]) =>
        String(text).includes('count(DISTINCT normalized_name)::integer AS count'),
      ),
    ).toBe(true)
    const readiness = query.mock.calls.find(([text]) => String(text).includes('AS low_count'))
    expect(readiness?.[0]).toMatch(/count\(DISTINCT normalized_name\) FILTER/g)
  })

  it('deduplicates source fingerprints after removing tracking parameters', () => {
    const canonical = 'https://adafruit.com/products/123?variant=red'
    expect(
      discoveryFingerprint(
        'https://www.adafruit.com/products/123?utm_source=newsletter&variant=red#details',
      ),
    ).toBe(discoveryFingerprint(`${canonical}&fbclid=tracking`))
    expect(discoveryFingerprint(`${canonical}&variant=blue`)).not.toBe(
      discoveryFingerprint(canonical),
    )
  })

  it('reserves atomically with hashed ownership and immutable signed fields', async () => {
    const { database, query } = mockDatabase(async (text) => ({
      rowCount: text.startsWith('UPDATE gift_inventory') ? 1 : 0,
      rows: text.startsWith('UPDATE gift_inventory') ? [inventoryRow({ status: 'reserved' })] : [],
    }))
    const reservationId = 'reservation_1234567890abcdef'

    const reserved = await reserveGiftInventoryItem(database, {
      expected: {
        category: 'Desk tool',
        currency: 'usd',
        name: 'Real Product',
        observedPriceCents: 4_999,
        retailer: 'MoMA Design Store',
        sourceUrl: 'https://store.moma.org/products/real-product',
      },
      offerId: 'gift-12345678',
      reservationId,
      ttlSeconds: 7_200,
    })

    expect(reserved?.status).toBe('reserved')
    expect(query.mock.calls[0][0]).toContain('name = $4 AND category = $5')
    expect(query.mock.calls[0][0]).toContain('stripe_checkout_session_id IS NULL')
    expect(query.mock.calls[0][1]).toContain(reservationFingerprint(reservationId))
    expect(query.mock.calls[0][1]).not.toContain(reservationId)
  })

  it('attaches Stripe idempotently and keeps pending async payments reserved', async () => {
    const { database, query } = mockDatabase(async () => ({ rowCount: 1, rows: [] }))
    const ownership = { offerId: 'gift-12345678', reservationId: 'reservation_1234567890abcdef' }

    await expect(
      attachGiftInventoryStripeSession(database, {
        ...ownership,
        stripeCheckoutSessionId: 'cs_test_1234567890abcdef',
      }),
    ).resolves.toBe(true)
    await expect(
      transitionGiftInventoryFromPaymentStatus(database, {
        ...ownership,
        paymentStatus: 'pending',
      }),
    ).resolves.toBe('reserved')

    expect(query.mock.calls[0][0]).toContain('stripe_checkout_session_id = $3')
    expect(query.mock.calls[1][0]).toContain('GREATEST')
  })

  it('never releases checkout-failure inventory after a Stripe Session is attached', async () => {
    const { database, query } = mockDatabase(async (text) => ({
      rowCount: text.includes('stripe_checkout_session_id IS NULL') ? 0 : 1,
      rows: [],
    }))

    await expect(
      releaseGiftInventoryAfterDefinitiveCheckoutFailure(database, {
        offerId: 'gift-12345678',
        reservationId: 'reservation_1234567890abcdef',
      }),
    ).resolves.toBe(false)

    expect(query.mock.calls[0][0]).toContain("status = 'reserved'")
    expect(query.mock.calls[0][0]).toContain('reservation_key = $2')
    expect(query.mock.calls[0][0]).toContain('stripe_checkout_session_id IS NULL')
  })

  it('retires paid gifts and releases failed gifts with exact reservation ownership', async () => {
    const { database, query } = mockDatabase(async () => ({ rowCount: 1, rows: [] }))
    const ownership = { offerId: 'gift-12345678', reservationId: 'reservation_1234567890abcdef' }

    await expect(
      transitionGiftInventoryFromPaymentStatus(database, { ...ownership, paymentStatus: 'paid' }),
    ).resolves.toBe('sold')
    await expect(
      transitionGiftInventoryFromPaymentStatus(database, { ...ownership, paymentStatus: 'failed' }),
    ).resolves.toBe('released')

    expect(query.mock.calls[0][0]).toContain("status IN ('reserved', 'sold')")
    expect(query.mock.calls[1][0]).toContain("status = 'reserved'")
  })

  it('queues targeted discovery jobs while respecting the global cap', async () => {
    let countQuery = 0
    let id = 0
    const { connectionQuery, database } = mockDatabase(async (text, values) => {
      if (text.includes('SELECT count(')) {
        countQuery += 1
        return { rowCount: 1, rows: [{ count: 0 }] }
      }
      return {
        rowCount: text.includes('INSERT INTO gift_inventory_jobs')
          ? ((values[0] as string[] | undefined)?.length ?? 0)
          : 0,
        rows: [],
      }
    })

    await expect(
      enqueueGiftInventoryReplenishment(database, {
        budget: 'under_30',
        maximumAvailable: 9,
        minimumAvailable: 9,
        randomId: () => `00000000-0000-4000-8000-${String(++id).padStart(12, '0')}`,
        theme: 'desk_life',
      }),
    ).resolves.toBe(9)

    expect(countQuery).toBe(4)
    const inventoryCounts = connectionQuery.mock.calls.filter(([text]) =>
      String(text).includes('FROM gift_inventory\n'),
    )
    expect(inventoryCounts).toHaveLength(2)
    expect(
      inventoryCounts.every(([text]) => String(text).includes('DISTINCT normalized_name')),
    ).toBe(true)
    const inserts = connectionQuery.mock.calls.filter(([text]) =>
      String(text).includes('INSERT INTO gift_inventory_jobs'),
    )
    expect(inserts).toHaveLength(1)
    expect(inserts[0][1]?.[0]).toHaveLength(9)
    expect(inserts[0][1]?.slice(1)).toEqual(['under_30', 'desk_life'])
  })

  it('serves only bounded WebP whose stored hash matches its bytes', async () => {
    const bytes = Buffer.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])
    const sha256 = createHash('sha256').update(bytes).digest('hex')
    const { database } = mockDatabase(async () => ({
      rowCount: 1,
      rows: [{ cached_image_sha256: sha256, cached_image_webp: bytes }],
    }))

    await expect(getGiftInventoryArtwork(database, 'gift-12345678')).resolves.toEqual({
      bytes: new Uint8Array(bytes),
      sha256,
    })
  })
})

describe('gift inventory worker boundaries', () => {
  it('invalidates a retained product when revalidation changes its normalized name to a conflict', async () => {
    const uniqueConflict = Object.assign(new Error('duplicate key'), {
      code: '23505',
      constraint: 'gift_inventory_normalized_name_idx',
    })
    const { connectionQuery, database } = mockDatabase(async (text) => {
      if (text.includes('SET name = $2, normalized_name = $3')) throw uniqueConflict
      return { rowCount: 1, rows: [] }
    })

    await expect(
      refreshGiftProduct(
        database,
        'gift-12345678',
        {
          availability: 'available',
          description: 'A canonical description extracted from the retailer product page.',
          imageUrl: 'https://store.moma.org/cdn/real-product.jpg',
          name: 'REAL—PRODUCT',
          observedPriceCents: 4_999,
          sourceUrl: 'https://store.moma.org/products/real-product',
        },
        {
          bytes: Buffer.from('cached-webp'),
          mime: 'image/webp',
          sha256: 'a'.repeat(64),
        },
      ),
    ).resolves.toBe(false)

    const refresh = connectionQuery.mock.calls.find(([text]) =>
      String(text).includes('SET name = $2, normalized_name = $3'),
    )
    const invalidation = connectionQuery.mock.calls.find(([text]) =>
      String(text).includes("validation_status = 'invalid'"),
    )
    expect(refresh?.[1]?.[2]).toBe('real product')
    expect(invalidation?.[1]).toEqual(['gift-12345678', 'retailer_product_name_conflict'])
  })

  it('requires the feature gate, exact policy version, and pinned worker models', () => {
    expect(() =>
      readGiftInventoryWorkerConfig({
        DATABASE_URL: 'postgres://example.test/inventory',
        GIFTING_AI_ENABLED: '1',
        NODE_ENV: 'test',
        OPENROUTER_ACCOUNT_GATES_CONFIRMED: '1',
        OPENROUTER_API_KEY: 'secret',
        OPENROUTER_GIFT_PRIMARY_MODEL: 'openai/gpt-4.1-mini',
      }),
    ).toThrow('worker_account_gate_unconfirmed')
    expect(() =>
      readGiftInventoryWorkerConfig({
        DATABASE_URL: 'postgres://example.test/inventory',
        GIFTING_AI_ENABLED: '0',
        NODE_ENV: 'test',
        OPENROUTER_ACCOUNT_GATES_CONFIRMED: readinessPolicyVersion,
        OPENROUTER_API_KEY: 'secret',
        OPENROUTER_GIFT_PRIMARY_MODEL: 'openai/gpt-4.1-mini',
      }),
    ).toThrow('worker_config_missing')
    expect(() =>
      readGiftInventoryWorkerConfig({
        DATABASE_URL: 'postgres://example.test/inventory',
        GIFTING_AI_ENABLED: '1',
        NODE_ENV: 'test',
        OPENROUTER_ACCOUNT_GATES_CONFIRMED: readinessPolicyVersion,
        OPENROUTER_API_KEY: 'secret',
        OPENROUTER_GIFT_PRIMARY_MODEL: 'openrouter/auto',
      }),
    ).toThrow('worker_model_invalid')
    expect(
      readGiftInventoryWorkerConfig({
        DATABASE_URL: 'postgres://example.test/inventory',
        GIFTING_AI_ENABLED: '1',
        NODE_ENV: 'test',
        OPENROUTER_ACCOUNT_GATES_CONFIRMED: readinessPolicyVersion,
        OPENROUTER_API_KEY: 'secret',
        OPENROUTER_GIFT_PRIMARY_MODEL: 'openai/gpt-4.1-mini',
      }),
    ).toMatchObject({ jobTimeoutMilliseconds: 75_000, researchModel: 'openai/gpt-4.1-mini' })
  })

  it('augments annotations with approved retailer URLs found in bounded research text', () => {
    expect(
      extractGiftResearchCitations({
        annotations: [
          {
            type: 'url_citation',
            url_citation: {
              title: 'Annotated product',
              url: 'https://store.moma.org/products/annotated-product?utm_source=search',
            },
          },
        ],
        content:
          'Also inspect https://www.adafruit.com/product/123?utm_campaign=research. Ignore https://attacker.example/product/1.',
      }),
    ).toEqual([
      {
        title: 'Annotated product',
        url: 'https://store.moma.org/products/annotated-product',
      },
      { title: 'www.adafruit.com', url: 'https://www.adafruit.com/product/123' },
    ])
  })

  it('puts only the curated public recipient and selected theme into both model phases', () => {
    const job: GiftInventoryJob = {
      attempts: 1,
      budget: 'under_30',
      id: '1',
      jobKey: 'gift-discover-private-internal-job-key',
      kind: 'discover',
      maxAttempts: 4,
      productId: null,
      theme: 'books_ideas',
    }
    const messages = [
      ...buildGiftInventoryResearchMessages(job),
      ...buildGiftInventorySynthesisMessages(job, {
        citations: [{ title: 'Product', url: 'https://store.moma.org/products/product' }],
        notes: 'Bounded research notes.',
      }),
    ]
    const userPayloads = messages
      .filter(({ role }) => role === 'user')
      .map(({ content }) => JSON.parse(content) as Record<string, unknown>)

    expect(userPayloads).toHaveLength(2)
    for (const payload of userPayloads) {
      expect(payload.recipient).toMatchObject({
        name: 'AmirSaber Sharifi',
        shortName: 'AmirSaber',
      })
      expect(payload.theme).toEqual({
        description: 'Books, references, and new lines of thought.',
        id: 'books_ideas',
        label: 'Books & ideas',
      })
    }
    const serialized = JSON.stringify(messages)
    expect(serialized).not.toContain(job.jobKey)
    expect(serialized).not.toMatch(/anonymousToken|email|visitor/i)
  })

  it('blocks private, loopback, link-local, and documentation network addresses', () => {
    expect(isPublicNetworkAddress('8.8.8.8')).toBe(true)
    expect(isPublicNetworkAddress('10.0.0.2')).toBe(false)
    expect(isPublicNetworkAddress('127.0.0.1')).toBe(false)
    expect(isPublicNetworkAddress('169.254.169.254')).toBe(false)
    expect(isPublicNetworkAddress('192.0.2.1')).toBe(false)
    expect(isPublicNetworkAddress('2606:4700:4700::1111')).toBe(true)
    expect(isPublicNetworkAddress('2001:db8::1')).toBe(false)
    expect(isPublicNetworkAddress('::1')).toBe(false)
    expect(isPublicNetworkAddress('0:0:0:0:0:0:0:1')).toBe(false)
    expect(isPublicNetworkAddress('0:0:0:0:0:ffff:127.0.0.1')).toBe(false)
    expect(isPublicNetworkAddress('64:ff9b::7f00:1')).toBe(false)
    expect(isPublicNetworkAddress('fec0::1')).toBe(false)
    expect(isPublicNetworkAddress('2002:7f00:1::')).toBe(false)
    expect(isPublicNetworkAddress('2606:4700:4700::1111%en0')).toBe(false)
  })

  it('serves only the validated public addresses from a pinned lookup without re-resolving', async () => {
    const lookup = createPinnedRemoteLookup('media.retailer.example', [
      { address: '8.8.8.8', family: 4 },
      { address: '2606:4700:4700::1111', family: 6 },
    ])

    await expect(lookupAll(lookup, 'media.retailer.example')).resolves.toEqual([
      { address: '8.8.8.8', family: 4 },
      { address: '2606:4700:4700::1111', family: 6 },
    ])
    await expect(lookupAll(lookup, 'media.retailer.example', 4)).resolves.toEqual([
      { address: '8.8.8.8', family: 4 },
    ])
    await expect(lookupAll(lookup, 'rebound.retailer.example')).rejects.toMatchObject({
      code: 'ENOTFOUND',
    })
    expect(() =>
      createPinnedRemoteLookup('media.retailer.example', [
        { address: '169.254.169.254', family: 4 },
      ]),
    ).toThrow('remote_address_blocked')
  })

  it('validates and pins every redirect hop before the injected fetch uses its dispatcher', async () => {
    const first = fakeDispatcher()
    const second = fakeDispatcher()
    const pinnedLookups = new Map<string, LookupFunction>()
    const dispatchers = new Map([
      ['media.retailer.example', first.dispatcher],
      ['cdn.retailer.example', second.dispatcher],
    ])
    let initialDNSCalls = 0
    const dnsLookup = vi.fn(async (hostname: string) => {
      if (hostname === 'media.retailer.example') {
        initialDNSCalls += 1
        return initialDNSCalls === 1
          ? [{ address: '8.8.8.8', family: 4 }]
          : [{ address: '169.254.169.254', family: 4 }]
      }
      if (hostname === 'cdn.retailer.example') {
        return [{ address: '1.1.1.1', family: 4 }]
      }
      throw new Error('unexpected_hostname')
    })
    const dispatcherFactory = vi.fn((hostname: string, lookup: LookupFunction) => {
      pinnedLookups.set(hostname, lookup)
      const dispatcher = dispatchers.get(hostname)
      if (!dispatcher) throw new Error('unexpected_dispatcher_hostname')
      return dispatcher
    })
    const usedDispatchers: Dispatcher[] = []
    const lookupResults: Array<Array<{ address: string; family: number }>> = []
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof URL ? input : new URL(String(input))
      const dispatcher = (init as RequestInit & { dispatcher?: Dispatcher }).dispatcher
      if (!dispatcher) throw new Error('missing_pinned_dispatcher')
      usedDispatchers.push(dispatcher)
      const lookup = pinnedLookups.get(url.hostname)
      if (!lookup) throw new Error('missing_pinned_lookup')
      lookupResults.push(await lookupAll(lookup, url.hostname))
      lookupResults.push(await lookupAll(lookup, url.hostname))
      if (url.hostname === 'media.retailer.example') {
        return new Response(null, {
          headers: { Location: 'https://cdn.retailer.example/product.webp' },
          status: 302,
        })
      }
      return new Response('cached-image', {
        headers: { 'Content-Type': 'image/webp' },
        status: 200,
      })
    })

    await expect(
      fetchRemote('https://media.retailer.example/product', {
        accept: 'image/webp',
        approvedRetailerOnly: false,
        fetchImpl,
        maximumBytes: 1_024,
        timeoutMilliseconds: 5_000,
        transport: { dispatcherFactory, dnsLookup },
      }),
    ).resolves.toMatchObject({
      contentType: 'image/webp',
      finalURL: 'https://cdn.retailer.example/product.webp',
      status: 200,
    })

    expect(dnsLookup.mock.calls.map(([hostname]) => hostname)).toEqual([
      'media.retailer.example',
      'cdn.retailer.example',
    ])
    expect(initialDNSCalls).toBe(1)
    expect(lookupResults).toEqual([
      [{ address: '8.8.8.8', family: 4 }],
      [{ address: '8.8.8.8', family: 4 }],
      [{ address: '1.1.1.1', family: 4 }],
      [{ address: '1.1.1.1', family: 4 }],
    ])
    expect(usedDispatchers).toEqual([first.dispatcher, second.dispatcher])
    expect(first.destroy).toHaveBeenCalledOnce()
    expect(second.destroy).toHaveBeenCalledOnce()
  })

  it('blocks a redirect whose independently resolved address is private', async () => {
    const first = fakeDispatcher()
    const fetchImpl = vi.fn(
      async () =>
        new Response(null, {
          headers: { Location: 'https://rebound.retailer.example/product.webp' },
          status: 302,
        }),
    )

    await expect(
      fetchRemote('https://media.retailer.example/product', {
        accept: 'image/webp',
        approvedRetailerOnly: false,
        fetchImpl,
        maximumBytes: 1_024,
        timeoutMilliseconds: 5_000,
        transport: {
          dispatcherFactory: () => first.dispatcher,
          dnsLookup: async (hostname) =>
            hostname === 'media.retailer.example'
              ? [{ address: '8.8.8.8', family: 4 }]
              : [{ address: '127.0.0.1', family: 4 }],
        },
      }),
    ).rejects.toThrow('remote_address_blocked')

    expect(fetchImpl).toHaveBeenCalledOnce()
    expect(first.destroy).toHaveBeenCalledOnce()
  })

  it('applies the single remote deadline while DNS resolution is still pending', async () => {
    vi.useFakeTimers()
    try {
      const fetchImpl = vi.fn()
      const request = fetchRemote('https://media.retailer.example/product', {
        accept: 'image/webp',
        approvedRetailerOnly: false,
        fetchImpl,
        maximumBytes: 1_024,
        timeoutMilliseconds: 100,
        transport: {
          dnsLookup: () => new Promise<Array<{ address: string; family: number }>>(() => undefined),
        },
      })
      const rejected = expect(request).rejects.toThrow('remote_timeout')

      await vi.advanceTimersByTimeAsync(100)
      await rejected

      expect(fetchImpl).not.toHaveBeenCalled()
    } finally {
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })

  it('does not reset the deadline across redirects or wait for dispatcher cleanup', async () => {
    vi.useFakeTimers()
    try {
      const neverFinishes = () => new Promise<void>(() => undefined)
      const first = fakeDispatcher(vi.fn(neverFinishes))
      const second = fakeDispatcher(vi.fn(neverFinishes))
      let requestNumber = 0
      const fetchImpl = vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            requestNumber += 1
            const currentRequest = requestNumber
            setTimeout(
              () =>
                resolve(
                  currentRequest === 1
                    ? new Response(null, {
                        headers: { Location: 'https://cdn.retailer.example/product.webp' },
                        status: 302,
                      })
                    : new Response('cached-image', {
                        headers: { 'Content-Type': 'image/webp' },
                        status: 200,
                      }),
                ),
              60,
            )
          }),
      )
      const dispatcherFactory = vi
        .fn()
        .mockReturnValueOnce(first.dispatcher)
        .mockReturnValueOnce(second.dispatcher)
      const request = fetchRemote('https://media.retailer.example/product', {
        accept: 'image/webp',
        approvedRetailerOnly: false,
        fetchImpl,
        maximumBytes: 1_024,
        timeoutMilliseconds: 100,
        transport: {
          dispatcherFactory,
          dnsLookup: async (hostname) => [
            {
              address: hostname === 'media.retailer.example' ? '8.8.8.8' : '1.1.1.1',
              family: 4,
            },
          ],
        },
      })
      const rejected = expect(request).rejects.toThrow('remote_timeout')

      await vi.advanceTimersByTimeAsync(60)
      expect(fetchImpl).toHaveBeenCalledTimes(2)
      await vi.advanceTimersByTimeAsync(40)
      await rejected

      expect(first.destroy).toHaveBeenCalledOnce()
      expect(second.destroy).toHaveBeenCalledOnce()
    } finally {
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })

  it('keeps request cancellation active while a bounded response body is read', async () => {
    const response = new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3]))
        },
      }),
    )
    const controller = new AbortController()
    controller.abort()

    await expect(
      readBoundedBytes(response, 100, {
        signal: controller.signal,
        timeoutCode: 'openrouter_timeout',
      }),
    ).rejects.toThrow('openrouter_timeout')
  })

  it('applies the remote deadline when a response body stalls after headers', async () => {
    vi.useFakeTimers()
    try {
      const remote = fakeDispatcher()
      const fetchImpl = vi.fn(async () =>
        Promise.resolve(
          new Response(
            new ReadableStream<Uint8Array>({
              start() {
                // Headers arrive, but the retailer never sends or closes the body.
              },
            }),
            { headers: { 'Content-Type': 'image/webp' }, status: 200 },
          ),
        ),
      )
      const request = fetchRemote('https://media.retailer.example/product.webp', {
        accept: 'image/webp',
        approvedRetailerOnly: false,
        fetchImpl,
        maximumBytes: 1_024,
        timeoutMilliseconds: 100,
        transport: {
          dispatcherFactory: () => remote.dispatcher,
          dnsLookup: async () => [{ address: '8.8.8.8', family: 4 }],
        },
      })
      const rejected = expect(request).rejects.toThrow('remote_timeout')

      await vi.advanceTimersByTimeAsync(100)
      await rejected

      expect(fetchImpl).toHaveBeenCalledOnce()
      expect(remote.destroy).toHaveBeenCalledOnce()
    } finally {
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })

  it('extracts canonical product fields from retailer JSON-LD, not model-authored description/image', () => {
    const snapshot = extractRetailerProductPage(
      `<html><head><link rel="canonical" href="https://store.moma.org/products/canonical-retailer-product"><script type="application/ld+json">${JSON.stringify(
        {
          '@context': 'https://schema.org',
          '@type': 'Product',
          description:
            'A canonical retailer description long enough to be useful and persist locally.',
          image: '/cdn/product.jpg',
          name: 'Canonical Retailer Product',
          url: 'https://store.moma.org/products/canonical-retailer-product#product',
          offers: {
            '@type': 'Offer',
            availability: 'https://schema.org/InStock',
            price: '49.99',
            priceCurrency: 'USD',
          },
        },
      )}</script></head></html>`,
      'https://store.moma.org/products/canonical-retailer-product',
    )

    expect(snapshot).toEqual({
      availability: 'available',
      description: expect.stringContaining('canonical retailer description'),
      imageUrl: 'https://store.moma.org/cdn/product.jpg',
      name: 'Canonical Retailer Product',
      observedPriceCents: 4_999,
      sourceUrl: 'https://store.moma.org/products/canonical-retailer-product',
    })
  })

  it('treats absent availability as unknown and rejects explicit unavailability', () => {
    const product = (availability?: string) =>
      `<script type="application/ld+json">${JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Product',
        description: 'A canonical product description that is long enough for the local cache.',
        image: '/cdn/product.jpg',
        name: 'Canonical Retailer Product',
        offers: {
          '@type': 'Offer',
          ...(availability ? { availability } : {}),
          price: '49.99',
          priceCurrency: 'USD',
        },
      })}</script>`
    const sourceUrl = 'https://store.moma.org/products/canonical-retailer-product'

    expect(extractRetailerProductPage(product(), sourceUrl)?.availability).toBe('unknown')
    expect(
      extractRetailerProductPage(product('https://schema.org/OutOfStock'), sourceUrl)?.availability,
    ).toBe('unavailable')
  })

  it('rejects category-page and unrelated Product URL canonical mismatches', () => {
    const sourceUrl = 'https://store.moma.org/products/expected-product'
    const product = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      description: 'A canonical product description that is long enough for the local cache.',
      image: '/cdn/product.jpg',
      name: 'Unexpected Product',
      offers: { price: '49.99', priceCurrency: 'USD' },
      url: 'https://store.moma.org/products/unrelated-product',
    })

    expect(
      extractRetailerProductPage(
        `<link rel="canonical" href="https://store.moma.org/collections/desk"><script type="application/ld+json">${product}</script>`,
        sourceUrl,
      ),
    ).toBeNull()
    expect(
      extractRetailerProductPage(
        `<script type="application/ld+json">${product}</script>`,
        sourceUrl,
      ),
    ).toBeNull()
  })

  it('accepts only strict, citation-bound discovery metadata for the target theme', () => {
    const sourceUrl = 'https://store.moma.org/products/canonical-retailer-product'
    const metadata = {
      category: 'Desk object',
      expectedName: 'Canonical Retailer Product',
      sourceUrl,
      themes: ['desk_life'],
      whyItFits: 'A useful physical object for a considered workspace and daily building.',
    }
    expect(parseGiftDiscoveryMetadata(metadata, [sourceUrl], 'desk_life')).toEqual(metadata)
    expect(
      parseGiftDiscoveryMetadata(
        { ...metadata, sourceUrl: `${sourceUrl}?invented=1` },
        [sourceUrl],
        'desk_life',
      ),
    ).toBeNull()
    expect(
      parseGiftDiscoveryMetadata(
        {
          ...metadata,
          sourceUrl: `${sourceUrl}?utm_source=research`,
        },
        [`${sourceUrl}?utm_campaign=openrouter`],
        'desk_life',
      ),
    ).toEqual(metadata)
    expect(
      parseGiftDiscoveryMetadata(
        { ...metadata, whyItFits: 'A compact nourishing hand cream for long desk sessions.' },
        [sourceUrl],
        'desk_life',
      ),
    ).toBeNull()
    expect(
      parseGiftDiscoveryMetadata({ ...metadata, themes: ['wildcard'] }, [sourceUrl], 'desk_life'),
    ).toBeNull()
    expect(
      parseGiftDiscoveryMetadata(
        { ...metadata, sourceUrl: 'https://store.moma.org/products/gift-card' },
        ['https://store.moma.org/products/gift-card'],
        'desk_life',
      ),
    ).toBeNull()
    const longSourceUrl = `https://store.moma.org/products/${'a'.repeat(480)}`
    expect(
      parseGiftDiscoveryMetadata(
        { ...metadata, sourceUrl: longSourceUrl },
        [longSourceUrl],
        'desk_life',
      ),
    ).toBeNull()
    expect(giftProductRetailerName('www.barnesandnoble.com')).toBe('Barnes & Noble')
    expect(giftProductRetailerName('unapproved.example')).toBeNull()
  })

  it('turns mixed replenishment into a deterministic concrete budget and theme', () => {
    const job: GiftInventoryJob = {
      attempts: 1,
      budget: 'mixed',
      id: '1',
      jobKey: 'gift-discover-1234567890abcdef',
      kind: 'discover',
      maxAttempts: 4,
      productId: null,
      theme: 'mixed',
    }
    expect(discoveryTargetForJob(job)).toEqual(discoveryTargetForJob(job))
    expect(discoveryTargetForJob(job).budget).not.toBe('mixed')
    expect(discoveryTargetForJob(job).theme).not.toBe('mixed')
  })

  it('requires the expected and retailer product names to share a material identity', () => {
    expect(
      giftProductNamesMateriallyMatch('HAY Colour Crate – Small', 'Colour Crate Small by HAY'),
    ).toBe(true)
    expect(
      giftProductNamesMateriallyMatch('Canonical Retailer Product', 'Unexpected Product'),
    ).toBe(false)

    const metadata = {
      category: 'Desk object',
      expectedName: 'Canonical Retailer Product',
      sourceUrl: 'https://store.moma.org/products/canonical-retailer-product?utm_source=model',
      themes: ['desk_life'] as Array<'desk_life'>,
      whyItFits: 'A useful physical object for a considered workspace and daily building.',
    }
    const snapshot = {
      availability: 'available' as const,
      description: 'A safe canonical retailer description for a useful physical desk object.',
      imageUrl: 'https://store.moma.org/cdn/canonical-retailer-product.jpg',
      name: 'Canonical Retailer Product',
      observedPriceCents: 4_999,
      sourceUrl: 'https://www.store.moma.org/products/canonical-retailer-product',
    }
    expect(retailerProductMatchesMetadata(metadata, snapshot)).toBe(true)
    expect(
      retailerProductMatchesMetadata(metadata, {
        ...snapshot,
        sourceUrl: 'https://store.moma.org/products/unrelated-product',
      }),
    ).toBe(false)
    expect(
      retailerProductMatchesMetadata(metadata, {
        ...snapshot,
        description: 'A nourishing hand cream for long desk sessions.',
      }),
    ).toBe(false)
  })

  it('fails deterministic invalid jobs immediately without consuming every attempt', async () => {
    const { connectionQuery, database } = mockDatabase(async () => ({ rowCount: 1, rows: [] }))
    const job: GiftInventoryJob = {
      attempts: 1,
      budget: null,
      id: '1',
      jobKey: 'gift-validate-1234567890abcdef',
      kind: 'validate',
      maxAttempts: 4,
      productId: 'gift-12345678',
      theme: null,
    }

    await expect(
      failGiftInventoryJob(
        database,
        job,
        'worker:test-1',
        new GiftInventoryWorkerError('retailer_product_identity_mismatch', 'invalid'),
      ),
    ).resolves.toBe('failed')

    expect(connectionQuery.mock.calls[1][1]?.[2]).toBe('failed')
    expect(connectionQuery.mock.calls[2][0]).toContain("WHEN $3::boolean THEN 'invalid'")
    expect(connectionQuery.mock.calls[2][1]?.slice(1)).toEqual([
      'retailer_product_identity_mismatch',
      true,
    ])
  })

  it('keeps cached inventory drawable as stale after the first retryable validation failure', async () => {
    const { connectionQuery, database } = mockDatabase(async () => ({ rowCount: 1, rows: [] }))
    const job: GiftInventoryJob = {
      attempts: 1,
      budget: null,
      id: '1',
      jobKey: 'gift-validate-1234567890abcdef',
      kind: 'validate',
      maxAttempts: 4,
      productId: 'gift-12345678',
      theme: null,
    }

    await expect(
      failGiftInventoryJob(
        database,
        job,
        'worker:test-1',
        new GiftInventoryWorkerError('retailer_page_timeout', 'retry'),
      ),
    ).resolves.toBe('retry')

    expect(connectionQuery.mock.calls[1][1]?.[2]).toBe('queued')
    expect(connectionQuery.mock.calls[2][0]).toContain(
      "WHEN validation_status <> 'invalid' THEN 'stale'",
    )
    expect(connectionQuery.mock.calls[2][0]).toContain('validation_expires_at = now()')
    expect(connectionQuery.mock.calls[2][1]).toEqual([
      'gift-12345678',
      'retailer_page_timeout',
      false,
    ])
  })

  it('normalizes a safe raster image to bounded WebP', async () => {
    const png = await sharp({
      create: { background: '#dde6f0', channels: 3, height: 96, width: 128 },
    })
      .png()
      .toBuffer()
    const image = await normalizeRetailerImage(png, 'image/png')

    expect(image.mime).toBe('image/webp')
    expect(image.bytes.subarray(0, 4).toString()).toBe('RIFF')
    expect(image.bytes.byteLength).toBeLessThanOrEqual(1_500_000)
    expect(image.sha256).toMatch(/^[a-f0-9]{64}$/)
  })

  it('rejects source images above the twelve-million-pixel boundary', async () => {
    const oversized = await sharp({
      create: { background: '#dde6f0', channels: 3, height: 3_001, width: 4_000 },
    })
      .png()
      .toBuffer()

    await expect(normalizeRetailerImage(oversized, 'image/png')).rejects.toThrow(
      'retailer_image_invalid',
    )
  })

  it('finalizes a stale running job whose last allowed attempt was abandoned', async () => {
    const { connectionQuery, database } = mockDatabase(async (text) => {
      if (
        text.includes('UPDATE gift_inventory_jobs') &&
        text.includes('worker_stale_final_attempt')
      ) {
        return { rowCount: 1, rows: [{ product_id: 'gift-12345678' }] }
      }
      return { rowCount: text.includes('UPDATE gift_inventory') ? 1 : 0, rows: [] }
    })

    await expect(claimGiftInventoryJob(database, 'worker:test-1')).resolves.toBeNull()

    const inventoryUpdate = connectionQuery.mock.calls.find(([text]) =>
      String(text).includes('UPDATE gift_inventory\n         SET validation_status'),
    )
    expect(inventoryUpdate?.[0]).toContain('validation_status = CASE')
    expect(inventoryUpdate?.[0]).not.toMatch(/\bchecked_at\b/)
    expect(
      connectionQuery.mock.calls.some(([text]) =>
        String(text).includes("last_error_code = 'worker_stale_final_attempt'"),
      ),
    ).toBe(true)
  })

  it('drains no more than three durable jobs even when best-effort telemetry throws', async () => {
    let claimed = 0
    const { database } = mockDatabase(async (text) => {
      if (text.includes("to_regclass('public.gift_inventory')")) {
        return { rowCount: 1, rows: [{ ready: true }] }
      }
      if (text.includes('RETURNING job.id')) {
        claimed += 1
        return {
          rowCount: 1,
          rows: [
            {
              attempts: 1,
              budget_id: null,
              id: claimed,
              job_key: `gift-validate-job-${claimed}`,
              kind: 'validate',
              max_attempts: 4,
              product_id: 'gift-12345678',
              theme_id: null,
            },
          ],
        }
      }
      if (text.startsWith('SELECT id, name, category')) return { rowCount: 0, rows: [] }
      if (text.includes("SET status = 'completed'")) return { rowCount: 1, rows: [] }
      return { rowCount: 0, rows: [] }
    })

    await expect(
      drainGiftInventoryJobs({
        config: workerConfig,
        database,
        logger: () => {
          throw new Error('telemetry unavailable')
        },
        maximumJobs: 99,
      }),
    ).resolves.toEqual({ processed: 3, status: 'processed' })
    expect(claimed).toBe(3)
  })

  it('requeues a timed-out lease before a concurrent late mutation can cross its fence', async () => {
    vi.useFakeTimers()
    try {
      let claimed = false
      let releaseNormalization!: () => void
      const normalization = new Promise<void>((resolve) => {
        releaseNormalization = resolve
      })
      const logger = vi.fn()
      const store = vi.fn()
      let jobRunning = true
      const { database } = mockDatabase(async (text, values) => {
        if (text.includes("to_regclass('public.gift_inventory')")) {
          return { rowCount: 1, rows: [{ ready: true }] }
        }
        if (text.includes('RETURNING job.id')) {
          if (claimed) return { rowCount: 0, rows: [] }
          claimed = true
          return {
            rowCount: 1,
            rows: [
              {
                attempts: 1,
                budget_id: 'under_30',
                id: 91,
                job_key: 'gift-discover-job-timeout',
                kind: 'discover',
                max_attempts: 4,
                product_id: null,
                theme_id: 'books_ideas',
              },
            ],
          }
        }
        if (text.includes('SET status = $3')) {
          expect(values[4]).toBe('worker_job_timeout')
          expect(values[5]).toBe(1)
          jobRunning = false
          return { rowCount: 1, rows: [] }
        }
        if (text.includes('SELECT id FROM gift_inventory_jobs')) {
          return { rowCount: jobRunning ? 1 : 0, rows: jobRunning ? [{ id: 91 }] : [] }
        }
        if (text.includes('SET name = $2, normalized_name = $3')) store()
        return { rowCount: 0, rows: [] }
      })
      const processJobImpl = vi.fn(
        async (
          _database: GiftInventoryDatabase,
          _config: GiftInventoryWorkerConfig,
          _job: GiftInventoryJob,
          _fetchImpl?: unknown,
          _signal?: AbortSignal,
          lease?: GiftInventoryJobLease,
        ) => {
          await normalization
          await refreshGiftProduct(
            database,
            'gift-12345678',
            {
              availability: 'available',
              description: 'A canonical description extracted from the retailer product page.',
              imageUrl: 'https://store.moma.org/cdn/real-product.jpg',
              name: 'Real Product',
              observedPriceCents: 4_999,
              sourceUrl: 'https://store.moma.org/products/real-product',
            },
            {
              bytes: Buffer.from('cached-webp'),
              mime: 'image/webp',
              sha256: 'a'.repeat(64),
            },
            undefined,
            lease,
          )
          return { inserted: true, outcome: 'discovered' as const }
        },
      )

      const drain = drainGiftInventoryJobs({
        config: workerConfig,
        database,
        logger,
        processJobImpl,
      })
      await vi.advanceTimersByTimeAsync(0)
      for (let step = 0; step < 12 && logger.mock.calls.length === 0; step += 1) {
        await Promise.resolve()
      }
      expect(logger).toHaveBeenCalledWith({
        attempts: 1,
        event: 'started',
        jobId: '91',
        kind: 'discover',
      })

      await vi.advanceTimersByTimeAsync(75_000)
      await expect(drain).resolves.toEqual({ processed: 1, status: 'processed' })
      expect(logger).toHaveBeenCalledWith({
        attempts: 1,
        code: 'worker_job_timeout',
        event: 'retry',
        jobId: '91',
        kind: 'discover',
      })

      const lateOperation = processJobImpl.mock.results[0]?.value
      expect(lateOperation).toBeInstanceOf(Promise)
      releaseNormalization()
      await expect(lateOperation).rejects.toThrow('worker_job_lease_lost')
      expect(store).not.toHaveBeenCalled()
    } finally {
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })

  it('returns immediately when a process-local drain is already active', async () => {
    let releaseSchemaCheck!: (value: { rowCount: number; rows: QueryResultRow[] }) => void
    const schemaCheck = new Promise<{ rowCount: number; rows: QueryResultRow[] }>((resolve) => {
      releaseSchemaCheck = resolve
    })
    const { database } = mockDatabase(async (text) => {
      if (text.includes("to_regclass('public.gift_inventory')")) return schemaCheck
      return { rowCount: 0, rows: [] }
    })

    const active = drainGiftInventoryJobs({ config: workerConfig, database })
    await Promise.resolve()
    await expect(drainGiftInventoryJobs({ config: workerConfig, database })).resolves.toEqual({
      processed: 0,
      status: 'busy',
    })
    releaseSchemaCheck({ rowCount: 1, rows: [{ ready: false }] })
    await expect(active).resolves.toEqual({ processed: 0, status: 'schema_unavailable' })
  })
})
