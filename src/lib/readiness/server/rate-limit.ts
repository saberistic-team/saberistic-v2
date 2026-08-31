import 'server-only'

import { createHmac, randomUUID } from 'node:crypto'
import { isIP } from 'node:net'

import Redis from 'ioredis'

type LimitReason = 'concurrency' | 'daily' | 'ip' | 'token' | 'unavailable'

export type AIRequestPermit =
  { allowed: false; reason: LimitReason } | { allowed: true; release: () => Promise<void> }

type RedisLike = {
  eval: (script: string, numberOfKeys: number, ...args: Array<number | string>) => Promise<unknown>
}

type RateLimitContext = {
  anonymousToken: string
  clientAddress: string
}

type RejectedSubmissionContext = {
  clientAddress: string
}

type RateLimitOptions = {
  environment?: NodeJS.ProcessEnv
  now?: () => number
  randomUUID?: () => string
  redis?: RedisLike
}

const admitAIRequestScript = `
local windowKeyCount = 3
for index = 1, windowKeyCount do
  local current = tonumber(redis.call('GET', KEYS[index]) or '0')
  local limit = tonumber(ARGV[(index - 1) * 2 + 1])
  if current >= limit then
    return {0, index}
  end
end

local concurrencyKey = KEYS[windowKeyCount + 1]
local concurrencyLimit = tonumber(ARGV[windowKeyCount * 2 + 1])
local now = tonumber(ARGV[windowKeyCount * 2 + 2])
local leaseExpiresAt = tonumber(ARGV[windowKeyCount * 2 + 3])
local leaseId = ARGV[windowKeyCount * 2 + 4]
redis.call('ZREMRANGEBYSCORE', concurrencyKey, '-inf', now)
local currentConcurrency = redis.call('ZCARD', concurrencyKey)
if currentConcurrency >= concurrencyLimit then
  return {0, windowKeyCount + 1}
end

local reserved = redis.call('ZADD', concurrencyKey, 'NX', leaseExpiresAt, leaseId)
if reserved ~= 1 then
  return {0, windowKeyCount + 2}
end
redis.call('EXPIRE', concurrencyKey, 60)

for index = 1, windowKeyCount do
  local value = redis.call('INCR', KEYS[index])
  if value == 1 then
    redis.call('EXPIRE', KEYS[index], tonumber(ARGV[(index - 1) * 2 + 2]))
  end
end
return {1, 0}
`

const releaseConcurrencyScript = `
return redis.call('ZREM', KEYS[1], ARGV[1])
`

