import { validateAnalyticsEvent } from './events'

type UmamiPayload = Record<string, unknown>

const approvedHostnames = new Set(['saberistic.com', 'www.saberistic.com'])
const publicPathPattern =
  /^(?:\/|\/privacy|\/prototypes(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?|\/readiness)$/
const emailPattern = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/
const secretPattern = /\b(?:authorization|bearer|password|secret|token)\b/i
const uuidPattern = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i
const exactUUIDPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const performanceMetricKeys = ['cls', 'duration', 'fcp', 'inp', 'lcp', 'ttfb'] as const

function isRecord(value: unknown): value is UmamiPayload {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function hasSensitiveText(value: string): boolean {
  return emailPattern.test(value) || secretPattern.test(value) || uuidPattern.test(value)
}

function sanitizeCurrentPath(value: unknown): string | null {
  if (typeof value !== 'string' || !value || value.length > 240) return null

  try {
    const parsed = new URL(value, 'https://saberistic.com')

    if (
      !['http:', 'https:'].includes(parsed.protocol) ||
      !approvedHostnames.has(parsed.hostname.toLowerCase()) ||
      parsed.username ||
      parsed.password ||
      hasSensitiveText(parsed.pathname) ||
      !publicPathPattern.test(parsed.pathname)
    ) {
      return null
    }

    return parsed.pathname
  } catch {
    return null
  }
}

function sanitizeReferrer(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value) return undefined

  try {
    const parsed = new URL(value)

    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
      return undefined
    }

    return parsed.origin
  } catch {
    return undefined
  }
}

function isSafeTitle(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 160 &&
    !value.includes('\n') &&
    !value.includes('\r') &&
    !hasSensitiveText(value)
  )
}

function sanitizeCommonPayload(payload: UmamiPayload): UmamiPayload | null {
  if (
    typeof payload.hostname !== 'string' ||
    !approvedHostnames.has(payload.hostname.toLowerCase()) ||
    typeof payload.website !== 'string' ||
    !exactUUIDPattern.test(payload.website) ||
    payload.id !== undefined
  ) {
    return null
  }

  const url = sanitizeCurrentPath(payload.url)

  if (!url || (payload.title !== undefined && !isSafeTitle(payload.title))) return null

  const sanitized: UmamiPayload = {
    hostname: payload.hostname.toLowerCase(),
    url,
    website: payload.website,
  }
  const referrer = sanitizeReferrer(payload.referrer)

  if (payload.title !== undefined) sanitized.title = payload.title
  if (
    typeof payload.language === 'string' &&
    /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(payload.language)
  ) {
    sanitized.language = payload.language
  } else if (payload.language !== undefined) return null
  if (typeof payload.screen === 'string' && /^\d{1,5}x\d{1,5}$/.test(payload.screen)) {
    sanitized.screen = payload.screen
  } else if (payload.screen !== undefined) return null
  if (typeof payload.tag === 'string' && /^[a-z0-9_-]{1,50}$/i.test(payload.tag)) {
    sanitized.tag = payload.tag
  } else if (payload.tag !== undefined) return null
  if (referrer) sanitized.referrer = referrer

  return sanitized
}

function sanitizePerformancePayload(
  source: UmamiPayload,
  common: UmamiPayload,
): UmamiPayload | false {
  const performance: UmamiPayload = { ...common }
  let metricCount = 0

  for (const key of performanceMetricKeys) {
    const value = source[key]

    if (value === undefined) continue
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return false

    performance[key] = value
    metricCount += 1
  }

  return metricCount > 0 ? performance : false
}

export function guardUmamiPayload(type: string, value: unknown): UmamiPayload | false {
  if (!isRecord(value)) return false

  const payload = sanitizeCommonPayload(value)

  if (!payload) return false

  if (type === 'event') {
    if (value.name === undefined) return payload

    const event = validateAnalyticsEvent({ data: value.data, name: value.name })

    if (!event) return false

    payload.name = event.name
    payload.data = event.data
    return payload
  }

  if (type === 'performance') {
    return sanitizePerformancePayload(value, payload)
  }

  return false
}
