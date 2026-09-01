import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  authorizeGiftCheckout,
  authorizeGiftPaymentStatus,
  authorizeGiftRequest,
} from '@/lib/gifts/server/rate-limit'

const environment: NodeJS.ProcessEnv = {
  GIFTING_CONCURRENCY_LIMIT: '2',
  GIFTING_DAILY_LIMIT: '100',
  GIFTING_IP_LIMIT: '8',
  GIFTING_RATE_LIMIT_SECRET: 'r'.repeat(40),
  GIFTING_TOKEN_LIMIT: '4',
  NODE_ENV: 'production',
}

describe('Gift Draft rate limiting', () => {
  it('uses HMAC-derived buckets and releases its short concurrency lease', async () => {
    const evalCall = vi.fn().mockResolvedValueOnce([1, 0]).mockResolvedValueOnce(1)
    const permit = await authorizeGiftRequest(
      { anonymousToken: 'anonymous-browser-token', clientAddress: '203.0.113.8' },
      {
        environment,
        now: () => 1_800_000_000_000,
        randomUUID: () => '123e4567-e89b-42d3-a456-426614174000',
        redis: { eval: evalCall },
      },
    )

    expect(permit.allowed).toBe(true)
    const admissionArgs = evalCall.mock.calls[0]
    expect(admissionArgs.join(' ')).not.toContain('203.0.113.8')
    expect(admissionArgs.join(' ')).not.toContain('anonymous-browser-token')
    expect(admissionArgs[13]).toBe(1_800_000_075_000)
    const script = String(admissionArgs[0])
    const purgeExpired = script.indexOf("redis.call('ZREMRANGEBYSCORE'")
    const countActive = script.indexOf("redis.call('ZCARD'")
    const reserveLease = script.indexOf("redis.call('ZADD'")
    const incrementQuota = script.indexOf("redis.call('INCR'")
    expect(purgeExpired).toBeGreaterThanOrEqual(0)
    expect(countActive).toBeGreaterThan(purgeExpired)
    expect(reserveLease).toBeGreaterThan(countActive)
    expect(incrementQuota).toBeGreaterThan(reserveLease)

    if (permit.allowed) {
      await permit.release()
      await permit.release()
    }
    expect(evalCall).toHaveBeenCalledTimes(2)
    expect(evalCall.mock.calls[1]?.at(-1)).toBe('123e4567-e89b-42d3-a456-426614174000')
  })

  it.each([
    [[0, 1], 'ip'],
    [[0, 2], 'token'],
    [[0, 3], 'daily'],
    [[0, 4], 'concurrency'],
  ] as const)('maps an admission rejection %j to %s', async (result, reason) => {
    const permit = await authorizeGiftRequest(
      { anonymousToken: 'anonymous-browser-token', clientAddress: '203.0.113.8' },
      {
        environment,
        now: () => 1_800_000_000_000,
        randomUUID: () => '123e4567-e89b-42d3-a456-426614174000',
        redis: { eval: vi.fn().mockResolvedValue(result) },
      },
    )

    expect(permit).toEqual({ allowed: false, reason })
  })

  it('fails closed when Redis or the HMAC secret is unavailable', async () => {
    await expect(
      authorizeGiftRequest(
        { anonymousToken: 'anonymous-browser-token', clientAddress: '203.0.113.8' },
        { environment: { NODE_ENV: 'production' } },
      ),
    ).resolves.toEqual({ allowed: false, reason: 'unavailable' })
  })
})

describe('Gift Draft checkout limiting', () => {
  it('uses HMAC-only IP and signed-quote buckets', async () => {
    const evaluate = vi.fn().mockResolvedValue([1, 0])
    await expect(
      authorizeGiftCheckout(
        { clientAddress: '203.0.113.8', quoteToken: 'signed.quote.token' },
        { environment, redis: { eval: evaluate } },
      ),
    ).resolves.toEqual({ allowed: true })

    const serialized = evaluate.mock.calls[0]?.join(' ') ?? ''
    expect(serialized).not.toContain('203.0.113.8')
    expect(serialized).not.toContain('signed.quote.token')
  })

  it.each([
    [[0, 1], 'ip'],
    [[0, 2], 'quote'],
  ] as const)('maps checkout rejection %j to %s', async (result, reason) => {
    await expect(
      authorizeGiftCheckout(
        { clientAddress: '203.0.113.8', quoteToken: 'signed.quote.token' },
        { environment, redis: { eval: vi.fn().mockResolvedValue(result) } },
      ),
    ).resolves.toEqual({ allowed: false, reason })
  })
})

describe('Gift Draft payment-status limiting', () => {
  it('uses a bounded HMAC-only IP bucket and fails closed on Redis errors', async () => {
    const evaluate = vi.fn().mockResolvedValue(1)
    await expect(
      authorizeGiftPaymentStatus(
        { clientAddress: '203.0.113.8' },
        { environment, redis: { eval: evaluate } },
      ),
    ).resolves.toEqual({ allowed: true })
    expect(evaluate.mock.calls[0]?.join(' ')).not.toContain('203.0.113.8')

    await expect(
      authorizeGiftPaymentStatus(
        { clientAddress: '203.0.113.8' },
        { environment, redis: { eval: vi.fn().mockRejectedValue(new Error('offline')) } },
      ),
    ).resolves.toEqual({ allowed: false, reason: 'unavailable' })
  })

  it('rejects an exhausted status IP bucket', async () => {
    await expect(
      authorizeGiftPaymentStatus(
        { clientAddress: '203.0.113.8' },
        { environment, redis: { eval: vi.fn().mockResolvedValue(0) } },
      ),
    ).resolves.toEqual({ allowed: false, reason: 'ip' })
  })
})
