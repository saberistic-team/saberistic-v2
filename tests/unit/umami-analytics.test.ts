import { describe, expect, it } from 'vitest'

import { resolveUmamiAnalyticsConfig } from '@/lib/analytics/umami'

const websiteId = '94db1cb1-74f4-4a40-ad6c-962362670409'

describe('resolveUmamiAnalyticsConfig', () => {
  it('stays disabled until both required public values are valid', () => {
    expect(resolveUmamiAnalyticsConfig({})).toBeNull()
    expect(
      resolveUmamiAnalyticsConfig({
        UMAMI_SCRIPT_URL: 'https://analytics.example.com/script.js',
      }),
    ).toBeNull()
    expect(
      resolveUmamiAnalyticsConfig({
        UMAMI_SCRIPT_URL: 'https://analytics.example.com/script.js',
        UMAMI_WEBSITE_ID: 'not-a-uuid',
      }),
    ).toBeNull()
  })

  it('accepts a secure tracker URL and defaults to the Saberistic domains', () => {
    expect(
      resolveUmamiAnalyticsConfig({
        UMAMI_SCRIPT_URL: 'https://analytics.saberistic.com/script.js',
        UMAMI_WEBSITE_ID: websiteId,
      }),
    ).toEqual({
      domains: 'saberistic.com,www.saberistic.com',
      scriptUrl: 'https://analytics.saberistic.com/script.js',
      websiteId,
    })
  })

  it('normalizes and deduplicates an explicit domain allowlist', () => {
    expect(
      resolveUmamiAnalyticsConfig({
        UMAMI_SCRIPT_URL: 'https://analytics.saberistic.com/x.js',
        UMAMI_TRACK_DOMAINS: ' saberistic.com,WWW.SABERISTIC.COM,saberistic.com ',
        UMAMI_WEBSITE_ID: websiteId,
      })?.domains,
    ).toBe('saberistic.com,www.saberistic.com')
  })

  it.each([
    'http://analytics.saberistic.com/script.js',
    'https://user:password@analytics.saberistic.com/script.js',
    'https://analytics.saberistic.com/script.js?source=test',
    'https://analytics.saberistic.com/#script',
    'https://analytics.saberistic.com/',
  ])('rejects an unsafe tracker URL: %s', (scriptUrl) => {
    expect(
      resolveUmamiAnalyticsConfig({
        UMAMI_SCRIPT_URL: scriptUrl,
        UMAMI_WEBSITE_ID: websiteId,
      }),
    ).toBeNull()
  })

  it('rejects domain entries that include ports or paths', () => {
    expect(
      resolveUmamiAnalyticsConfig({
        UMAMI_SCRIPT_URL: 'https://analytics.saberistic.com/script.js',
        UMAMI_TRACK_DOMAINS: 'saberistic.com/path',
        UMAMI_WEBSITE_ID: websiteId,
      }),
    ).toBeNull()
  })
})
