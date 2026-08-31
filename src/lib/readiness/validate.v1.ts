import { readinessQuestionById, readinessQuestionsV1 } from './questions.v1'
import {
  readinessPolicyVersion,
  readinessProfiles,
  type AssessmentRequestValidationResult,
  type ManifestValidationResult,
  type QuestionId,
  type ReadinessAnswers,
  type ReadinessAssessmentRequest,
  type ReadinessManifest,
  type ReadinessProfile,
  type ValidationIssue,
  type ValidationIssueCode,
} from './types'

const manifestRequiredKeys = ['answers', 'policyVersion', 'profile'] as const
const manifestOptionalKeys = ['symptom'] as const
const requestRequiredKeys = [...manifestRequiredKeys, 'anonymousToken'] as const
const requestOptionalKeys = manifestOptionalKeys
const answerKeys = readinessQuestionsV1.map((question) => question.id)
const answerKeySet = new Set<string>(answerKeys)
const profileSet = new Set<string>(readinessProfiles)
const retainedUserOrCustomerDataAnswers = new Set([
  'classified_non_sensitive',
  'classified_sensitive',
  'sensitive_unclassified',
])
const controlCharacterPattern = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/
const emailPattern = /\b[^\s@<>]+@[^\s@<>]+\.[a-z]{2,}\b/i
const urlPattern =
  /(?:\b(?:https?|ftp):\/\/|\bwww\.|\b(?:localhost)(?::\d{1,5})?(?:\/\S*)?|\b(?:\d{1,3}\.){3}\d{1,3}(?::\d{1,5})?(?:\/\S*)?|\b(?:[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?\.)+(?!(?:js|jsx|ts|tsx|py|rb|go|java|json|ya?ml|md|txt|log|sql|css|html?)\b)[a-z]{2,63}(?::\d{1,5})?(?:\/\S*)?)/i
const secretPatterns = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
  /\b(?:sk|pk)_(?:live|test)_[a-z0-9]{12,}\b/i,
  /\bsk-[a-z0-9_-]{16,}\b/i,
  /\b(?:github_pat_[a-z0-9_]{20,}|gh[pousr]_[a-z0-9]{20,})\b/i,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bxox[baprs]-[a-z0-9-]{10,}\b/i,
  /\beyJ[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\b/,
  /\b(?:authorization\s*:\s*bearer|api[_ -]?key|client[_ -]?secret|password|private[_ -]?key|access[_ -]?token)\s*[:=]\s*\S{6,}/i,
] as const
const codePatterns = [
  /```|~~~|<\/?(?:script|style|html|body|div|form|input|button|iframe)\b/i,
  /\b(?:import|export)\s+(?:type\s+)?(?:\{|\*|[A-Za-z_$])/,
  /\b(?:const|let|var|function|class|interface)\s+[A-Za-z_$][\w$]*/,
  /\b(?:SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\s+(?:FROM|INTO|TABLE|DATABASE|[A-Za-z_])/i,
  /(?:=>|\{\s*["'][^"']+["']\s*:|;\s*(?:\}|$)|\$\([^)]*\))/,
] as const
const logPatterns = [
  /(?:^|\n)\s*(?:TRACE|DEBUG|INFO|WARN|ERROR|FATAL)\b[^\n]*(?:\n|$)/i,
  /(?:^|\n)\s*at\s+[A-Za-z_$][\w$.[\]<>-]*\s*\([^\n]+:\d+:\d+\)/,
  /\b(?:Traceback \(most recent call last\)|[A-Za-z_$][\w$]*(?:Error|Exception):\s+[^\n]+)/,
  /(?:^|\n)\d{4}-\d{2}-\d{2}[T ][0-2]\d:[0-5]\d:[0-5]\d[^\n]*(?:\n|$)/,
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function pushIssue(
  issues: ValidationIssue[],
  code: ValidationIssueCode,
  path: string,
  message: string,
) {
  issues.push({ code, message, path })
}

function validateExactKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[],
  path: string,
  issues: ValidationIssue[],
) {
  const allowed = new Set([...required, ...optional])

  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      pushIssue(
        issues,
        'unknown_field',
        path ? `${path}.${key}` : key,
        'This field is not part of the readiness contract.',
      )
    }
  }

  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      pushIssue(
        issues,
        'missing_field',
        path ? `${path}.${key}` : key,
        'This required readiness field is missing.',
      )
    }
  }
}

function normalizedPhoneCandidateIsSensitive(candidate: string): boolean {
  const compact = candidate.trim()

  if (/^\d{4}-\d{2}-\d{2}$/.test(compact)) return false

  const digitCount = (compact.match(/\d/g) ?? []).length
  return digitCount >= 7 && digitCount <= 15
}

function containsPhone(value: string): boolean {
  const candidates = value.match(/(?:\+?\d[\d(). -]{5,}\d)/g) ?? []
  return candidates.some(normalizedPhoneCandidateIsSensitive)
}

function passesLuhnCheck(digits: string): boolean {
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
}

function containsPaymentCard(value: string): boolean {
  const candidates = value.match(/\b(?:\d[ -]?){12,18}\d\b/g) ?? []
  return candidates.some((candidate) => passesLuhnCheck(candidate.replace(/\D/g, '')))
}

function looksLikeCode(value: string): boolean {
  if (codePatterns.some((pattern) => pattern.test(value))) return true

  const structuralCharacters = (value.match(/[{};<>]/g) ?? []).length
  return structuralCharacters >= 6 && /[={}();<>]/.test(value)
}

function looksLikeLog(value: string): boolean {
  if (logPatterns.some((pattern) => pattern.test(value))) return true

  const lines = value.split('\n').filter((line) => line.trim())
  if (lines.length < 3) return false

  const structuredLines = lines.filter(
    (line) =>
      /^\s*(?:\[[^\]]+\]|\d{2}:\d{2}:\d{2}|[A-Z]{3,8}\s*[:|-])/.test(line) ||
      /\b(?:status|request|response|duration|trace|stack|exception)\s*[:=]/i.test(line),
  )

  return structuredLines.length >= 2
}

export function normalizeReadinessSymptom(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/\r\n?/g, '\n')
    .replace(/[\t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function containsDisallowedReadinessURL(value: string): boolean {
  return urlPattern.test(value)
}

export function inspectReadinessSymptom(value: unknown): {
  issues: ValidationIssue[]
  value?: string
} {
  const issues: ValidationIssue[] = []

  if (typeof value !== 'string') {
    pushIssue(issues, 'invalid_type', 'symptom', 'The optional symptom must be text.')
    return { issues }
  }

  if (controlCharacterPattern.test(value)) {
    pushIssue(
      issues,
      'symptom_control_character',
      'symptom',
      'The symptom contains unsupported control characters.',
    )
  }

  const normalized = normalizeReadinessSymptom(value)

  if (normalized.length > 500) {
    pushIssue(
      issues,
      'symptom_too_long',
      'symptom',
      'The symptom must be 500 characters or fewer after normalization.',
    )
  }
  if (secretPatterns.some((pattern) => pattern.test(normalized))) {
    pushIssue(
      issues,
      'symptom_secret',
      'symptom',
      'Remove credentials, access tokens, private keys, and other secrets.',
    )
  }
  if (emailPattern.test(normalized)) {
    pushIssue(issues, 'symptom_email', 'symptom', 'Remove email addresses from the symptom.')
  }
  if (containsPhone(normalized)) {
    pushIssue(issues, 'symptom_phone', 'symptom', 'Remove phone numbers from the symptom.')
  }
  if (containsPaymentCard(normalized)) {
    pushIssue(
      issues,
      'symptom_payment_card',
      'symptom',
      'Remove payment-card numbers from the symptom.',
    )
  }
  if (containsDisallowedReadinessURL(normalized)) {
    pushIssue(
      issues,
      'symptom_url',
      'symptom',
      'Remove URLs, domains, and repository locations from the symptom.',
    )
  }
  if (looksLikeCode(normalized)) {
    pushIssue(
      issues,
      'symptom_code',
      'symptom',
      'Describe the symptom in plain language without source code or commands.',
    )
  }
  if (looksLikeLog(normalized)) {
    pushIssue(
      issues,
      'symptom_log',
      'symptom',
      'Describe the symptom in plain language without logs or stack traces.',
    )
  }

  return normalized && issues.length === 0 ? { issues, value: normalized } : { issues }
}

function validateManifestRecord(
  input: Record<string, unknown>,
  options: { allowAnonymousToken: boolean },
): ManifestValidationResult {
  const issues: ValidationIssue[] = []
  validateExactKeys(
    input,
    options.allowAnonymousToken ? requestRequiredKeys : manifestRequiredKeys,
    options.allowAnonymousToken ? requestOptionalKeys : manifestOptionalKeys,
    '',
    issues,
  )

  if (input.policyVersion !== readinessPolicyVersion) {
    pushIssue(
      issues,
      'unsupported_policy',
      'policyVersion',
      `The supported policy version is ${readinessPolicyVersion}.`,
    )
  }

  if (typeof input.profile !== 'string' || !profileSet.has(input.profile)) {
    pushIssue(
      issues,
      'invalid_answer',
      'profile',
      'Choose one of the supported readiness profiles.',
    )
  }

  const normalizedAnswers: Partial<ReadinessAnswers> = {}

  if (!isRecord(input.answers)) {
    pushIssue(issues, 'invalid_type', 'answers', 'Readiness answers must be an object.')
  } else {
    for (const key of Object.keys(input.answers)) {
      if (!answerKeySet.has(key)) {
        pushIssue(
          issues,
          'unknown_field',
          `answers.${key}`,
          'This answer ID is not part of the current readiness policy.',
        )
      }
    }

    for (const questionId of answerKeys) {
      if (!Object.prototype.hasOwnProperty.call(input.answers, questionId)) {
        pushIssue(
          issues,
          'missing_field',
          `answers.${questionId}`,
          'Every readiness question requires one controlled answer.',
        )
        continue
      }

      const answer = input.answers[questionId]
      const question = readinessQuestionById[questionId]

      if (
        typeof answer !== 'string' ||
        !question.options.some((option) => option.value === answer)
      ) {
        pushIssue(
          issues,
          'invalid_answer',
          `answers.${questionId}`,
          'Choose one of the controlled answers defined for this question.',
        )
        continue
      }

      normalizedAnswers[questionId] = answer
    }
  }

  let symptom: string | undefined
  if (input.symptom !== undefined) {
    const inspected = inspectReadinessSymptom(input.symptom)
    issues.push(...inspected.issues)
    symptom = inspected.value
  }

  const normalized = normalizedAnswers as Partial<ReadinessAnswers>
  const scopeHasAccounts = ['internal_accounts', 'public_accounts'].includes(
    normalized['architecture.scope'] ?? '',
  )
  if (scopeHasAccounts && normalized['identity.authorization'] === 'not_applicable') {
    pushIssue(
      issues,
      'contradictory_answers',
      'answers.identity.authorization',
      'An account-bearing scope requires an authorization answer.',
    )
  }

  const declaresRetainedUserOrCustomerData = retainedUserOrCustomerDataAnswers.has(
    normalized['identity.data_classification'] ?? '',
  )
  if (declaresRetainedUserOrCustomerData && normalized['identity.deletion'] === 'not_applicable') {
    pushIssue(
      issues,
      'contradictory_answers',
      'answers.identity.deletion',
      'Retained user, customer, or sensitive data requires a deletion-path answer.',
    )
  }
  if (declaresRetainedUserOrCustomerData && normalized['operations.backups'] === 'not_applicable') {
    pushIssue(
      issues,
      'contradictory_answers',
      'answers.operations.backups',
      'Retained user, customer, or sensitive data requires a backup-and-recovery answer.',
    )
  }

  const environmentSaysNotDeployed = normalized['architecture.environments'] === 'not_deployed'
  const rollbackSaysNotDeployed = normalized['delivery.rollback'] === 'not_deployed'
  if (environmentSaysNotDeployed !== rollbackSaysNotDeployed) {
    pushIssue(
      issues,
      'contradictory_answers',
      'answers.delivery.rollback',
      'The environment and release-recovery answers disagree about whether production is deployed.',
    )
  }

  if (issues.length > 0) return { issues, ok: false }

  const value: ReadinessManifest = {
    answers: normalizedAnswers as ReadinessAnswers,
    policyVersion: readinessPolicyVersion,
    profile: input.profile as ReadinessProfile,
    ...(symptom ? { symptom } : {}),
  }

  return { issues: [], ok: true, value }
}

export function validateReadinessManifest(input: unknown): ManifestValidationResult {
  if (!isRecord(input)) {
    return {
      issues: [
        {
          code: 'invalid_type',
          message: 'The readiness manifest must be an object.',
          path: '',
        },
      ],
      ok: false,
    }
  }

  return validateManifestRecord(input, { allowAnonymousToken: false })
}

export function validateReadinessAssessmentRequest(
  input: unknown,
): AssessmentRequestValidationResult {
  if (!isRecord(input)) {
    return {
      issues: [
        {
          code: 'invalid_type',
          message: 'The readiness assessment request must be an object.',
          path: '',
        },
      ],
      ok: false,
    }
  }

  const result = validateManifestRecord(input, { allowAnonymousToken: true })
  const issues = result.ok ? [] : [...result.issues]
  const anonymousToken = input.anonymousToken

  if (
    typeof anonymousToken !== 'string' ||
    anonymousToken.length < 16 ||
    anonymousToken.length > 512 ||
    !/^[A-Za-z0-9._~-]+$/.test(anonymousToken)
  ) {
    pushIssue(
      issues,
      'invalid_anonymous_token',
      'anonymousToken',
      'The anonymous abuse-control token is invalid.',
    )
  }

  if (!result.ok || issues.length > 0) return { issues, ok: false }

  const value: ReadinessAssessmentRequest = {
    ...result.value,
    anonymousToken: anonymousToken as string,
  }

  return { issues: [], ok: true, value }
}

export function manifestFromAssessmentRequest(
  request: ReadinessAssessmentRequest,
): ReadinessManifest {
  const { anonymousToken: _anonymousToken, ...manifest } = request
  return manifest
}

export function isReadinessQuestionId(value: string): value is QuestionId {
  return answerKeySet.has(value)
}
