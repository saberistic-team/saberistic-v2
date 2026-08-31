import { readinessBlockersV1, type BlockerRuleId, type ReadinessReport } from '@/lib/readiness'

import {
  diagnosticPrivacyNoticeVersion,
  diagnosticTimeBands,
  diagnosticTimeframes,
  type DiagnosticRequestInput,
} from './types'

export type DiagnosticValidationIssue = {
  message: string
  path: string
}

export type DiagnosticValidationResult =
  | { issues: []; ok: true; value: DiagnosticRequestInput }
  | { issues: DiagnosticValidationIssue[]; ok: false }

const exactRootKeys = [
  'anonymousToken',
  'contact',
  'consent',
  'timeframe',
  'timeBand',
  'timezone',
  'shareSummary',
  'selectedBlockerIds',
  'report',
  'handoffToken',
] as const
const optionalRootKeys = ['context'] as const
const blockerIds = new Set<string>(readinessBlockersV1.map((blocker) => blocker.ruleId))
const timeframes = new Set<string>(diagnosticTimeframes)
const timeBands = new Set<string>(diagnosticTimeBands)
const controlCharacters = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/
const emailPattern =
  /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i
const secretPatterns = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
  /\b(?:sk|rk|pk)_(?:live|test)_[a-z0-9]{12,}\b/i,
  /\bsk-[a-z0-9_-]{16,}\b/i,
  /\b(?:github_pat_[a-z0-9_]{20,}|gh[pousr]_[a-z0-9]{20,})\b/i,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bxox[baprs]-[a-z0-9-]{10,}\b/i,
  /\b(?:authorization\s*:\s*bearer|api[_ -]?key|client[_ -]?secret|password|private[_ -]?key|access[_ -]?token)\s*[:=]\s*\S{6,}/i,
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function hasExactKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = [],
): boolean {
  const allowed = new Set([...required, ...optional])
  return (
    required.every((key) => Object.prototype.hasOwnProperty.call(value, key)) &&
    Object.keys(value).every((key) => allowed.has(key))
  )
}

function normalizeSingleLine(value: string): string {
  return value.normalize('NFKC').replace(/\s+/g, ' ').trim()
}

