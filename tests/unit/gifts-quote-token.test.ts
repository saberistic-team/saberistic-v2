import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import type { GiftQuoteClaim } from '@/lib/gifts'
import { createGiftQuoteToken, verifyGiftQuoteToken } from '@/lib/gifts/server/quote-token'

const nowMs = 1_800_000_000_000
const quoteSecret = 'test-gift-quote-secret-that-is-at-least-32-characters'

const quoteInput: Omit<GiftQuoteClaim, 'expiresAt' | 'issuedAt' | 'version'> = {
  amountCents: 12_345,
  category: 'Desk life',
  currency: 'usd',
  itemName: 'Machined aluminum desk organizer',
  offerId: 'offer_12345678',
  retailer: 'Example Maker',
  runId: 'run_1234567890123456',
  sourceUrl: 'https://maker.example/products/desk-organizer',
}

function environment(overrides: Partial<NodeJS.ProcessEnv> = {}): NodeJS.ProcessEnv {
  return {
    GIFT_QUOTE_SECRET: quoteSecret,
    GIFT_QUOTE_TTL_SECONDS: '900',
    NODE_ENV: 'test',
    ...overrides,
  }
}

function requiredToken(
  tokenEnvironment: NodeJS.ProcessEnv = environment(),
  issuedAt: number = nowMs,
): string {
  const token = createGiftQuoteToken(quoteInput, tokenEnvironment, issuedAt)
  if (!token) throw new Error('Expected a signed gift quote fixture.')
  return token
}

function mutate(value: string): string {
  return `${value[0] === 'A' ? 'B' : 'A'}${value.slice(1)}`
}

describe('gift quote tokens', () => {
  it('round trips the server-approved amount and listing snapshot', () => {
    const verification = verifyGiftQuoteToken(requiredToken(), environment(), nowMs)

    expect(verification).toEqual({
      ...quoteInput,
      expiresAt: Math.floor(nowMs / 1_000) + 900,
      issuedAt: Math.floor(nowMs / 1_000),
      version: 1,
    })
  })

  it.each(['payload', 'signature'] as const)('rejects a tampered %s', (segment) => {
    const parts = requiredToken().split('.')
    const index = segment === 'payload' ? 1 : 2
    parts[index] = mutate(parts[index] ?? '')

    expect(verifyGiftQuoteToken(parts.join('.'), environment(), nowMs)).toBeNull()
  })

  it('accepts the quote through its expiry second and rejects it afterward', () => {
    const token = requiredToken()
    const expiresAtMs = nowMs + 900_000

    expect(verifyGiftQuoteToken(token, environment(), expiresAtMs)).not.toBeNull()
    expect(verifyGiftQuoteToken(token, environment(), expiresAtMs + 1_000)).toBeNull()
  })

  it('rejects the token under a different signing secret', () => {
    expect(
      verifyGiftQuoteToken(
        requiredToken(),
        environment({
          GIFT_QUOTE_SECRET: 'different-gift-quote-secret-that-is-also-long-enough',
        }),
        nowMs,
      ),
    ).toBeNull()
  })

  it.each([undefined, '', 'too-short', 'replace-with-a-long-placeholder-secret-value'])(
    'does not issue a quote with an unavailable secret: %j',
    (secret) => {
      const tokenEnvironment: NodeJS.ProcessEnv = { NODE_ENV: 'test' }
      if (secret !== undefined) tokenEnvironment.GIFT_QUOTE_SECRET = secret

      expect(createGiftQuoteToken(quoteInput, tokenEnvironment, nowMs)).toBeNull()
    },
  )
})
