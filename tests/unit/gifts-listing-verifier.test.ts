import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  isPublicGiftListingAddress,
  listingMatchesCandidate,
  verifyGiftListings,
} from '@/lib/gifts/server/listing-verifier'
import type { ModelGiftIdea } from '@/lib/gifts/validation'

const listingLiveTest = process.env.RUN_GIFT_LISTING_LIVE === '1' ? it : it.skip

function candidate(overrides: Partial<ModelGiftIdea> = {}): ModelGiftIdea {
  return {
    category: 'Desk tool',
    currency: 'usd',
    name: 'Exact Physical Gift',
    observedPriceCents: 1_195,
    retailer: 'Adafruit',
    sourceUrl: 'https://www.adafruit.com/product/1234',
    whyItFits: 'A useful and durable object for a curious systems builder.',
    ...overrides,
  }
}

function productHTML({
  availability = 'https://schema.org/InStock',
  currency = 'USD',
  name = 'Exact Physical Gift',
  offerType = 'Offer',
  offers,
  price = '11.9500',
  productType = 'Product',
  url = 'https://www.adafruit.com/product/1234',
}: {
  availability?: unknown
  currency?: unknown
  name?: unknown
  offerType?: unknown
  offers?: unknown
  price?: unknown
  productType?: unknown
  url?: string
} = {}) {
  const product = {
    '@context': 'https://schema.org',
    '@type': productType,
    name,
    offers:
      offers ??
      ({
        '@type': offerType,
        availability,
        price,
        priceCurrency: currency,
        url,
      } as const),
  }
  const pageTitle = typeof name === 'string' ? name : 'Unknown product'
  return `<!doctype html><html><head><title>${pageTitle}</title><link rel="canonical" href="${url}"><meta property="og:url" content="${url}"><meta property="og:title" content="${pageTitle}"><script type="application/ld+json">${JSON.stringify(product)}</script></head><body></body></html>`
}

function inheritedContextProductHTML(context: string) {
  const url = candidate().sourceUrl
  const document = {
    '@context': context,
    '@graph': [
      {
        '@type': 'Product',
        name: candidate().name,
        offers: {
          '@type': 'Offer',
          availability: 'InStock',
          price: '11.95',
          priceCurrency: 'USD',
          url,
        },
      },
    ],
  }
  return `<!doctype html><html><head><title>${candidate().name}</title><link rel="canonical" href="${url}"><meta property="og:url" content="${url}"><meta property="og:title" content="${candidate().name}"><script type="application/ld+json">${JSON.stringify(document)}</script></head><body></body></html>`
}

