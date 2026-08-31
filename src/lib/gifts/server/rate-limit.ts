import 'server-only'

import { createHmac, randomUUID } from 'node:crypto'

import Redis from 'ioredis'

export type GiftRequestPermit =
  | { allowed: false; reason: 'concurrency' | 'daily' | 'ip' | 'token' | 'unavailable' }
  | { allowed: true; release: () => Promise<void> }

export type GiftCheckoutPermit =
  { allowed: false; reason: 'ip' | 'quote' | 'unavailable' } | { allowed: true }

export type GiftPaymentStatusPermit =
  { allowed: false; reason: 'ip' | 'unavailable' } | { allowed: true }

type RedisLike = {
  eval: (script: string, numberOfKeys: number, ...args: Array<number | string>) => Promise<unknown>
}

type RateLimitOptions = {
  environment?: NodeJS.ProcessEnv
  now?: () => number
  randomUUID?: () => string
  redis?: RedisLike
}

const admitScript = `
local windowKeyCount = 3
for index = 1, windowKeyCount do
  local current = tonumber(redis.call('GET', KEYS[index]) or '0')
  local limit = tonumber(ARGV[(index - 1) * 2 + 1])
  if current >= limit then
    return {0, index}
  end
end

local concurrencyKey = KEYS[4]
local now = tonumber(ARGV[7])
local leaseExpiresAt = tonumber(ARGV[8])
local concurrencyLimit = tonumber(ARGV[9])
local leaseId = ARGV[10]
redis.call('ZREMRANGEBYSCORE', concurrencyKey, '-inf', now)
if redis.call('ZCARD', concurrencyKey) >= concurrencyLimit then
  return {0, 4}
end
if redis.call('ZADD', concurrencyKey, 'NX', leaseExpiresAt, leaseId) ~= 1 then
  return {0, 5}
end
redis.call('EXPIRE', concurrencyKey, 90)

for index = 1, windowKeyCount do
  local value = redis.call('INCR', KEYS[index])
  if value == 1 then
    redis.call('EXPIRE', KEYS[index], tonumber(ARGV[(index - 1) * 2 + 2]))
  end
end
return {1, 0}
`

const releaseScript = `return redis.call('ZREM', KEYS[1], ARGV[1])`

const checkoutAdmitScript = `
for index = 1, 2 do
  local current = tonumber(redis.call('GET', KEYS[index]) or '0')
  local limit = tonumber(ARGV[index])
  if current >= limit then
    return {0, index}
  end
end

for index = 1, 2 do
  local value = redis.call('INCR', KEYS[index])
  if value == 1 then
    redis.call('EXPIRE', KEYS[index], tonumber(ARGV[3]))
  end
end
return {1, 0}
`

const statusAdmitScript = `
local current = tonumber(redis.call('GET', KEYS[1]) or '0')
local limit = tonumber(ARGV[1])
if current >= limit then
  return 0
end
local value = redis.call('INCR', KEYS[1])
if value == 1 then
  redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2]))
end
return 1
`

let sharedRedis: Redis | null = null
let sharedRedisURL: string | null = null

function integerSetting(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback
}

function rateLimitSecret(environment: NodeJS.ProcessEnv): string | null {
  const secret = environment.GIFTING_RATE_LIMIT_SECRET?.trim()
  return secret && secret.length >= 32 && !secret.startsWith('replace-with-') ? secret : null
}

function getRedis(environment: NodeJS.ProcessEnv): RedisLike | null {
  const redisURL = environment.REDIS_URL?.trim()
  if (!redisURL) return null
  if (sharedRedis && sharedRedisURL === redisURL) return sharedRedis

  sharedRedis?.disconnect()
  sharedRedis = new Redis(redisURL, {
    commandTimeout: 2_000,
    connectTimeout: 2_000,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  })
  sharedRedis.on('error', () => undefined)
  sharedRedisURL = redisURL
  return sharedRedis
}

function hmacKey(secret: string, namespace: string, value: string): string {
  return createHmac('sha256', secret).update(`${namespace}:${value}`).digest('base64url')
}

function parseAdmission(value: unknown): number | null {
  if (
    !Array.isArray(value) ||
    value.length < 2 ||
    typeof value[0] !== 'number' ||
    typeof value[1] !== 'number'
  ) {
    return null
  }
  if (value[0] === 1 && value[1] === 0) return 0
  if (value[0] === 0 && Number.isInteger(value[1]) && value[1] >= 1 && value[1] <= 4) {
    return value[1]
  }
  return null
}

