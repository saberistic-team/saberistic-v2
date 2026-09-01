import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  resolveOpenRouterGiftConfig,
  resolveStripeGiftConfig,
  resolveStripeGiftReadConfig,
  resolveStripeGiftWebhookConfig,
} from '@/lib/gifts/server/config'

function environment(): NodeJS.ProcessEnv {
  return {
    GIFTING_AI_ENABLED: '1',
    GIFTING_CHECKOUT_ENABLED: '1',
    GIFT_QUOTE_SECRET: 'q'.repeat(40),
    NODE_ENV: 'test',
    OPENROUTER_ACCOUNT_GATES_CONFIRMED: '2026-09-01.1',
    OPENROUTER_API_KEY: 'openrouter-test-key',
    OPENROUTER_GIFT_FALLBACK_MODEL: 'google/gemini-3.7-flash',
    OPENROUTER_GIFT_PRIMARY_MODEL: 'openai/gpt-5.6-luna',
    PUBLIC_SITE_URL: 'https://saberistic.example/gifts?ignored=true',
    STRIPE_RESTRICTED_KEY: `rk_test_${'a'.repeat(32)}`,
    STRIPE_GIFT_WEBHOOK_SECRET: `whsec_${'w'.repeat(32)}`,
  }
}

describe('Gift Draft server configuration', () => {
  it('reserves one bounded deadline for research and strict synthesis', () => {
    expect(resolveOpenRouterGiftConfig(environment())).toMatchObject({ timeoutMs: 60_000 })
  })

  it('resolves pinned OpenRouter models and bounded runtime settings', () => {
    const value = environment()
    value.OPENROUTER_GIFT_TIMEOUT_MS = '60000'
    value.OPENROUTER_GIFT_MAX_COMPLETION_TOKENS = '6000'

    expect(resolveOpenRouterGiftConfig(value)).toEqual({
      apiKey: 'openrouter-test-key',
      fallbackModel: 'google/gemini-3.7-flash',
      maxCompletionTokens: 6_000,
      primaryModel: 'openai/gpt-5.6-luna',
      quoteSecret: 'q'.repeat(40),
      siteOrigin: 'https://saberistic.example',
      timeoutMs: 60_000,
    })
  })

  it.each([
    ['GIFTING_AI_ENABLED', '0'],
    ['OPENROUTER_ACCOUNT_GATES_CONFIRMED', '2026-08-31.1'],
    ['OPENROUTER_API_KEY', ''],
    ['GIFT_QUOTE_SECRET', 'short'],
    ['OPENROUTER_GIFT_PRIMARY_MODEL', 'openrouter/auto'],
    ['OPENROUTER_GIFT_PRIMARY_MODEL', 'openai/gpt-5.6-luna:online'],
    ['OPENROUTER_GIFT_FALLBACK_MODEL', 'openai/gpt-5.6-luna'],
  ])('fails closed for invalid %s', (key, value) => {
    const candidate = environment()
    candidate[key] = value
    expect(resolveOpenRouterGiftConfig(candidate)).toBeNull()
  })

  it('accepts only an enabled restricted Stripe key and a trusted public origin', () => {
    expect(resolveStripeGiftConfig(environment())).toEqual({
      apiKey: `rk_test_${'a'.repeat(32)}`,
      publicSiteOrigin: 'https://saberistic.example',
      quoteSecret: 'q'.repeat(40),
    })

    const secretKey = environment()
    secretKey.STRIPE_RESTRICTED_KEY = `sk_test_${'a'.repeat(32)}`
    expect(resolveStripeGiftConfig(secretKey)).toBeNull()

    const disabled = environment()
    disabled.GIFTING_CHECKOUT_ENABLED = '0'
    expect(resolveStripeGiftConfig(disabled)).toBeNull()

    const unsafeOrigin = environment()
    unsafeOrigin.PUBLIC_SITE_URL = 'http://public.example'
    expect(resolveStripeGiftConfig(unsafeOrigin)).toBeNull()

    const missingWebhook = environment()
    missingWebhook.STRIPE_GIFT_WEBHOOK_SECRET = ''
    expect(resolveStripeGiftConfig(missingWebhook)).toBeNull()
  })

  it('keeps webhook and read-only reconciliation available when new checkout is disabled', () => {
    const disabled = environment()
    disabled.GIFTING_CHECKOUT_ENABLED = '0'

    const expected = {
      apiKey: `rk_test_${'a'.repeat(32)}`,
      publicSiteOrigin: 'https://saberistic.example',
      quoteSecret: 'q'.repeat(40),
    }
    expect(resolveStripeGiftReadConfig(disabled)).toEqual(expected)
    expect(resolveStripeGiftWebhookConfig(disabled)).toEqual({
      ...expected,
      webhookSecret: `whsec_${'w'.repeat(32)}`,
    })

    disabled.STRIPE_GIFT_WEBHOOK_SECRET = ''
    expect(resolveStripeGiftWebhookConfig(disabled)).toBeNull()
  })
})