describe('Gift listing verifier', () => {
  it('accepts one exact USD InStock Product Offer without rewriting trailing-zero cents', () => {
    expect(listingMatchesCandidate(productHTML(), candidate())).toBe(true)
    expect(listingMatchesCandidate(productHTML({ price: 11.95 }), candidate())).toBe(true)
  })

  it.each([
    ['name mismatch', productHTML({ name: 'Sibling Physical Gift' })],
    ['stale price', productHTML({ price: '12.95' })],
    ['non-USD currency', productHTML({ currency: 'EUR' })],
    ['out of stock', productHTML({ availability: 'https://schema.org/OutOfStock' })],
    ['missing availability', productHTML({ availability: null })],
    ['aggregate offer', productHTML({ offerType: 'AggregateOffer' })],
    ['fractional cent', productHTML({ price: '11.951' })],
  ])('rejects %s evidence', (_label, html) => {
    expect(listingMatchesCandidate(html, candidate())).toBe(false)
  })

  it('accepts one Offer in an array but rejects multiple products or offers as ambiguous', () => {
    const duplicated = `${productHTML()}${productHTML()}`
    expect(listingMatchesCandidate(duplicated, candidate())).toBe(false)
    expect(
      listingMatchesCandidate(
        productHTML({
          offers: [
            {
              '@type': 'Offer',
              availability: 'https://schema.org/InStock',
              price: '11.95',
              priceCurrency: 'USD',
              url: candidate().sourceUrl,
            },
          ],
        }),
        candidate(),
      ),
    ).toBe(true)
    expect(
      listingMatchesCandidate(
        productHTML({
          offers: [
            {
              '@type': 'Offer',
              availability: 'https://schema.org/InStock',
              price: '11.95',
              priceCurrency: 'USD',
              url: candidate().sourceUrl,
            },
            {
              '@type': 'Offer',
              availability: 'https://schema.org/InStock',
              price: '12.95',
              priceCurrency: 'USD',
              url: candidate().sourceUrl,
            },
          ],
        }),
        candidate(),
      ),
    ).toBe(false)
  })

  it('rejects ambiguous Product, Offer, and availability type arrays', () => {
    expect(
      listingMatchesCandidate(productHTML({ productType: ['Product', 'Thing'] }), candidate()),
    ).toBe(false)
    expect(
      listingMatchesCandidate(productHTML({ offerType: ['Offer', 'AggregateOffer'] }), candidate()),
    ).toBe(false)
    expect(
      listingMatchesCandidate(
        productHTML({
          availability: ['https://schema.org/InStock', 'https://schema.org/OutOfStock'],
        }),
        candidate(),
      ),
    ).toBe(false)
  })

  it('accepts unambiguous one-element schema arrays and rejects foreign schema terms', () => {
    expect(
      listingMatchesCandidate(
        productHTML({
          availability: ['https://schema.org/InStock'],
          offerType: ['https://schema.org/Offer'],
          productType: ['https://schema.org/Product'],
        }),
        candidate(),
      ),
    ).toBe(true)
    expect(
      listingMatchesCandidate(
        productHTML({ availability: 'https://evil.example/InStock' }),
        candidate(),
      ),
    ).toBe(false)
  })

  it('accepts bare terms inherited from schema.org context and rejects them under a foreign context', () => {
    expect(
      listingMatchesCandidate(inheritedContextProductHTML('https://schema.org'), candidate()),
    ).toBe(true)
    expect(
      listingMatchesCandidate(
        inheritedContextProductHTML('https://example.invalid/vocabulary/'),
        candidate(),
      ),
    ).toBe(false)
  })

  it('requires an absolute same-product Offer URL and rejects conflicting Product URLs', () => {
    expect(
      listingMatchesCandidate(
        productHTML({
          offers: {
            '@type': 'Offer',
            availability: 'https://schema.org/InStock',
            price: '11.95',
            priceCurrency: 'USD',
          },
        }),
        candidate(),
      ),
    ).toBe(false)
    expect(
      listingMatchesCandidate(
        productHTML({
          offers: {
            '@type': 'Offer',
            availability: 'https://schema.org/InStock',
            price: '11.95',
            priceCurrency: 'USD',
            url: '/product/1234',
          },
        }),
        candidate(),
      ),
    ).toBe(false)
    expect(
      listingMatchesCandidate(
        productHTML({
          offers: {
            '@type': 'Offer',
            availability: 'https://schema.org/InStock',
            price: '11.95',
            priceCurrency: 'USD',
            url: 'https://www.adafruit.com/product/9999',
          },
        }),
        candidate(),
      ),
    ).toBe(false)
    const conflictingProduct = productHTML().replace(
      '"name":"Exact Physical Gift"',
      '"name":"Exact Physical Gift","url":"https://www.adafruit.com/product/9999"',
    )
    expect(listingMatchesCandidate(conflictingProduct, candidate())).toBe(false)
  })

  it('accepts same-family host aliases, query variants, and Uncommon Goods numeric SKU URLs', () => {
    expect(
      listingMatchesCandidate(
        productHTML({ url: 'https://adafruit.com/product/1234?utm_source=search' }),
        candidate(),
      ),
    ).toBe(true)
    const uncommonCandidate = candidate({
      name: 'Timberbots Wooden Robots DIY Kit',
      observedPriceCents: 2_000,
      retailer: 'Uncommon Goods',
      sourceUrl: 'https://www.uncommongoods.com/product/timberbots-wooden-robots-diy-kit',
    })
    expect(
      listingMatchesCandidate(
        productHTML({
          name: uncommonCandidate.name,
          price: '20.00',
          url: `${uncommonCandidate.sourceUrl}/630790000000`,
        }),
        uncommonCandidate,
      ),
    ).toBe(true)
  })

  it('rejects malformed, missing, or oversized structured product evidence', () => {
    expect(
      listingMatchesCandidate('<html><body>No structured data</body></html>', candidate()),
    ).toBe(false)
    expect(
      listingMatchesCandidate(
        '<html><script type="application/ld+json">{not-json}</script></html>',
        candidate(),
      ),
    ).toBe(false)
    expect(listingMatchesCandidate(`<!--${'x'.repeat(1024 * 1024)}-->`, candidate())).toBe(false)
  })

  it.each([
    [
      'PyRuler stock failure',
      candidate({ name: 'Adafruit PyRuler', observedPriceCents: 1_195 }),
      productHTML({
        availability: 'https://schema.org/OutOfStock',
        name: 'Adafruit PyRuler',
        price: '11.95',
      }),
    ],
    [
      'MoMA stale price',
      candidate({ name: '24-Bit Precision Screwdriver', observedPriceCents: 2_500 }),
      productHTML({ name: '24-Bit Precision Screwdriver', price: '21.00' }),
    ],
    [
      'Adafruit coaster stale price',
      candidate({ name: 'PCB Coaster with Gold Adafruit Logo', observedPriceCents: 1_295 }),
      productHTML({ name: 'PCB Coaster with Gold Adafruit Logo', price: '2.50' }),
    ],
    [
      'marble cube wrong product price',
      candidate({
        name: 'Build Your Own 3D Pro Marble Run Puzzle Cube',
        observedPriceCents: 3_000,
      }),
      productHTML({ name: 'Build Your Own 3D Pro Marble Run Puzzle Cube', price: '120.00' }),
    ],
    [
      'FixMat sibling price association',
      candidate({ name: 'FixMat: Magnetic Screw Mat', observedPriceCents: 1_995 }),
      productHTML({ name: 'FixMat: Magnetic Screw Mat', price: '36.95' }),
    ],
  ])('rejects the hosted canary regression: %s', (_label, idea, html) => {
    expect(listingMatchesCandidate(html, idea)).toBe(false)
  })

  it('checks supported listings concurrently, preserves order, and fails closed per page', async () => {
    const candidates = Array.from({ length: 12 }, (_, index) =>
      candidate({
        name: `Exact Physical Gift ${index + 1}`,
        observedPriceCents: 1_000 + index,
        sourceUrl: `https://www.adafruit.com/product/${index + 1}`,
      }),
    )
    let active = 0
    let maximumActive = 0
    const load = vi.fn(async (url: URL) => {
      active += 1
      maximumActive = Math.max(maximumActive, active)
      await Promise.resolve()
      active -= 1
      const index = Number(url.pathname.split('/').at(-1)) - 1
      if (index === 3) throw new Error('temporary retailer failure')
      if (index === 7)
        return productHTML({
          name: candidates[index]!.name,
          price: '99.99',
          url: candidates[index]!.sourceUrl,
        })
      return productHTML({
        name: candidates[index]!.name,
        price: `${Math.floor(candidates[index]!.observedPriceCents / 100)}.${String(candidates[index]!.observedPriceCents % 100).padStart(2, '0')}`,
        url: candidates[index]!.sourceUrl,
      })
    })

    const result = await verifyGiftListings(candidates, {
      budget: 'under_30',
      load,
      signal: new AbortController().signal,
    })

    expect(result).toMatchObject({ checked: 12, rejections: { load: 1 }, sourcePricesChanged: 0 })
    expect(result.verified.map((idea) => idea.name)).toEqual(
      candidates.filter((_, index) => index !== 3 && index !== 7).map((idea) => idea.name),
    )
    expect(maximumActive).toBeGreaterThan(1)
    expect(maximumActive).toBeLessThanOrEqual(4)
  })

  it('never loads an unsupported retailer host', async () => {
    const load = vi.fn()
    const result = await verifyGiftListings(
      [candidate({ sourceUrl: 'https://www.barnesandnoble.com/w/example/1234567890' })],
      { budget: 'under_30', load, signal: new AbortController().signal },
    )

    expect(result).toEqual({
      checked: 1,
      rejections: { host: 1 },
      sourcePricesChanged: 0,
      verified: [],
    })
    expect(load).not.toHaveBeenCalled()
  })

  it('uses the exact source offer price when it remains inside the selected budget', async () => {
    const result = await verifyGiftListings([candidate()], {
      budget: 'under_30',
      load: async () => productHTML({ price: '12.95' }),
      signal: new AbortController().signal,
    })

    expect(result).toMatchObject({ checked: 1, sourcePricesChanged: 1 })
    expect(result.verified).toEqual([candidate({ observedPriceCents: 1_295 })])
  })

  it.each([
    'Soldering Iron Tip Refill',
    'Replacement Part for Precision Driver',
    'Raspberry Pi Header Component',
    'Cable Organizer Add-On',
  ])('rejects source-canonical non-standalone identity: %s', async (sourceName) => {
    const result = await verifyGiftListings([candidate()], {
      budget: 'under_30',
      load: async () => productHTML({ name: sourceName }),
      signal: new AbortController().signal,
    })

    expect(result).toEqual({
      checked: 1,
      rejections: { policy: 1 },
      sourcePricesChanged: 0,
      verified: [],
    })
  })

  it('preserves internal candidate metadata while validating only the public gift fields', async () => {
    const researchCandidate = { ...candidate(), candidateId: 'candidate_01' }
    const result = await verifyGiftListings([researchCandidate], {
      budget: 'under_30',
      load: async () => productHTML({ price: '12.95' }),
      signal: new AbortController().signal,
    })

    expect(result.verified).toEqual([{ ...researchCandidate, observedPriceCents: 1_295 }])
  })

  it('rejects a source-derived price that leaves the selected budget', async () => {
    const result = await verifyGiftListings([candidate()], {
      budget: 'under_30',
      load: async () => productHTML({ price: '30.01' }),
      signal: new AbortController().signal,
    })

    expect(result).toEqual({
      checked: 1,
      rejections: { budget_above: 1 },
      sourcePricesChanged: 0,
      verified: [],
    })
  })

  it('binds evidence to the main page product and canonicalizes its source name', async () => {
    const mainPage = productHTML({ name: 'Main Page Product', price: '12.95' })
    const relatedProduct = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'Exact Physical Gift',
      offers: {
        '@type': 'Offer',
        availability: 'https://schema.org/InStock',
        price: '11.95',
        priceCurrency: 'USD',
        url: 'https://www.adafruit.com/product/9999',
      },
    })
    const html = mainPage.replace(
      '</head>',
      `<script type="application/ld+json">${relatedProduct}</script></head>`,
    )

    expect(listingMatchesCandidate(html, candidate())).toBe(false)
    const result = await verifyGiftListings([candidate()], {
      budget: 'under_30',
      load: async () => html,
      signal: new AbortController().signal,
    })
    expect(result.verified).toEqual([
      candidate({ name: 'Main Page Product', observedPriceCents: 1_295 }),
    ])
  })

  it.each([
    ['8.8.8.8', true],
    ['2606:4700:4700::1111', true],
    ['127.0.0.1', false],
    ['10.0.0.1', false],
    ['169.254.169.254', false],
    ['192.168.1.1', false],
    ['192.0.2.1', false],
    ['::1', false],
    ['fc00::1', false],
    ['fe80::1', false],
    ['2001:db8::1', false],
    ['fec0::1', false],
    ['64:ff9b::7f00:1', false],
    ['0:0:0:0:0:ffff:7f00:1', false],
    ['2002:7f00:1::', false],
    ['3fff::1', false],
    ['4000::1', false],
  ])('classifies listing address %s as public=%s', (address, expected) => {
    expect(isPublicGiftListingAddress(address)).toBe(expected)
  })

  listingLiveTest(
    'reads current Product Offer evidence without executing retailer JavaScript',
    async () => {
      const liveCandidates: ModelGiftIdea[] = [
        candidate({
          name: 'Adafruit PyRuler - Engineer Reference Ruler with CircuitPython',
          observedPriceCents: 1_195,
          sourceUrl: 'https://www.adafruit.com/product/4319',
        }),
        candidate({
          name: 'Minnow Driver Kit: Pocket-Size Screwdriver + Portable Bit Set',
          observedPriceCents: 1_495,
          sourceUrl: 'https://www.ifixit.com/products/minnow-driver-kit-16-bit-driver-kit',
        }),
        candidate({
          name: 'Timberbots Wooden Robots DIY Kit',
          observedPriceCents: 2_000,
          sourceUrl: 'https://www.uncommongoods.com/product/timberbots-wooden-robots-diy-kit',
        }),
        candidate({
          name: '24-Bit Precision Screwdriver',
          observedPriceCents: 2_100,
          retailer: 'MoMA Design Store',
          sourceUrl: 'https://store.moma.org/products/24-bit-precision-screwdriver',
        }),
        candidate({
          name: 'FixMat: Magnetic Screw Mat',
          observedPriceCents: 3_695,
          sourceUrl: 'https://www.ifixit.com/products/fixmat',
        }),
        candidate({
          name: 'FixMat: Magnetic Screw Mat',
          observedPriceCents: 1_995,
          sourceUrl: 'https://www.ifixit.com/products/fixmat',
        }),
      ]

      const result = await verifyGiftListings(liveCandidates, {
        budget: 'under_30',
        signal: new AbortController().signal,
      })

      expect(result.checked).toBe(6)
      expect(result.verified.map((idea) => idea.name)).toEqual([
        'Minnow Driver Kit: Pocket-Size Screwdriver + Portable Bit Set',
        'Timberbots Wooden Robots DIY Kit',
        '24-Bit Precision Screwdriver',
      ])
      expect(result.verified.map((idea) => idea.observedPriceCents)).toEqual([1_495, 2_000, 2_100])
    },
    20_000,
  )
})