function normalizeContext(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/\r\n?/g, '\n')
    .replace(/[\t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function hasPaymentCard(value: string): boolean {
  const candidates = value.match(/\b(?:\d[ -]?){12,18}\d\b/g) ?? []
  return candidates.some((candidate) => {
    const digits = candidate.replace(/\D/g, '')
    if (digits.length < 13 || digits.length > 19 || /^(\d)\1+$/.test(digits)) return false

    let sum = 0
    let doubleDigit = false
    for (let index = digits.length - 1; index >= 0; index -= 1) {
      let digit = Number(digits[index])
      if (doubleDigit) {
        digit *= 2
        if (digit > 9) digit -= 9
      }
      sum += digit
      doubleDigit = !doubleDigit
    }
    return sum % 10 === 0
  })
}

function validTimezone(value: string): boolean {
  if (value.length < 1 || value.length > 80 || !/^[A-Za-z0-9_+\-/]+$/.test(value)) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(0)
    return true
  } catch {
    return false
  }
}

function issue(path: string, message: string): DiagnosticValidationResult {
  return { issues: [{ message, path }], ok: false }
}

export function validateDiagnosticRequest(value: unknown): DiagnosticValidationResult {
  if (!isRecord(value) || !hasExactKeys(value, exactRootKeys, optionalRootKeys)) {
    return issue('', 'The diagnostic request contains missing or unsupported fields.')
  }

  if (
    typeof value.anonymousToken !== 'string' ||
    value.anonymousToken.length < 16 ||
    value.anonymousToken.length > 512 ||
    !/^[A-Za-z0-9._~-]+$/.test(value.anonymousToken)
  ) {
    return issue('anonymousToken', 'The anonymous assessment token is invalid.')
  }

  if (!isRecord(value.contact) || !hasExactKeys(value.contact, ['name', 'email'], ['company'])) {
    return issue('contact', 'Contact details contain missing or unsupported fields.')
  }

  const name = typeof value.contact.name === 'string' ? normalizeSingleLine(value.contact.name) : ''
  const email =
    typeof value.contact.email === 'string'
      ? value.contact.email.normalize('NFKC').trim().toLowerCase()
      : ''
  const company =
    typeof value.contact.company === 'string'
      ? normalizeSingleLine(value.contact.company)
      : undefined

  if (name.length < 2 || name.length > 120 || controlCharacters.test(name)) {
    return issue('contact.name', 'Enter a valid name between 2 and 120 characters.')
  }
  if (email.length < 3 || email.length > 254 || !emailPattern.test(email)) {
    return issue('contact.email', 'Enter a valid email address.')
  }
  if (
    company !== undefined &&
    (company.length < 2 || company.length > 140 || controlCharacters.test(company))
  ) {
    return issue('contact.company', 'Company must be between 2 and 140 characters.')
  }

  if (
    !isRecord(value.consent) ||
    !hasExactKeys(value.consent, ['contact', 'privacy', 'privacyVersion']) ||
    value.consent.contact !== true ||
    value.consent.privacy !== true ||
    value.consent.privacyVersion !== diagnosticPrivacyNoticeVersion
  ) {
    return issue('consent', 'Current contact and privacy consent is required.')
  }

  if (typeof value.timeframe !== 'string' || !timeframes.has(value.timeframe)) {
    return issue('timeframe', 'Choose one of the available call timeframes.')
  }
  if (typeof value.timeBand !== 'string' || !timeBands.has(value.timeBand)) {
    return issue('timeBand', 'Choose one of the available time bands.')
  }
  if (typeof value.timezone !== 'string' || !validTimezone(value.timezone)) {
    return issue('timezone', 'Choose a valid IANA timezone.')
  }
  if (typeof value.shareSummary !== 'boolean') {
    return issue('shareSummary', 'Choose whether to share the assessment summary.')
  }

  if (
    !Array.isArray(value.selectedBlockerIds) ||
    value.selectedBlockerIds.length > blockerIds.size ||
    !value.selectedBlockerIds.every(
      (blockerId) => typeof blockerId === 'string' && blockerIds.has(blockerId),
    ) ||
    new Set(value.selectedBlockerIds).size !== value.selectedBlockerIds.length
  ) {
    return issue('selectedBlockerIds', 'Selected blockers must be unique readiness blocker IDs.')
  }
  if (value.shareSummary === false && value.selectedBlockerIds.length > 0) {
    return issue(
      'selectedBlockerIds',
      'Blocker details cannot be shared when assessment sharing is turned off.',
    )
  }

  if (!isRecord(value.report)) {
    return issue('report', 'The signed readiness report is required.')
  }
  if (
    typeof value.handoffToken !== 'string' ||
    value.handoffToken.length < 32 ||
    value.handoffToken.length > 4_096 ||
    !/^[A-Za-z0-9._~-]+$/.test(value.handoffToken)
  ) {
    return issue('handoffToken', 'The signed readiness handoff is invalid.')
  }

  let context: string | undefined
  if (Object.prototype.hasOwnProperty.call(value, 'context')) {
    if (typeof value.context !== 'string') {
      return issue('context', 'Additional context must be plain text.')
    }
    const normalizedContext = normalizeContext(value.context)
    if (
      normalizedContext.length > 1_000 ||
      controlCharacters.test(normalizedContext) ||
      secretPatterns.some((pattern) => pattern.test(normalizedContext)) ||
      hasPaymentCard(normalizedContext)
    ) {
      return issue(
        'context',
        'Keep context under 1,000 characters and remove credentials or payment details.',
      )
    }
    context = normalizedContext || undefined
  }

  return {
    issues: [],
    ok: true,
    value: {
      ...(context ? { context } : {}),
      anonymousToken: value.anonymousToken,
      contact: {
        ...(company ? { company } : {}),
        email,
        name,
      },
      consent: {
        contact: true,
        privacy: true,
        privacyVersion: diagnosticPrivacyNoticeVersion,
      },
      handoffToken: value.handoffToken,
      report: value.report as unknown as ReadinessReport,
      selectedBlockerIds: value.selectedBlockerIds as BlockerRuleId[],
      shareSummary: value.shareSummary,
      timeBand: value.timeBand as DiagnosticRequestInput['timeBand'],
      timeframe: value.timeframe as DiagnosticRequestInput['timeframe'],
      timezone: value.timezone,
    },
  }
}
