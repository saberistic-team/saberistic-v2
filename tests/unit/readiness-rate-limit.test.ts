import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  authorizeReadinessAIRequest,
  clientAddressFromRequest,
  recordReadinessRejectedSubmission,
} from '@/lib/readiness/server/rate-limit'

type RedisEval = (
  script: string,
  numberOfKeys: number,
  ...args: Array<number | string>
) => Promise<unknown>

type FakeRedis = { eval: ReturnType<typeof vi.fn<RedisEval>> }

const context = {
  anonymousToken: 'raw-browser-token-that-must-not-reach-redis',
  clientAddress: '203.0.113.45',
}
const leaseNowMs = 1_800_000_000_000
const firstLeaseId = '123e4567-e89b-42d3-a456-426614174001'
const secondLeaseId = '123e4567-e89b-42d3-a456-426614174002'

const validEnvironment = (): NodeJS.ProcessEnv => ({
  NODE_ENV: 'production',
  READINESS_RATE_LIMIT_SECRET: 'test-rate-limit-secret-that-is-long-enough',
})

function fakeRedis(...results: unknown[]): FakeRedis {
  const queue = [...results]

  return {
    eval: vi.fn<RedisEval>(async () => {
      const next = queue.shift()
      if (next instanceof Error) throw next
      return next
    }),
  }
}

