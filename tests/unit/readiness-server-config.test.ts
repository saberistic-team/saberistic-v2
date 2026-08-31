import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  readinessAIIsConfigured,
  resolveOpenRouterReadinessConfig,
} from '@/lib/readiness/server/config'

const validEnvironment = (): NodeJS.ProcessEnv => ({
  AI_ENHANCEMENT_ENABLED: '1',
  NODE_ENV: 'test',
  OPENROUTER_ACCOUNT_GATES_CONFIRMED: '2026-09-01.1',
  OPENROUTER_API_KEY: 'test-openrouter-key',
  OPENROUTER_FALLBACK_MODEL: 'anthropic/claude-sonnet-4.5',
  OPENROUTER_PRIMARY_MODEL: 'openai/gpt-5.1',
  PUBLIC_SITE_URL: 'https://saberistic.example/readiness?ignored=true',
  READINESS_RATE_LIMIT_SECRET: 'test-rate-limit-secret-that-is-long-enough',
  REDIS_URL: 'redis://example.invalid:6379',
})

describe('OpenRouter readiness configuration', () => {
  it.each([undefined, '', '0', 'true'])(
    'stays disabled unless the feature flag is exactly 1: %j',
    (flag) => {
      const environment = validEnvironment()

      if (flag === undefined) {
        Reflect.deleteProperty(environment, 'AI_ENHANCEMENT_ENABLED')
      } else {
        environment.AI_ENHANCEMENT_ENABLED = flag
      }

      expect(resolveOpenRouterReadinessConfig(environment)).toBeNull()
    },
  )

  it.each([undefined, '', '1', '2026-08-31.1'])(
    'requires an account-gate confirmation for the exact readiness policy: %j',
    (confirmation) => {
      const environment = validEnvironment()

      if (confirmation === undefined) {
        Reflect.deleteProperty(environment, 'OPENROUTER_ACCOUNT_GATES_CONFIRMED')
      } else {
        environment.OPENROUTER_ACCOUNT_GATES_CONFIRMED = confirmation
      }

      expect(resolveOpenRouterReadinessConfig(environment)).toBeNull()
    },
  )

  it.each([undefined, '', '   '])('requires a non-empty server-side API key: %j', (apiKey) => {
    const environment = validEnvironment()

    if (apiKey === undefined) {
      Reflect.deleteProperty(environment, 'OPENROUTER_API_KEY')
    } else {
      environment.OPENROUTER_API_KEY = apiKey
    }

    expect(resolveOpenRouterReadinessConfig(environment)).toBeNull()
  })

  it('requires two distinct pinned provider models and trims accepted values', () => {
    const environment = validEnvironment()
    environment.OPENROUTER_API_KEY = '  test-openrouter-key  '
    environment.OPENROUTER_PRIMARY_MODEL = '  openai/gpt-5.1  '
    environment.OPENROUTER_FALLBACK_MODEL = '  anthropic/claude-sonnet-4.5  '

    expect(resolveOpenRouterReadinessConfig(environment)).toEqual({
      apiKey: 'test-openrouter-key',
      fallbackModel: 'anthropic/claude-sonnet-4.5',
      maxCompletionTokens: 1_800,
      primaryModel: 'openai/gpt-5.1',
      siteURL: 'https://saberistic.example',
      timeoutMs: 12_000,
    })

    environment.OPENROUTER_FALLBACK_MODEL = 'openai/gpt-5.1'
    expect(resolveOpenRouterReadinessConfig(environment)).toBeNull()

    environment.OPENROUTER_FALLBACK_MODEL = 'OPENAI/GPT-5.1'
    expect(resolveOpenRouterReadinessConfig(environment)).toBeNull()
  })

  it.each([
    ['OPENROUTER_PRIMARY_MODEL', undefined],
    ['OPENROUTER_FALLBACK_MODEL', undefined],
    ['OPENROUTER_PRIMARY_MODEL', 'unqualified-model'],
    ['OPENROUTER_FALLBACK_MODEL', 'provider/'],
    ['OPENROUTER_PRIMARY_MODEL', 'provider/model name'],
  ] as const)('rejects an absent or unpinned %s value: %j', (name, value) => {
    const environment = validEnvironment()

    if (value === undefined) {
      Reflect.deleteProperty(environment, name)
    } else {
      environment[name] = value
    }

    expect(resolveOpenRouterReadinessConfig(environment)).toBeNull()
  })

  it.each(['OPENROUTER_PRIMARY_MODEL', 'OPENROUTER_FALLBACK_MODEL'] as const)(
    'rejects openrouter/auto as %s',
    (name) => {
      const environment = validEnvironment()
      environment[name] = 'openrouter/auto'

      expect(resolveOpenRouterReadinessConfig(environment)).toBeNull()
    },
  )

  it.each([
    'openrouter/free',
    'openrouter/horizon-alpha',
    'provider/model:exacto',
    'provider/model:floor',
    'provider/model:free',
    'provider/model:latest',
    'provider/model:nitro',
    'provider/model:online',
    'provider/latest-model',
    'provider/model-auto',
  ])('rejects a dynamic or unpinned routing alias: %s', (model) => {
    const environment = validEnvironment()
    environment.OPENROUTER_PRIMARY_MODEL = model

    expect(resolveOpenRouterReadinessConfig(environment)).toBeNull()
  })

  it.each([
    {
      maxCompletionTokens: undefined,
      maxCompletionTokensExpected: 1_800,
      timeout: undefined,
      timeoutExpected: 12_000,
    },
    {
      maxCompletionTokens: '599',
      maxCompletionTokensExpected: 1_800,
      timeout: '2999',
      timeoutExpected: 12_000,
    },
    {
      maxCompletionTokens: '4001',
      maxCompletionTokensExpected: 1_800,
      timeout: '25001',
      timeoutExpected: 12_000,
    },
    {
      maxCompletionTokens: '900.5',
      maxCompletionTokensExpected: 1_800,
      timeout: '5000.5',
      timeoutExpected: 12_000,
    },
    {
      maxCompletionTokens: '600',
      maxCompletionTokensExpected: 600,
      timeout: '3000',
      timeoutExpected: 3_000,
    },
    {
      maxCompletionTokens: '4000',
      maxCompletionTokensExpected: 4_000,
      timeout: '25000',
      timeoutExpected: 25_000,
    },
  ])(
    'bounds completion tokens ($maxCompletionTokens) and timeout ($timeout)',
    ({ maxCompletionTokens, maxCompletionTokensExpected, timeout, timeoutExpected }) => {
      const environment = validEnvironment()

      if (maxCompletionTokens !== undefined) {
        environment.OPENROUTER_MAX_COMPLETION_TOKENS = maxCompletionTokens
      }
      if (timeout !== undefined) environment.OPENROUTER_TIMEOUT_MS = timeout

      const config = resolveOpenRouterReadinessConfig(environment)

      expect(config?.maxCompletionTokens).toBe(maxCompletionTokensExpected)
      expect(config?.timeoutMs).toBe(timeoutExpected)
    },
  )

  it('normalizes a valid site URL to its origin and safely omits an invalid one', () => {
    const environment = validEnvironment()

    expect(resolveOpenRouterReadinessConfig(environment)?.siteURL).toBe(
      'https://saberistic.example',
    )

    environment.PUBLIC_SITE_URL = 'not a URL'
    environment.SITE_URL = 'https://fallback.example'
    expect(resolveOpenRouterReadinessConfig(environment)?.siteURL).toBeNull()

    environment.PUBLIC_SITE_URL = ''
    expect(resolveOpenRouterReadinessConfig(environment)?.siteURL).toBe('https://fallback.example')
  })

  it('reports AI ready only when OpenRouter, Redis, and the rate-limit secret are configured', () => {
    const environment = validEnvironment()

    expect(readinessAIIsConfigured(environment)).toBe(true)

    for (const name of ['REDIS_URL', 'READINESS_RATE_LIMIT_SECRET'] as const) {
      const incomplete = { ...environment }
      Reflect.deleteProperty(incomplete, name)
      expect(readinessAIIsConfigured(incomplete)).toBe(false)
    }

    expect(
      readinessAIIsConfigured({
        ...environment,
        READINESS_RATE_LIMIT_SECRET: 'replace-with-a-real-secret-that-is-long-enough',
      }),
    ).toBe(false)

    expect(
      readinessAIIsConfigured({
        ...environment,
        OPENROUTER_FALLBACK_MODEL: environment.OPENROUTER_PRIMARY_MODEL,
      }),
    ).toBe(false)
  })
})
