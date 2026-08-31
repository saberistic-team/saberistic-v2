import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  createDeterministicReadinessReport,
  readinessPolicyVersion,
  readinessQuestionsV1,
  scoreReadiness,
  type ReadinessAnswers,
  type ReadinessManifest,
  type ReadinessReport,
} from '@/lib/readiness'
import {
  createReadinessHandoffToken,
  readinessReportDigest,
  verifyReadinessHandoffToken,
  verifyReadinessReportHandoff,
} from '@/lib/readiness/server/handoff-token'

const reportId = '123e4567-e89b-42d3-a456-426614174000'
const nowMs = 1_800_000_000_000
const secret = 'test-handoff-secret-that-is-at-least-32-characters'

function environment(overrides: Partial<NodeJS.ProcessEnv> = {}): NodeJS.ProcessEnv {
  return {
    ...overrides,
    NODE_ENV: overrides.NODE_ENV ?? 'test',
    READINESS_HANDOFF_SECRET: overrides.READINESS_HANDOFF_SECRET ?? secret,
  }
}

function report(): ReadinessReport {
  const answers = Object.fromEntries(
    readinessQuestionsV1.map((question) => [question.id, question.options[0]?.value]),
  ) as ReadinessAnswers
  const manifest: ReadinessManifest = {
    answers,
    policyVersion: readinessPolicyVersion,
    profile: 'ai_saas',
  }
  const policyResult = scoreReadiness(manifest)
  return createDeterministicReadinessReport(manifest, policyResult)
}

function requiredToken(
  tokenEnvironment: NodeJS.ProcessEnv = environment(),
  issuedAt = nowMs,
): string {
  const token = createReadinessHandoffToken(reportId, report(), tokenEnvironment, issuedAt)
  if (!token) throw new Error('Expected a handoff token for the test fixture.')
  return token
}

function mutateSegment(segment: string): string {
  const first = segment[0]
  return `${first === 'A' ? 'B' : 'A'}${segment.slice(1)}`
}

function addNonCanonicalBase64URLPadBits(segment: string): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
  const last = segment.at(-1)
  const index = last ? alphabet.indexOf(last) : -1
  if (index < 0 || index % 4 !== 0) throw new Error('Expected a canonical 32-byte signature.')
  return `${segment.slice(0, -1)}${alphabet[index + 1]}`
}