describe('readiness AI rate limiting', () => {
  it('fails closed when Redis or a strong derivation secret is unavailable', async () => {
    await expect(
      authorizeReadinessAIRequest(context, { environment: validEnvironment() }),
    ).resolves.toEqual({ allowed: false, reason: 'unavailable' })

    for (const secret of [
      undefined,
      '',
      'too-short',
      'replace-with-a-real-secret-that-is-long-enough',
    ]) {
      const environment = validEnvironment()
      const redis = fakeRedis([1, 0])

      if (secret === undefined) {
        Reflect.deleteProperty(environment, 'READINESS_RATE_LIMIT_SECRET')
      } else {
        environment.READINESS_RATE_LIMIT_SECRET = secret
      }

      await expect(authorizeReadinessAIRequest(context, { environment, redis })).resolves.toEqual({
        allowed: false,
        reason: 'unavailable',
      })
      expect(redis.eval).not.toHaveBeenCalled()
    }
  })

  it('derives opaque IP and token keys without passing raw identifiers or the secret to Redis', async () => {
    const environment = validEnvironment()
    const redis = fakeRedis([1, 0])
    const permit = await authorizeReadinessAIRequest(context, { environment, redis })

    expect(permit.allowed).toBe(true)
    expect(redis.eval).toHaveBeenCalledOnce()

    const serializedCalls = JSON.stringify(redis.eval.mock.calls)
    expect(serializedCalls).not.toContain(context.clientAddress)
    expect(serializedCalls).not.toContain(context.anonymousToken)
    expect(serializedCalls).not.toContain(environment.READINESS_RATE_LIMIT_SECRET)

    const admissionCall = redis.eval.mock.calls[0] as unknown[]
    expect(admissionCall[1]).toBe(4)
    expect(admissionCall[2]).toMatch(/^readiness:production:ip:[A-Za-z0-9_-]{43}$/)
    expect(admissionCall[3]).toMatch(/^readiness:production:token:[A-Za-z0-9_-]{43}$/)
    expect(admissionCall[4]).toBe('readiness:production:daily')
    expect(admissionCall[5]).toBe('readiness:production:concurrency')
  })

  it.each([
    { failedIndex: 1, reason: 'ip' },
    { failedIndex: 2, reason: 'token' },
    { failedIndex: 3, reason: 'daily' },
    { failedIndex: 4, reason: 'concurrency' },
  ] as const)(
    'denies a request when the $reason admission limit is exhausted',
    async ({ failedIndex, reason }) => {
      const redis = fakeRedis([0, failedIndex])

      await expect(
        authorizeReadinessAIRequest(context, { environment: validEnvironment(), redis }),
      ).resolves.toEqual({ allowed: false, reason })
      expect(redis.eval).toHaveBeenCalledOnce()
    },
  )

  it('checks concurrency before incrementing quotas in one atomic admission transaction', async () => {
    const redis = fakeRedis([0, 4])

    await expect(
      authorizeReadinessAIRequest(context, { environment: validEnvironment(), redis }),
    ).resolves.toEqual({ allowed: false, reason: 'concurrency' })
    expect(redis.eval).toHaveBeenCalledOnce()

    const script = redis.eval.mock.calls[0]?.[0] ?? ''
    const concurrencyDenial = script.indexOf('if currentConcurrency >= concurrencyLimit')
    const leaseReservation = script.indexOf("redis.call('ZADD', concurrencyKey, 'NX'")
    const quotaIncrement = script.indexOf("redis.call('INCR', KEYS[index])")
    expect(concurrencyDenial).toBeGreaterThan(-1)
    expect(leaseReservation).toBeGreaterThan(concurrencyDenial)
    expect(quotaIncrement).toBeGreaterThan(leaseReservation)
  })

  it('uses independent expiring leases and purges expiry before each staggered admission', async () => {
    const redis = fakeRedis([1, 0], [1, 0], 1, 1)

    const firstPermit = await authorizeReadinessAIRequest(context, {
      environment: validEnvironment(),
      now: () => leaseNowMs,
      randomUUID: () => firstLeaseId,
      redis,
    })
    const secondPermit = await authorizeReadinessAIRequest(context, {
      environment: validEnvironment(),
      now: () => leaseNowMs + 20_000,
      randomUUID: () => secondLeaseId,
      redis,
    })

    expect(firstPermit.allowed).toBe(true)
    expect(secondPermit.allowed).toBe(true)
    expect(redis.eval).toHaveBeenCalledTimes(2)
    for (const call of redis.eval.mock.calls.slice(0, 2)) {
      const script = call[0]
      expect(script).toContain("redis.call('ZREMRANGEBYSCORE', concurrencyKey, '-inf', now)")
      expect(script).toContain("redis.call('ZCARD', concurrencyKey)")
      expect(script).toContain("redis.call('ZADD', concurrencyKey, 'NX', leaseExpiresAt, leaseId)")
      expect(script).toContain("redis.call('EXPIRE', concurrencyKey, 60)")
    }
    expect(redis.eval.mock.calls[0]?.slice(-3)).toEqual([
      leaseNowMs,
      leaseNowMs + 45_000,
      firstLeaseId,
    ])
    expect(redis.eval.mock.calls[1]?.slice(-3)).toEqual([
      leaseNowMs + 20_000,
      leaseNowMs + 65_000,
      secondLeaseId,
    ])

    if (!firstPermit.allowed || !secondPermit.allowed) throw new Error('Expected active leases.')
    await firstPermit.release()
    await secondPermit.release()
    expect(redis.eval.mock.calls[2]?.slice(1)).toEqual([
      1,
      'readiness:production:concurrency',
      firstLeaseId,
    ])
    expect(redis.eval.mock.calls[3]?.slice(1)).toEqual([
      1,
      'readiness:production:concurrency',
      secondLeaseId,
    ])
  })

  it('reserves concurrency and releases it exactly once', async () => {
    const redis = fakeRedis([1, 0], 1)
    const permit = await authorizeReadinessAIRequest(context, {
      environment: validEnvironment(),
      now: () => leaseNowMs,
      randomUUID: () => firstLeaseId,
      redis,
    })

    expect(permit.allowed).toBe(true)
    if (!permit.allowed) throw new Error('Expected an allowed rate-limit permit.')

    expect(redis.eval).toHaveBeenCalledOnce()
    expect(redis.eval.mock.calls[0]?.slice(1)).toEqual([
      4,
      expect.stringMatching(/^readiness:production:ip:[A-Za-z0-9_-]{43}$/),
      expect.stringMatching(/^readiness:production:token:[A-Za-z0-9_-]{43}$/),
      'readiness:production:daily',
      'readiness:production:concurrency',
      8,
      3_600,
      4,
      21_600,
      200,
      86_400,
      3,
      leaseNowMs,
      leaseNowMs + 45_000,
      firstLeaseId,
    ])

    await expect(permit.release()).resolves.toBeUndefined()
    await expect(permit.release()).resolves.toBeUndefined()

    expect(redis.eval).toHaveBeenCalledTimes(2)
    expect(redis.eval.mock.calls[1]?.slice(1)).toEqual([
      1,
      'readiness:production:concurrency',
      firstLeaseId,
    ])
  })

  it('uses bounded defaults for invalid rate-limit settings', async () => {
    const environment = {
      ...validEnvironment(),
      READINESS_AI_CONCURRENCY_LIMIT: '21',
      READINESS_AI_DAILY_LIMIT: '0',
      READINESS_AI_IP_LIMIT: '8.5',
      READINESS_AI_TOKEN_LIMIT: 'not-a-number',
    }
    const redis = fakeRedis([1, 0])

    const permit = await authorizeReadinessAIRequest(context, { environment, redis })

    expect(permit.allowed).toBe(true)
    expect(redis.eval.mock.calls[0]?.slice(6, 13)).toEqual([8, 3_600, 4, 21_600, 200, 86_400, 3])
  })

  it('fails closed for malformed Redis responses and authorization errors', async () => {
    for (const redis of [
      fakeRedis('malformed'),
      fakeRedis(['1', '0']),
      fakeRedis([2, 0]),
      fakeRedis([1, 1]),
      fakeRedis([0, 5]),
      fakeRedis(new Error('admission unavailable')),
    ]) {
      await expect(
        authorizeReadinessAIRequest(context, { environment: validEnvironment(), redis }),
      ).resolves.toEqual({ allowed: false, reason: 'unavailable' })
    }
  })

  it.each([
    { now: () => Number.NaN, randomUUID: () => firstLeaseId },
    { now: () => Number.MAX_SAFE_INTEGER, randomUUID: () => firstLeaseId },
    { now: () => leaseNowMs, randomUUID: () => 'not-a-uuid' },
    {
      now: () => leaseNowMs,
      randomUUID: () => {
        throw new Error('lease generation failed')
      },
    },
  ])('fails closed before Redis for an invalid lease input', async ({ now, randomUUID }) => {
    const redis = fakeRedis([1, 0])

    await expect(
      authorizeReadinessAIRequest(context, {
        environment: validEnvironment(),
        now,
        randomUUID,
        redis,
      }),
    ).resolves.toEqual({ allowed: false, reason: 'unavailable' })
    expect(redis.eval).not.toHaveBeenCalled()
  })

  it('swallows a release error and remains idempotent', async () => {
    const redis = fakeRedis([1, 0], new Error('release unavailable'))
    const permit = await authorizeReadinessAIRequest(context, {
      environment: validEnvironment(),
      redis,
    })

    expect(permit.allowed).toBe(true)
    if (!permit.allowed) throw new Error('Expected an allowed rate-limit permit.')

    await expect(permit.release()).resolves.toBeUndefined()
    await expect(permit.release()).resolves.toBeUndefined()
    expect(redis.eval).toHaveBeenCalledTimes(2)
  })
})

