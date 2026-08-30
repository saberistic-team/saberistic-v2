// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  window.saberisticUmamiBeforeSend = undefined
  vi.resetModules()
})

describe('client instrumentation bootstrap', () => {
  it('registers the privacy guard before tracker hydration', async () => {
    expect(window.saberisticUmamiBeforeSend).toBeUndefined()

    await import('../../src/instrumentation-client')

    expect(window.saberisticUmamiBeforeSend).toBeTypeOf('function')
    expect(
      window.saberisticUmamiBeforeSend?.('event', {
        hostname: 'saberistic.com',
        title: 'Saberistic',
        url: '/?private=value',
        website: '94db1cb1-74f4-4a40-ad6c-962362670409',
      }),
    ).toMatchObject({ url: '/' })
  })
})