describe('readiness handoff tokens', () => {
  it('round trips only the minimal signed report claims', () => {
    const readinessReport = report()
    const token = createReadinessHandoffToken(reportId, readinessReport, environment(), nowMs)

    expect(token).toEqual(expect.any(String))
    const verification = verifyReadinessHandoffToken(String(token), environment(), nowMs)

    expect(verification).toEqual({
      claims: {
        blockerIds: readinessReport.blockers.map((blocker) => blocker.ruleId),
        expiresAt: Math.floor(nowMs / 1_000) + 30 * 60,
        issuedAt: Math.floor(nowMs / 1_000),
        level: readinessReport.level,
        policyVersion: readinessPolicyVersion,
        reportDigest: readinessReportDigest(readinessReport),
        reportId,
        version: 2,
      },
      ok: true,
    })
    expect(JSON.stringify(verification)).not.toContain(readinessReport.summary)
    expect(JSON.stringify(verification)).not.toContain(readinessReport.disclaimer)
  })

  it.each(['payload', 'signature'] as const)('rejects a tampered %s', (part) => {
    const tokenParts = requiredToken().split('.')
    const index = part === 'payload' ? 1 : 2
    tokenParts[index] = mutateSegment(tokenParts[index] ?? '')

    expect(verifyReadinessHandoffToken(tokenParts.join('.'), environment(), nowMs)).toEqual({
      ok: false,
      reason: 'invalid',
    })
  })

  it('rejects a valid token under a different secret', () => {
    const token = requiredToken()

    expect(
      verifyReadinessHandoffToken(
        token,
        environment({
          NODE_ENV: 'test',
          READINESS_HANDOFF_SECRET: 'different-test-secret-that-is-also-long-enough',
        }),
        nowMs,
      ),
    ).toEqual({ ok: false, reason: 'invalid' })
  })

  it('rejects a non-canonical base64url encoding of the valid signature bytes', () => {
    const parts = requiredToken().split('.')
    parts[2] = addNonCanonicalBase64URLPadBits(parts[2] ?? '')

    expect(verifyReadinessHandoffToken(parts.join('.'), environment(), nowMs)).toEqual({
      ok: false,
      reason: 'invalid',
    })
  })

  it.each(['', 'v1.payload.signature', 'v2.payload', 'v2..signature', 'v2.payload.'])(
    'rejects a malformed token: %j',
    (token) => {
      expect(verifyReadinessHandoffToken(token, environment(), nowMs)).toEqual({
        ok: false,
        reason: 'invalid',
      })
    },
  )

  it('binds the exact report snapshot without putting its prose in the token', () => {
    const readinessReport = report()
    const token = createReadinessHandoffToken(reportId, readinessReport, environment(), nowMs)
    if (!token) throw new Error('Expected a handoff token for the test fixture.')

    expect(verifyReadinessReportHandoff(token, readinessReport, environment(), nowMs).ok).toBe(true)
    expect(
      verifyReadinessReportHandoff(
        token,
        { ...readinessReport, summary: `${readinessReport.summary} Tampered.` },
        environment(),
        nowMs,
      ),
    ).toEqual({ ok: false, reason: 'report_mismatch' })
    expect(token).not.toContain(readinessReport.summary)
  })

  it('rejects an expired token', () => {
    const tokenEnvironment = environment({
      NODE_ENV: 'test',
      READINESS_HANDOFF_SECRET: secret,
      READINESS_HANDOFF_TOKEN_TTL_SECONDS: '300',
    })
    const token = requiredToken(tokenEnvironment)

    expect(verifyReadinessHandoffToken(token, tokenEnvironment, nowMs + 300_000)).toEqual({
      ok: false,
      reason: 'expired',
    })
  })

  it('allows only the documented clock skew for a future issue time', () => {
    const withinSkew = requiredToken(environment(), nowMs + 60_000)
    const beyondSkew = requiredToken(environment(), nowMs + 61_000)

    expect(verifyReadinessHandoffToken(withinSkew, environment(), nowMs).ok).toBe(true)
    expect(verifyReadinessHandoffToken(beyondSkew, environment(), nowMs)).toEqual({
      ok: false,
      reason: 'expired',
    })
  })

  it.each([undefined, '', 'short-secret', 'replace-with-a-real-secret-that-is-long-enough'])(
    'does not create a token with a weak secret: %j',
    (value) => {
      const tokenEnvironment: NodeJS.ProcessEnv = { NODE_ENV: 'test' }
      if (value !== undefined) tokenEnvironment.READINESS_HANDOFF_SECRET = value

      expect(createReadinessHandoffToken(reportId, report(), tokenEnvironment, nowMs)).toBeNull()
    },
  )

  it('reports verification unavailable when the secret is missing or weak', () => {
    const token = requiredToken()

    expect(verifyReadinessHandoffToken(token, { NODE_ENV: 'test' }, nowMs)).toEqual({
      ok: false,
      reason: 'unavailable',
    })
    expect(
      verifyReadinessHandoffToken(
        token,
        { NODE_ENV: 'test', READINESS_HANDOFF_SECRET: 'too-short' },
        nowMs,
      ),
    ).toEqual({ ok: false, reason: 'unavailable' })
    expect(
      verifyReadinessHandoffToken(
        token,
        {
          NODE_ENV: 'test',
          READINESS_HANDOFF_SECRET: 'replace-with-a-real-secret-that-is-long-enough',
        },
        nowMs,
      ),
    ).toEqual({ ok: false, reason: 'unavailable' })
  })

  it.each([`v2.${'A'.repeat(4_050)}.${'B'.repeat(50)}`, `${requiredToken()}!`])(
    'rejects an oversized or non-base64url token',
    (token) => {
      expect(verifyReadinessHandoffToken(token, environment(), nowMs)).toEqual({
        ok: false,
        reason: 'invalid',
      })
    },
  )

  it.each([
    { configured: undefined, expected: 1_800 },
    { configured: '299', expected: 1_800 },
    { configured: '3601', expected: 1_800 },
    { configured: '600.5', expected: 1_800 },
    { configured: '300', expected: 300 },
    { configured: '3600', expected: 3_600 },
  ])('bounds the configured token TTL $configured', ({ configured, expected }) => {
    const tokenEnvironment = environment()
    if (configured !== undefined) {
      tokenEnvironment.READINESS_HANDOFF_TOKEN_TTL_SECONDS = configured
    }
    const verification = verifyReadinessHandoffToken(
      requiredToken(tokenEnvironment),
      tokenEnvironment,
      nowMs,
    )

    expect(verification.ok).toBe(true)
    if (!verification.ok) throw new Error('Expected the bounded token fixture to verify.')
    expect(verification.claims.expiresAt - verification.claims.issuedAt).toBe(expected)
  })
})
