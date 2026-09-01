import { afterEach, describe, expect, it, vi } from 'vitest'

import { giftEndpoints } from '../../apps/site/src/lib/gift-endpoints'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('static Gift Draft endpoints', () => {
  it('maps every client call to the configured HTTPS backend origin', () => {
    expect(
      giftEndpoints(
        '  https://backend.example:8443/cms/path?token=must-be-removed#fragment  ',
        'remote',
      ),
    ).toEqual({
      checkoutEndpoint: 'https://backend.example:8443/api/gifts/checkout',
      ideasEndpoint: 'https://backend.example:8443/api/gifts/ideas',
      paymentStatusEndpoint: 'https://backend.example:8443/api/gifts/payment-status',
    })
  })

  it.each([
    'http://backend.example',
    'http://localhost.example.com',
    'ftp://backend.example',
    'javascript:alert(1)',
    'https://user:password@backend.example/internal',
    'not a URL',
  ])('rejects an unsafe or malformed remote backend: %s', (configured) => {
    expect(() => giftEndpoints(configured, 'remote')).toThrow(
      'PAYLOAD_PUBLIC_URL must identify the HTTPS gift backend',
    )
  })

  it('fails closed without an ambient backend in remote content mode', () => {
    vi.stubEnv('PAYLOAD_PUBLIC_URL', '')
    vi.stubEnv('STATIC_CONTENT_MODE', 'remote')

    expect(() => giftEndpoints()).toThrow('PAYLOAD_PUBLIC_URL must identify the HTTPS gift backend')
  })

  it('uses relative placeholders only for the non-deployable fixture export', () => {
    expect(giftEndpoints(undefined, 'fixture')).toEqual({
      checkoutEndpoint: '/api/gifts/checkout',
      ideasEndpoint: '/api/gifts/ideas',
      paymentStatusEndpoint: '/api/gifts/payment-status',
    })
  })
})