describe('readiness rejected-submission rate limiting', () => {
  it('fails open to the original rejection when Redis or a strong derivation secret is unavailable', async () => {
    await expect(
      recordReadinessRejectedSubmission(context, { environment: validEnvironment() }),
    ).resolves.toBe(false)

    const environment = validEnvironment()
    environment.READINESS_RATE_LIMIT_SECRET = 'too-short'
    const redis = fakeRedis(1)

    await expect(recordReadinessRejectedSubmission(context, { environment, redis })).resolves.toBe(
      false,
    )
    expect(redis.eval).not.toHaveBeenCalled()
  })

  it('atomically records one opaque trusted-IP counter with a conservative expiring default', async () => {
    const environment = validEnvironment()
    const redis = fakeRedis(0)

    await expect(recordReadinessRejectedSubmission(context, { environment, redis })).resolves.toBe(
      false,
    )

    expect(redis.eval).toHaveBeenCalledOnce()
    const call = redis.eval.mock.calls[0] as unknown[]
    expect(call[1]).toBe(1)
    expect(call[2]).toMatch(/^readiness:production:reject:ip:[A-Za-z0-9_-]{43}$/)
    expect(call.slice(3)).toEqual([4, 3_600])

    const serializedCall = JSON.stringify(call)
    expect(serializedCall).not.toContain(context.clientAddress)
    expect(serializedCall).not.toContain(context.anonymousToken)
    expect(serializedCall).not.toContain(environment.READINESS_RATE_LIMIT_SECRET)
  })

  it('does not let rotating client-generated tokens change reject-counter key cardinality', async () => {
    const redis = fakeRedis(0, 0)
    const firstContext = { ...context, anonymousToken: 'rotated-token-one-that-is-valid' }
    const secondContext = { ...context, anonymousToken: 'rotated-token-two-that-is-valid' }

    await recordReadinessRejectedSubmission(firstContext, {
      environment: validEnvironment(),
      redis,
    })
    await recordReadinessRejectedSubmission(secondContext, {
      environment: validEnvironment(),
      redis,
    })

    expect(redis.eval).toHaveBeenCalledTimes(2)
    const firstCall = redis.eval.mock.calls[0] as unknown[]
    const secondCall = redis.eval.mock.calls[1] as unknown[]
    expect(firstCall[1]).toBe(1)
    expect(secondCall[1]).toBe(1)
    expect(firstCall[2]).toBe(secondCall[2])
    expect(JSON.stringify(redis.eval.mock.calls)).not.toContain('rotated-token')
  })

  it('returns a limited decision only for the exact Redis limit signal', async () => {
    await expect(
      recordReadinessRejectedSubmission(context, {
        environment: validEnvironment(),
        redis: fakeRedis(1),
      }),
    ).resolves.toBe(true)

    for (const result of [2, '1', [1], null, new Error('reject counter unavailable')]) {
      await expect(
        recordReadinessRejectedSubmission(context, {
          environment: validEnvironment(),
          redis: fakeRedis(result),
        }),
      ).resolves.toBe(false)
    }
  })

  it('uses bounded defaults for invalid settings and accepts bounded overrides', async () => {
    const invalidEnvironment = {
      ...validEnvironment(),
      READINESS_REJECT_IP_LIMIT: '0',
      READINESS_REJECT_IP_WINDOW_SECONDS: '59',
    }
    const invalidRedis = fakeRedis(0)

    await recordReadinessRejectedSubmission(context, {
      environment: invalidEnvironment,
      redis: invalidRedis,
    })
    expect(invalidRedis.eval.mock.calls[0]?.slice(3)).toEqual([4, 3_600])

    const configuredEnvironment = {
      ...validEnvironment(),
      READINESS_REJECT_IP_LIMIT: '5',
      READINESS_REJECT_IP_WINDOW_SECONDS: '900',
    }
    const configuredRedis = fakeRedis(0)

    await recordReadinessRejectedSubmission(context, {
      environment: configuredEnvironment,
      redis: configuredRedis,
    })
    expect(configuredRedis.eval.mock.calls[0]?.slice(3)).toEqual([5, 900])
  })
})

