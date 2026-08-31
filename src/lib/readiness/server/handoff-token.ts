import 'server-only'

import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

import {
  readinessBlockersV1,
  readinessLevels,
  readinessPolicyVersion,
  type BlockerRuleId,
  type ReadinessLevel,
  type ReadinessReport,
} from '../index'

const tokenVersion = 'v2' as const
const defaultLifetimeSeconds = 30 * 60
const minimumSecretLength = 32
const clockSkewSeconds = 60

const allowedBlockerIds = new Set<BlockerRuleId>(
  readinessBlockersV1.map((blocker) => blocker.ruleId),
)
const allowedLevels = new Set<ReadinessLevel>(readinessLevels)

export type ReadinessHandoffClaims = {
  blockerIds: BlockerRuleId[]
  expiresAt: number
  issuedAt: number
  level: ReadinessLevel
  policyVersion: string
  reportDigest: string
  reportId: string
  version: 2
}

export type ReadinessHandoffVerification =
  | { claims: ReadinessHandoffClaims; ok: true }
  | { ok: false; reason: 'expired' | 'invalid' | 'unavailable' }

export type ReadinessReportHandoffVerification =
  | { claims: ReadinessHandoffClaims; ok: true }
  | { ok: false; reason: 'expired' | 'invalid' | 'report_mismatch' | 'unavailable' }

function boundedLifetime(value: string | undefined): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 5 * 60 && parsed <= 60 * 60
    ? parsed
    : defaultLifetimeSeconds
}

function configuredSecret(environment: NodeJS.ProcessEnv): string | null {
  const secret = environment.READINESS_HANDOFF_SECRET?.trim()
  return secret && secret.length >= minimumSecretLength && !secret.startsWith('replace-with-')
    ? secret
    : null
}

function signatureFor(value: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(value).digest()
}

function canonicalJSON(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return JSON.stringify(value)
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value))
      throw new TypeError('Readiness reports must contain finite numbers.')
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJSON(item)).join(',')}]`
  }

  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJSON(value[key])}`)
      .join(',')}}`
  }

  throw new TypeError('Readiness reports must contain only JSON values.')
}

export function readinessReportDigest(report: ReadinessReport): string {
  return createHash('sha256').update(canonicalJSON(report), 'utf8').digest('hex')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseClaims(value: unknown): ReadinessHandoffClaims | null {
  if (!isRecord(value)) return null

  const exactKeys = [
    'blockerIds',
    'expiresAt',
    'issuedAt',
    'level',
    'policyVersion',
    'reportDigest',
    'reportId',
    'version',
  ]

  if (
    Object.keys(value).length !== exactKeys.length ||
    exactKeys.some((key) => !Object.prototype.hasOwnProperty.call(value, key)) ||
    value.version !== 2 ||
    typeof value.reportId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value.reportId,
    ) ||
    value.policyVersion !== readinessPolicyVersion ||
    typeof value.reportDigest !== 'string' ||
    !/^[0-9a-f]{64}$/.test(value.reportDigest) ||
    typeof value.level !== 'string' ||
    !allowedLevels.has(value.level as ReadinessLevel) ||
    !Number.isSafeInteger(value.issuedAt) ||
    !Number.isSafeInteger(value.expiresAt) ||
    (value.expiresAt as number) <= (value.issuedAt as number) ||
    !Array.isArray(value.blockerIds) ||
    value.blockerIds.length > allowedBlockerIds.size ||
    !value.blockerIds.every(
      (blockerId) =>
        typeof blockerId === 'string' && allowedBlockerIds.has(blockerId as BlockerRuleId),
    ) ||
    new Set(value.blockerIds).size !== value.blockerIds.length
  ) {
    return null
  }

  return value as ReadinessHandoffClaims
}

export function createReadinessHandoffToken(
  reportId: string,
  report: ReadinessReport,
  environment: NodeJS.ProcessEnv = process.env,
  nowMs = Date.now(),
): string | null {
  const secret = configuredSecret(environment)
  if (!secret) return null

  const issuedAt = Math.floor(nowMs / 1_000)
  const claims: ReadinessHandoffClaims = {
    blockerIds: report.blockers.map((blocker) => blocker.ruleId),
    expiresAt: issuedAt + boundedLifetime(environment.READINESS_HANDOFF_TOKEN_TTL_SECONDS),
    issuedAt,
    level: report.level,
    policyVersion: report.policyVersion,
    reportDigest: readinessReportDigest(report),
    reportId,
    version: 2,
  }
  const payload = Buffer.from(JSON.stringify(claims), 'utf8').toString('base64url')
  const signedValue = `${tokenVersion}.${payload}`
  const signature = signatureFor(signedValue, secret).toString('base64url')

  return `${signedValue}.${signature}`
}

export function verifyReadinessHandoffToken(
  token: string,
  environment: NodeJS.ProcessEnv = process.env,
  nowMs = Date.now(),
): ReadinessHandoffVerification {
  const secret = configuredSecret(environment)
  if (!secret) return { ok: false, reason: 'unavailable' }

  const parts = token.split('.')
  if (
    token.length > 4_096 ||
    parts.length !== 3 ||
    parts[0] !== tokenVersion ||
    !parts[1] ||
    !parts[2] ||
    !/^[A-Za-z0-9_-]+$/.test(parts[1]) ||
    !/^[A-Za-z0-9_-]+$/.test(parts[2])
  ) {
    return { ok: false, reason: 'invalid' }
  }

  const signedValue = `${parts[0]}.${parts[1]}`
  let suppliedSignature: Buffer

  try {
    suppliedSignature = Buffer.from(parts[2], 'base64url')
  } catch {
    return { ok: false, reason: 'invalid' }
  }

  const expectedSignature = signatureFor(signedValue, secret)
  if (
    suppliedSignature.length !== expectedSignature.length ||
    suppliedSignature.toString('base64url') !== parts[2] ||
    !timingSafeEqual(suppliedSignature, expectedSignature)
  ) {
    return { ok: false, reason: 'invalid' }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
  } catch {
    return { ok: false, reason: 'invalid' }
  }

  const claims = parseClaims(parsed)
  if (!claims) return { ok: false, reason: 'invalid' }

  const nowSeconds = Math.floor(nowMs / 1_000)
  if (claims.expiresAt <= nowSeconds || claims.issuedAt > nowSeconds + clockSkewSeconds) {
    return { ok: false, reason: 'expired' }
  }

  return { claims, ok: true }
}

export function verifyReadinessReportHandoff(
  token: string,
  report: ReadinessReport,
  environment: NodeJS.ProcessEnv = process.env,
  nowMs = Date.now(),
): ReadinessReportHandoffVerification {
  const verification = verifyReadinessHandoffToken(token, environment, nowMs)
  if (!verification.ok) return verification

  let suppliedDigest: Buffer
  try {
    suppliedDigest = Buffer.from(readinessReportDigest(report), 'hex')
  } catch {
    return { ok: false, reason: 'report_mismatch' }
  }

  const expectedDigest = Buffer.from(verification.claims.reportDigest, 'hex')
  if (
    suppliedDigest.length !== expectedDigest.length ||
    !timingSafeEqual(suppliedDigest, expectedDigest)
  ) {
    return { ok: false, reason: 'report_mismatch' }
  }

  return verification
}