const recordRejectedSubmissionScript = `
local value = redis.call('INCR', KEYS[1])
if value == 1 then
  redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2]))
end
return value > tonumber(ARGV[1]) and 1 or 0
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

function hmacKey(secret: string, namespace: string, value: string) {
  return createHmac('sha256', secret).update(`${namespace}:${value}`).digest('base64url')
}

function rateLimitSecret(environment: NodeJS.ProcessEnv): string | null {
  const secret = environment.READINESS_RATE_LIMIT_SECRET?.trim()
  return secret && secret.length >= 32 && !secret.startsWith('replace-with-') ? secret : null
}

function rateLimitPrefix(environment: NodeJS.ProcessEnv): string {
  return `readiness:${environment.NODE_ENV === 'production' ? 'production' : 'nonproduction'}`
}

function getRedis(environment: NodeJS.ProcessEnv): RedisLike | null {
  const redisURL = environment.REDIS_URL?.trim()
  if (!redisURL) return null

  if (sharedRedis && sharedRedisURL === redisURL) return sharedRedis

  if (sharedRedis) sharedRedis.disconnect()

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

function parseAdmissionResult(value: unknown): number | null {
  if (
    !Array.isArray(value) ||
    value.length < 2 ||
    typeof value[0] !== 'number' ||
    typeof value[1] !== 'number'
  ) {
    return null
  }
  const allowed = value[0]
  const failedIndex = value[1]
  if ((allowed !== 0 && allowed !== 1) || !Number.isInteger(failedIndex)) return null
  if (allowed === 1) return failedIndex === 0 ? 0 : null
  return failedIndex >= 1 && failedIndex <= 4 ? failedIndex : null
}

export function clientAddressFromRequest(
  request: Request,
  environment: NodeJS.ProcessEnv = process.env,
): string | null {
  if (environment.NODE_ENV === 'production') {
    const address = request.headers.get('cf-connecting-ip')?.trim()
    return address && isIP(address) !== 0 ? address : null
  }

  const localAddress = request.headers.get('x-real-ip')?.trim()
  // Direct Next.js development requests have no trusted proxy header; share one local-only bucket.
  return localAddress && isIP(localAddress) !== 0 ? localAddress : '127.0.0.1'
}

export async function authorizeReadinessAIRequest(
  context: RateLimitContext,
  {
    environment = process.env,
    now = Date.now,
    randomUUID: createLeaseId = randomUUID,
    redis = getRedis(environment) ?? undefined,
  }: RateLimitOptions = {},
): Promise<AIRequestPermit> {
  const secret = rateLimitSecret(environment)
  if (!redis || !secret) {
    return { allowed: false, reason: 'unavailable' }
  }

  const prefix = rateLimitPrefix(environment)
  const ipKey = hmacKey(secret, 'ip', context.clientAddress)
  const tokenKey = hmacKey(secret, 'token', context.anonymousToken)
  const limits = {
    concurrency: integerSetting(environment.READINESS_AI_CONCURRENCY_LIMIT, 3, 1, 20),
    daily: integerSetting(environment.READINESS_AI_DAILY_LIMIT, 200, 1, 10_000),
    ip: integerSetting(environment.READINESS_AI_IP_LIMIT, 8, 1, 100),
    token: integerSetting(environment.READINESS_AI_TOKEN_LIMIT, 4, 1, 50),
  }
  let nowMs: number
  let leaseId: string
  try {
    nowMs = now()
    leaseId = createLeaseId()
  } catch {
    return { allowed: false, reason: 'unavailable' }
  }
  const leaseExpiresAt = nowMs + 45_000
  if (
    !Number.isSafeInteger(nowMs) ||
    nowMs < 0 ||
    !Number.isSafeInteger(leaseExpiresAt) ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(leaseId)
  ) {
    return { allowed: false, reason: 'unavailable' }
  }

  try {
    const admissionResult = parseAdmissionResult(
      await redis.eval(
        admitAIRequestScript,
        4,
        `${prefix}:ip:${ipKey}`,
        `${prefix}:token:${tokenKey}`,
        `${prefix}:daily`,
        `${prefix}:concurrency`,
        limits.ip,
        60 * 60,
        limits.token,
        6 * 60 * 60,
        limits.daily,
        24 * 60 * 60,
        limits.concurrency,
        nowMs,
        leaseExpiresAt,
        leaseId,
      ),
    )

    if (admissionResult === null) return { allowed: false, reason: 'unavailable' }
    if (admissionResult === 1) return { allowed: false, reason: 'ip' }
    if (admissionResult === 2) return { allowed: false, reason: 'token' }
    if (admissionResult === 3) return { allowed: false, reason: 'daily' }
    if (admissionResult === 4) return { allowed: false, reason: 'concurrency' }

    let released = false

    return {
      allowed: true,
      release: async () => {
        if (released) return
        released = true
        try {
          await redis.eval(releaseConcurrencyScript, 1, `${prefix}:concurrency`, leaseId)
        } catch {
          // The short expiry is the final cleanup boundary if release cannot reach Key Value.
        }
      },
    }
  } catch {
    return { allowed: false, reason: 'unavailable' }
  }
}

export async function recordReadinessRejectedSubmission(
  context: RejectedSubmissionContext,
  { environment = process.env, redis = getRedis(environment) ?? undefined }: RateLimitOptions = {},
): Promise<boolean> {
  const secret = rateLimitSecret(environment)
  if (!redis || !secret) return false

  const prefix = rateLimitPrefix(environment)
  const key = `${prefix}:reject:ip:${hmacKey(secret, 'reject-ip', context.clientAddress)}`
  const limit = integerSetting(environment.READINESS_REJECT_IP_LIMIT, 4, 1, 50)
  const windowSeconds = integerSetting(
    environment.READINESS_REJECT_IP_WINDOW_SECONDS,
    60 * 60,
    60,
    24 * 60 * 60,
  )

  try {
    const result = await redis.eval(recordRejectedSubmissionScript, 1, key, limit, windowSeconds)
    return result === 1
  } catch {
    return false
  }
}

export function disconnectReadinessRateLimitClient() {
  sharedRedis?.disconnect()
  sharedRedis = null
  sharedRedisURL = null
}