describe('readiness client address extraction', () => {
  it.each(['203.0.113.10', '2001:db8::42'])(
    'accepts a syntactically valid production CF-Connecting-IP: %s',
    (address) => {
      const request = new Request('https://saberistic.example/api/readiness/assess', {
        headers: {
          'cf-connecting-ip': address,
          'x-forwarded-for': '198.51.100.99, 192.0.2.1',
        },
      })

      expect(clientAddressFromRequest(request, { NODE_ENV: 'production' })).toBe(address)
    },
  )

  it.each([undefined, '', 'not-an-ip', '203.0.113.10, 198.51.100.2'])(
    'rejects a missing or malformed production CF-Connecting-IP: %j',
    (address) => {
      const headers = new Headers({ 'x-forwarded-for': '203.0.113.200' })
      if (address !== undefined) headers.set('cf-connecting-ip', address)
      const request = new Request('https://saberistic.example/api/readiness/assess', { headers })

      expect(clientAddressFromRequest(request, { NODE_ENV: 'production' })).toBeNull()
    },
  )

  it('hashes the same trusted CF address identically despite different spoofed XFF chains', async () => {
    const environment = validEnvironment()
    const firstRequest = new Request('https://saberistic.example/api/readiness/assess', {
      headers: {
        'cf-connecting-ip': context.clientAddress,
        'x-forwarded-for': '198.51.100.1',
      },
    })
    const secondRequest = new Request('https://saberistic.example/api/readiness/assess', {
      headers: {
        'cf-connecting-ip': context.clientAddress,
        'x-forwarded-for': '192.0.2.250, 192.0.2.251',
      },
    })
    const firstAddress = clientAddressFromRequest(firstRequest, environment)
    const secondAddress = clientAddressFromRequest(secondRequest, environment)
    if (!firstAddress || !secondAddress) throw new Error('Expected trusted production addresses.')
    const firstRedis = fakeRedis(0)
    const secondRedis = fakeRedis(0)

    await recordReadinessRejectedSubmission(
      { clientAddress: firstAddress },
      { environment, redis: firstRedis },
    )
    await recordReadinessRejectedSubmission(
      { clientAddress: secondAddress },
      { environment, redis: secondRedis },
    )

    expect(firstRedis.eval.mock.calls[0]?.[2]).toBe(secondRedis.eval.mock.calls[0]?.[2])
  })

  it('uses one validated x-real-ip locally and otherwise falls back to loopback', () => {
    const localEnvironment: NodeJS.ProcessEnv = { NODE_ENV: 'development' }
    const realIPRequest = new Request('https://saberistic.example/api/readiness/assess', {
      headers: {
        'x-forwarded-for': '203.0.113.200',
        'x-real-ip': ' 192.0.2.5 ',
      },
    })
    const invalidRequest = new Request('https://saberistic.example/api/readiness/assess', {
      headers: { 'x-real-ip': 'not-an-ip' },
    })
    const directRequest = new Request('https://saberistic.example/api/readiness/assess')

    expect(clientAddressFromRequest(realIPRequest, localEnvironment)).toBe('192.0.2.5')
    expect(clientAddressFromRequest(invalidRequest, localEnvironment)).toBe('127.0.0.1')
    expect(clientAddressFromRequest(directRequest, localEnvironment)).toBe('127.0.0.1')
  })
})
