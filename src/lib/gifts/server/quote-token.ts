import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

import { safeGiftSourceURL } from '../validation'
import type { GiftQuoteClaim } from '../types'

const tokenVersion = 'gq1'
const defaultTTLSeconds = 2 * 60 * 60

function secretFromEnvironment(environment: NodeJS.ProcessEnv): string | null {
  const secret = environment.GIFT_QUOTE_SECRET?.trim()
  return secret && secret.length >= 32 && !secret.startsWith('replace-with-') ? secret : null
}

function boundedTTL(value: string | undefined): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 900 && parsed <= 86_400 ? parsed : defaultTTLSeconds
}

function encode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function signature(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(`${tokenVersion}.${payload}`).digest('base64url')
}

function isSafeClaim(value: unknown): value is GiftQuoteClaim {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const claim = value as Partial<GiftQuoteClaim>

  return (
    claim.version === 1 &&
    claim.currency === 'usd' &&
    Number.isSafeInteger(claim.amountCents) &&
    Number(claim.amountCents) >= 1_000 &&
    Number(claim.amountCents) <= 30_000 &&
    Number.isSafeInteger(claim.issuedAt) &&
    Number.isSafeInteger(claim.expiresAt) &&
    Number(claim.expiresAt) > Number(claim.issuedAt) &&
    typeof claim.offerId === 'string' &&
    /^[A-Za-z0-9_-]{8,120}$/.test(claim.offerId) &&
    typeof claim.runId === 'string' &&
    /^[A-Za-z0-9_-]{16,160}$/.test(claim.runId) &&
    typeof claim.itemName === 'string' &&
    claim.itemName.length >= 3 &&
    claim.itemName.length <= 120 &&
    typeof claim.category === 'string' &&
    claim.category.length >= 2 &&
    claim.category.length <= 50 &&
    typeof claim.retailer === 'string' &&
    claim.retailer.length >= 2 &&
    claim.retailer.length <= 80 &&
    safeGiftSourceURL(claim.sourceUrl) !== null
  )
}

export function createGiftQuoteToken(
  input: Omit<GiftQuoteClaim, 'expiresAt' | 'issuedAt' | 'version'>,
  environment: NodeJS.ProcessEnv = process.env,
  nowMs: number = Date.now(),
): string | null {
  const secret = secretFromEnvironment(environment)
  if (!secret || !Number.isSafeInteger(nowMs) || nowMs < 0) return null

  const issuedAt = Math.floor(nowMs / 1000)
  const claim: GiftQuoteClaim = {
    ...input,
    expiresAt: issuedAt + boundedTTL(environment.GIFT_QUOTE_TTL_SECONDS),
    issuedAt,
    version: 1,
  }
  if (!isSafeClaim(claim)) return null

  const payload = encode(JSON.stringify(claim))
  return `${tokenVersion}.${payload}.${signature(payload, secret)}`
}

export function verifyGiftQuoteToken(
  token: string,
  environment: NodeJS.ProcessEnv = process.env,
  nowMs: number = Date.now(),
): GiftQuoteClaim | null {
  const secret = secretFromEnvironment(environment)
  if (!secret || token.length > 4_000 || !Number.isSafeInteger(nowMs) || nowMs < 0) return null

  const parts = token.split('.')
  if (parts.length !== 3 || parts[0] !== tokenVersion || !parts[1] || !parts[2]) return null

  const expected = Buffer.from(signature(parts[1], secret))
  const received = Buffer.from(parts[2])
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
  } catch {
    return null
  }

  if (!isSafeClaim(parsed) || parsed.expiresAt < Math.floor(nowMs / 1000)) return null
  return parsed
}
