import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  giftCORSHeaders,
  giftClientAddress,
  giftOptionsResponse,
  GiftRequestBodyFailure,
  readBoundedGiftRequestText,
  validatedGiftOrigin,
} from '@/lib/gifts/server/http'

const productionEnvironment: NodeJS.ProcessEnv = {
  NODE_ENV: 'production',
  PUBLIC_SITE_URL: 'https://saberistic.com',
  RENDER: 'true',
  RENDER_SERVICE_TYPE: 'web',
  SITE_URL: 'https://backend.example',
}

describe('Gift Draft HTTP boundary', () => {
  it('allows only configured exact origins and emits narrow CORS headers', () => {
    const allowed = new Request('https://backend.example/api/gifts/ideas', {
      headers: { origin: 'https://saberistic.com' },
      method: 'OPTIONS',
    })
    const rejected = new Request('https://backend.example/api/gifts/ideas', {
      headers: { origin: 'https://attacker.example' },
      method: 'OPTIONS',
    })

    expect(validatedGiftOrigin(allowed, productionEnvironment)).toBe('https://saberistic.com')
    expect(validatedGiftOrigin(rejected, productionEnvironment)).toBeNull()
    expect(giftOptionsResponse(allowed, productionEnvironment).status).toBe(204)
    expect(giftOptionsResponse(rejected, productionEnvironment).status).toBe(403)
    expect(giftCORSHeaders('https://saberistic.com')).toMatchObject({
      'Access-Control-Allow-Origin': 'https://saberistic.com',
      'Cache-Control': 'no-store',
      Vary: 'Origin',
    })
  })

  it('bounds and decodes JSON request bodies without using unbounded request.text()', async () => {
    const valid = new Request('https://backend.example/api/gifts/ideas', {
      body: JSON.stringify({ small: true }),
      method: 'POST',
    })
    await expect(readBoundedGiftRequestText(valid)).resolves.toBe('{"small":true}')

    const oversized = new Request('https://backend.example/api/gifts/ideas', {
      body: 'x'.repeat(24 * 1024 + 1),
      method: 'POST',
    })
    await expect(readBoundedGiftRequestText(oversized)).rejects.toEqual(
      expect.objectContaining<Partial<GiftRequestBodyFailure>>({ reason: 'oversized' }),
    )
  })

  it('trusts only the production edge address header', () => {
    const request = new Request('https://backend.example/api/gifts/ideas', {
      headers: {
        'cf-connecting-ip': '203.0.113.8',
        'x-real-ip': '198.51.100.2',
      },
    })
    expect(giftClientAddress(request, productionEnvironment)).toBe('203.0.113.8')

    const spoofOnly = new Request('https://backend.example/api/gifts/ideas', {
      headers: { 'x-real-ip': '198.51.100.2' },
    })
    expect(giftClientAddress(spoofOnly, productionEnvironment)).toBeNull()

    expect(
      giftClientAddress(request, {
        ...productionEnvironment,
        RENDER: undefined,
        RENDER_SERVICE_TYPE: undefined,
      }),
    ).toBeNull()
  })
})
