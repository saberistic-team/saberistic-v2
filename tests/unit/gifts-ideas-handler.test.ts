import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import type { ModelGiftIdea } from '@/lib/gifts/validation'
import { handleGiftIdeas, handleGiftIdeasStatus } from '@/lib/gifts/server/ideas-handler'
import { GiftSearchError } from '@/lib/gifts/server/openrouter'

const validRequest = {
  anonymousToken: 'anonymous_token_1234567890',
  budget: 'under_30',
  theme: 'build_fuel',
  variationSeed: 'variation_seed_1234567890',
} as const

function environment(): NodeJS.ProcessEnv {
  return {
    GIFTING_AI_ENABLED: '1',
    GIFTING_CHECKOUT_ENABLED: '1',
    GIFT_QUOTE_SECRET: 'q'.repeat(40),
    NODE_ENV: 'test',
    OPENROUTER_ACCOUNT_GATES_CONFIRMED: '2026-09-01.1',
    OPENROUTER_API_KEY: 'private-openrouter-test-key',
    OPENROUTER_GIFT_FALLBACK_MODEL: 'openai/gpt-4.1-mini',
    OPENROUTER_GIFT_PRIMARY_MODEL: 'openai/gpt-4.1',
    PUBLIC_SITE_URL: 'https://saberistic.com',
    STRIPE_GIFT_WEBHOOK_SECRET: `whsec_${'w'.repeat(32)}`,
    STRIPE_RESTRICTED_KEY: `rk_test_${'r'.repeat(32)}`,
  }
}

function request(method = 'POST'): Request {
  return new Request('https://backend.example/api/gifts/ideas', {
    ...(method === 'POST'
      ? {
          body: JSON.stringify(validRequest),
          headers: {
            'Content-Type': 'application/json',
            Origin: 'https://saberistic.com',
          },
        }
      : { headers: { Origin: 'https://saberistic.com' } }),
    method,
  })
}

function ideas(): ModelGiftIdea[] {
  return Array.from({ length: 9 }, (_, index) => ({
    category: `Desk tool ${index + 1}`,
    currency: 'usd' as const,
    name: `Reviewed physical gift ${index + 1}`,
    observedPriceCents: 1_500 + index * 100,
    retailer: 'Adafruit',
    sourceUrl: `https://www.adafruit.com/products/reviewed-gift-${index + 1}`,
    whyItFits: `A useful and durable choice for a curious systems builder number ${index + 1}.`,
  }))
}