export async function authorizeGiftRequest(
  context: { anonymousToken: string; clientAddress: string },
  {
    environment = process.env,
    now = Date.now,
    randomUUID: createLeaseId = randomUUID,
    redis = getRedis(environment) ?? undefined,
  }: RateLimitOptions = {},
): Promise<GiftRequestPermit> {
  const secret = rateLimitSecret(environment)
  if (!redis || !secret) return { allowed: false, reason: 'unavailable' }

  const nowMs = now()
  const leaseId = createLeaseId()
  const leaseExpiresAt = nowMs + 60_000
  if (
    !Number.isSafeInteger(nowMs) ||
    nowMs < 0 ||
    !Number.isSafeInteger(leaseExpiresAt) ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(leaseId)
  ) {
    return { allowed: false, reason: 'unavailable' }
  }

  const prefix = `gifts:${environment.NODE_ENV === 'production' ? 'production' : 'nonproduction'}`
  const limits = {
    concurrency: integerSetting(environment.GIFTING_CONCURRENCY_LIMIT, 2, 1, 10),
    daily: integerSetting(environment.GIFTING_DAILY_LIMIT, 100, 1, 5_000),
    ip: integerSetting(environment.GIFTING_IP_LIMIT, 8, 1, 100),
    token: integerSetting(environment.GIFTING_TOKEN_LIMIT, 4, 1, 50),
  }

  try {
    const result = parseAdmission(
      await redis.eval(
        admitScript,
        4,
        `${prefix}:ip:${hmacKey(secret, 'ip', context.clientAddress)}`,
        `${prefix}:token:${hmacKey(secret, 'token', context.anonymousToken)}`,
        `${prefix}:daily`,
        `${prefix}:concurrency`,
        limits.ip,
        60 * 60,
        limits.token,
        6 * 60 * 60,
        limits.daily,
        24 * 60 * 60,
        nowMs,
        leaseExpiresAt,
        limits.concurrency,
        leaseId,
      ),
    )

    if (result === null) return { allowed: false, reason: 'unavailable' }
    if (result === 1) return { allowed: false, reason: 'ip' }
    if (result === 2) return { allowed: false, reason: 'token' }
    if (result === 3) return { allowed: false, reason: 'daily' }
    if (result === 4) return { allowed: false, reason: 'concurrency' }

    let released = false
    return {
      allowed: true,
      release: async () => {
        if (released) return
        released = true
        try {
          await redis.eval(releaseScript, 1, `${prefix}:concurrency`, leaseId)
        } catch {
          // The lease expiry is the cleanup fallback.
        }
      },
    }
  } catch {
    return { allowed: false, reason: 'unavailable' }
  }
}

export async function authorizeGiftCheckout(
  context: { clientAddress: string; quoteToken: string },
  {
    environment = process.env,
    redis = getRedis(environment) ?? undefined,
  }: Pick<RateLimitOptions, 'environment' | 'redis'> = {},
): Promise<GiftCheckoutPermit> {
  const secret = rateLimitSecret(environment)
  if (!redis || !secret) return { allowed: false, reason: 'unavailable' }

  const prefix = `gifts:${environment.NODE_ENV === 'production' ? 'production' : 'nonproduction'}:checkout`
  const limits = {
    ip: integerSetting(environment.GIFTING_CHECKOUT_IP_LIMIT, 20, 1, 200),
    quote: integerSetting(environment.GIFTING_CHECKOUT_QUOTE_LIMIT, 5, 1, 20),
  }

  try {
    const result = await redis.eval(
      checkoutAdmitScript,
      2,
      `${prefix}:ip:${hmacKey(secret, 'checkout-ip', context.clientAddress)}`,
      `${prefix}:quote:${hmacKey(secret, 'checkout-quote', context.quoteToken)}`,
      limits.ip,
      limits.quote,
      60 * 60,
    )
    if (!Array.isArray(result) || result.length < 2 || result[0] !== 1) {
      if (Array.isArray(result) && result[0] === 0 && result[1] === 1) {
        return { allowed: false, reason: 'ip' }
      }
      if (Array.isArray(result) && result[0] === 0 && result[1] === 2) {
        return { allowed: false, reason: 'quote' }
      }
      return { allowed: false, reason: 'unavailable' }
    }

    return { allowed: true }
  } catch {
    return { allowed: false, reason: 'unavailable' }
  }
}

export async function authorizeGiftPaymentStatus(
  context: { clientAddress: string },
  {
    environment = process.env,
    redis = getRedis(environment) ?? undefined,
  }: Pick<RateLimitOptions, 'environment' | 'redis'> = {},
): Promise<GiftPaymentStatusPermit> {
  const secret = rateLimitSecret(environment)
  if (!redis || !secret) return { allowed: false, reason: 'unavailable' }

  const prefix = `gifts:${environment.NODE_ENV === 'production' ? 'production' : 'nonproduction'}:status`
  const limit = integerSetting(environment.GIFTING_STATUS_IP_LIMIT, 30, 1, 300)

  try {
    const result = await redis.eval(
      statusAdmitScript,
      1,
      `${prefix}:ip:${hmacKey(secret, 'status-ip', context.clientAddress)}`,
      limit,
      60 * 60,
    )
    if (result === 1) return { allowed: true }
    if (result === 0) return { allowed: false, reason: 'ip' }
    return { allowed: false, reason: 'unavailable' }
  } catch {
    return { allowed: false, reason: 'unavailable' }
  }
}

export function disconnectGiftRateLimitClient() {
  sharedRedis?.disconnect()
  sharedRedis = null
  sharedRedisURL = null
}
