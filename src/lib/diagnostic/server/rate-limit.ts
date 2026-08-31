import 'server-only'

import { createHmac } from 'node:crypto'
import { isIP } from 'node:net'

import Redis from 'ioredis'

type RedisLike = {
  eval: (script: string, numberOfKeys: number, ...args: Array<number | string>) => Promise<unknown>
}

type DiagnosticRateLimitOptions = {
  environment?: NodeJS.ProcessEnv
  redis?: RedisLike
}

export type DiagnosticRateLimitResult =
  { allowed: true } | { allowed: false; reason: 'daily' | 'ip' | 'token' | 'unavailable' }

const admissionScript = `
local keyCount = 3
for index = 1, keyCount do
  local current = tonumber(redis.call('GET', KEYS[index]) or '0')
  local limit = tonumber(ARGV[(index - 1) * 2 + 1])
  if current >= limit then
    return index
  end
end
for index = 1, keyCount do
  local value = redis.call('INCR', KEYS[index])
  if value == 1 then
    redis.call('EXPIRE', KEYS[index], tonumber(ARGV[(index - 1) * 2 + 2]))
  end
end
return 0
`

let sharedRedis: Redis | null = null
let sharedRedisUrl: string | null = null

function integerSetting(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback
}

function configuredSecret(environment: NodeJS.ProcessEnv): string | null {
  const secret = environment.DIAGNOSTIC_RATE_LIMIT_SECRET?.trim()
  return secret && secret.length >= 32 && !secret.startsWith('replace-with-') ? secret : null
}

function opaqueKey(secret: string, namespace: string, value: string): string {
  return createHmac('sha256', secret).update(`${namespace}:${value}`).digest('base64url')
}

function redisClient(environment: NodeJS.ProcessEnv): RedisLike | null {
  const url = environment.REDIS_URL?.trim()
  if (!url) return null
  if (sharedRedis && sharedRedisUrl === url) return sharedRedis

  sharedRedis?.disconnect()
  sharedRedis = new Redis(url, {
    commandTimeout: 2_000,
    connectTimeout: 2_000,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  })
  sharedRedis.on('error', () => undefined)
  sharedRedisUrl = url
  return sharedRedis
}

export function diagnosticClientAddress(
  request: Request,
  environment: NodeJS.ProcessEnv = process.env,
): string | null {
  if (environment.NODE_ENV === 'production') {
    const address = request.headers.get('cf-connecting-ip')?.trim()
    return address && isIP(address) !== 0 ? address : null
  }

  const address = request.headers.get('x-real-ip')?.trim()
  return address && isIP(address) !== 0 ? address : '127.0.0.1'
}

export async function authorizeDiagnosticRequest(
  context: { anonymousToken: string; clientAddress: string },
  options: DiagnosticRateLimitOptions = {},
): Promise<DiagnosticRateLimitResult> {
  const environment = options.environment ?? process.env
  const redis = options.redis ?? redisClient(environment)
  const secret = configuredSecret(environment)
  if (!redis || !secret) return { allowed: false, reason: 'unavailable' }

  const deployment = environment.NODE_ENV === 'production' ? 'production' : 'nonproduction'
  const prefix = `diagnostic:${deployment}`
  const limits = {
    daily: integerSetting(environment.DIAGNOSTIC_DAILY_LIMIT, 100, 1, 10_000),
    ip: integerSetting(environment.DIAGNOSTIC_IP_LIMIT, 5, 1, 100),
    token: integerSetting(environment.DIAGNOSTIC_TOKEN_LIMIT, 3, 1, 50),
  }

  try {
    const result = await redis.eval(
      admissionScript,
      3,
      `${prefix}:ip:${opaqueKey(secret, 'ip', context.clientAddress)}`,
      `${prefix}:token:${opaqueKey(secret, 'token', context.anonymousToken)}`,
      `${prefix}:daily`,
      limits.ip,
      60 * 60,
      limits.token,
      24 * 60 * 60,
      limits.daily,
      24 * 60 * 60,
    )

    if (result === 0) return { allowed: true }
    if (result === 1) return { allowed: false, reason: 'ip' }
    if (result === 2) return { allowed: false, reason: 'token' }
    if (result === 3) return { allowed: false, reason: 'daily' }
    return { allowed: false, reason: 'unavailable' }
  } catch {
    return { allowed: false, reason: 'unavailable' }
  }
}

export function disconnectDiagnosticRateLimitClient(): void {
  sharedRedis?.disconnect()
  sharedRedis = null
  sharedRedisUrl = null
}