describe('Gift Draft ideas handler', () => {
  it('reports the independently resolved ideas and checkout feature status', async () => {
    const enabled = await handleGiftIdeasStatus(request('GET'), environment()).json()
    expect(enabled).toEqual({ checkoutEnabled: true, ideasEnabled: true })

    const disabledEnvironment = environment()
    disabledEnvironment.GIFTING_AI_ENABLED = '0'
    disabledEnvironment.GIFTING_CHECKOUT_ENABLED = '0'
    const response = handleGiftIdeasStatus(request('GET'), disabledEnvironment)

    await expect(response.json()).resolves.toEqual({
      checkoutEnabled: false,
      ideasEnabled: false,
    })
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('access-control-allow-origin')).toBe('https://saberistic.com')
  })

  it('accepts a same-origin status GET when the browser omits Origin', async () => {
    const response = handleGiftIdeasStatus(
      new Request('https://backend.example/api/gifts/ideas', { method: 'GET' }),
      environment(),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      checkoutEnabled: true,
      ideasEnabled: true,
    })
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('rejects an untrusted explicit Origin on the status endpoint', async () => {
    const response = handleGiftIdeasStatus(
      new Request('https://backend.example/api/gifts/ideas', {
        headers: { Origin: 'https://attacker.example' },
        method: 'GET',
      }),
      environment(),
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: 'Request origin is not allowed.' })
    expect(response.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('fails before Redis or OpenRouter when the reviewed AI flag is disabled', async () => {
    const disabledEnvironment = environment()
    disabledEnvironment.GIFTING_AI_ENABLED = '0'
    const authorize = vi.fn()
    const search = vi.fn()

    const response = await handleGiftIdeas(request(), {
      authorize,
      environment: disabledEnvironment,
      search,
    })

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      error: 'The live gift scout is not configured yet. Try again later.',
    })
    expect(authorize).not.toHaveBeenCalled()
    expect(search).not.toHaveBeenCalled()
  })

  it('maps a real limiter rejection without calling or billing OpenRouter', async () => {
    const search = vi.fn()
    const response = await handleGiftIdeas(request(), {
      authorize: vi.fn().mockResolvedValue({ allowed: false, reason: 'token' }),
      environment: environment(),
      search,
    })

    expect(response.status).toBe(429)
    await expect(response.json()).resolves.toEqual({
      error: 'That is enough rapid-fire draws for now. Try again later.',
    })
    expect(search).not.toHaveBeenCalled()
  })

  it('signs nine quotes, emits bounded telemetry, and releases the limiter lease', async () => {
    const release = vi.fn().mockResolvedValue(undefined)
    const log = vi.fn()
    let id = 0
    const response = await handleGiftIdeas(request(), {
      authorize: vi.fn().mockResolvedValue({ allowed: true, release }),
      environment: environment(),
      log,
      now: () => 1_800_000_000_000,
      randomUUID: () => `00000000-0000-4000-8000-${String(++id).padStart(12, '0')}`,
      search: vi.fn().mockResolvedValue({
        citations: 16,
        ideas: ideas(),
        listingChecks: 14,
        model: 'openai/gpt-4.1-mini',
        searchModel: 'openai/gpt-4.1',
        sourcePricesChanged: 2,
        usage: {
          completionTokens: 900,
          cost: 0.04,
          promptTokens: 2_100,
          searchRequests: 3,
          serverToolCalls: 3,
          totalTokens: 3_000,
        },
        verifiedCandidates: 11,
      }),
    })

    expect(response.status).toBe(200)
    const body = (await response.json()) as Record<string, unknown>
    expect(body).toMatchObject({
      ideas: expect.arrayContaining([
        expect.objectContaining({ quoteToken: expect.stringMatching(/^gq1\./) }),
      ]),
      runId: expect.stringMatching(/^[A-Za-z0-9_-]{16,160}$/),
    })
    expect(body.ideas as unknown[]).toHaveLength(9)
    expect(release).toHaveBeenCalledOnce()
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        citations: 16,
        cost: 0.04,
        listingChecks: 14,
        model: 'openai/gpt-4.1-mini',
        outcome: 'completed',
        searchModel: 'openai/gpt-4.1',
        sourcePricesChanged: 2,
        verifiedCandidates: 11,
      }),
    )
    expect(JSON.stringify(log.mock.calls)).not.toContain('reviewed-gift-')
    expect(JSON.stringify(log.mock.calls)).not.toContain(validRequest.anonymousToken)
  })

  it('releases the lease and records known usage when provider validation fails', async () => {
    const release = vi.fn().mockResolvedValue(undefined)
    const log = vi.fn()
    const response = await handleGiftIdeas(request(), {
      authorize: vi.fn().mockResolvedValue({ allowed: true, release }),
      environment: environment(),
      log,
      search: vi.fn().mockRejectedValue(
        new GiftSearchError(
          'invalid_model_output',
          {},
          {
            completionTokens: 700,
            cost: 0.03,
            promptTokens: 1_500,
            searchRequests: 2,
            serverToolCalls: 2,
            totalTokens: 2_200,
          },
        ),
      ),
    })

    expect(response.status).toBe(502)
    expect(release).toHaveBeenCalledOnce()
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ cost: 0.03, outcome: 'failed', reason: 'invalid_model_output' }),
    )
  })
})
