import 'server-only'

import { randomUUID } from 'node:crypto'

import {
  createDeterministicReadinessReport,
  manifestFromAssessmentRequest,
  scoreReadiness,
  validateReadinessAssessmentRequest,
  type ReadinessReport,
} from '../index'
import { resolveOpenRouterReadinessConfig } from './config'
import { createReadinessHandoffToken } from './handoff-token'
import {
  enhanceReadinessReport,
  type EnhanceReadinessReportInput,
  type OpenRouterEnhancementOutcome,
} from './openrouter'
import { readinessCORSHeaders, validatedReadinessOrigin } from './origins'
import {
  authorizeReadinessAIRequest,
  clientAddressFromRequest,
  recordReadinessRejectedSubmission,
  type AIRequestPermit,
} from './rate-limit'

const maximumRequestBytes = 32 * 1024

type SafeLogRecord = Record<string, boolean | number | string | undefined>

type AssessmentHandlerDependencies = {
  authorizeAI?: (context: {
    anonymousToken: string
    clientAddress: string
  }) => Promise<AIRequestPermit>
  enhanceReport?: (input: EnhanceReadinessReportInput) => Promise<OpenRouterEnhancementOutcome>
  environment?: NodeJS.ProcessEnv
  log?: (record: SafeLogRecord) => void
  now?: () => number
  randomUUID?: () => string
  recordRejectedSubmission?: (context: { clientAddress: string }) => Promise<boolean>
}

class RequestBodyFailure extends Error {
  constructor(readonly reason: 'empty' | 'invalid_encoding' | 'oversized') {
    super(reason)
  }
}

function defaultLog(record: SafeLogRecord) {
  console.info(JSON.stringify({ event: 'readiness_assessment', ...record }))
}

function durationBucket(durationMs: number): string {
  if (durationMs < 250) return 'under_250ms'
  if (durationMs < 1_000) return '250ms_to_1s'
  if (durationMs < 5_000) return '1s_to_5s'
  return 'over_5s'
}

async function readBoundedRequestText(request: Request): Promise<string> {
  const contentLength = request.headers.get('content-length')
  const declaredLength = contentLength === null ? Number.NaN : Number(contentLength)

  if (Number.isFinite(declaredLength) && declaredLength > maximumRequestBytes) {
    throw new RequestBodyFailure('oversized')
  }
  if (!request.body) throw new RequestBodyFailure('empty')

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let byteLength = 0

  try {
    while (true) {
      const result = await reader.read()
      if (result.done) break
      if (!result.value) continue

      byteLength += result.value.byteLength
      if (byteLength > maximumRequestBytes) {
        try {
          await reader.cancel()
        } catch {
          // The request is already rejected; cancellation detail is not useful to the caller.
        }
        throw new RequestBodyFailure('oversized')
      }

      chunks.push(result.value)
    }
  } finally {
    reader.releaseLock()
  }

  if (byteLength === 0) throw new RequestBodyFailure('empty')

  const bytes = new Uint8Array(byteLength)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    throw new RequestBodyFailure('invalid_encoding')
  }
}

function jsonResponse(origin: string | null, body: unknown, status = 200): Response {
  const headers = new Headers(readinessCORSHeaders(origin))
  headers.set('Content-Type', 'application/json; charset=utf-8')

  return Response.json(body, {
    headers,
    status,
  })
}

function mediaType(request: Request): string {
  return request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase() ?? ''
}

async function rejectedSubmissionLimitReached(
  clientAddress: string | null,
  dependencies: AssessmentHandlerDependencies,
  environment: NodeJS.ProcessEnv,
): Promise<boolean> {
  if (!clientAddress) return false

  try {
    return dependencies.recordRejectedSubmission
      ? await dependencies.recordRejectedSubmission({ clientAddress })
      : await recordReadinessRejectedSubmission({ clientAddress }, { environment })
  } catch {
    // The request remains rejected even when the optional abuse counter is unavailable.
    return false
  }
}

function rejectedSubmissionLimitResponse(origin: string): Response {
  return jsonResponse(origin, { error: 'Too many requests. Try again later.' }, 429)
}

export function handleReadinessOptions(
  request: Request,
  environment: NodeJS.ProcessEnv = process.env,
): Response {
  const origin = validatedReadinessOrigin(request, environment)
  if (!origin) return jsonResponse(null, { error: 'Request origin is not allowed.' }, 403)

  return new Response(null, { headers: readinessCORSHeaders(origin), status: 204 })
}

export async function handleReadinessAssessment(
  request: Request,
  dependencies: AssessmentHandlerDependencies = {},
): Promise<Response> {
  const environment = dependencies.environment ?? process.env
  const log = dependencies.log ?? defaultLog
  const now = dependencies.now ?? Date.now
  const requestId = (dependencies.randomUUID ?? randomUUID)()
  const safeLog = (record: SafeLogRecord) => log({ ...record, requestId })
  const startedAt = now()
  const origin = validatedReadinessOrigin(request, environment)

  if (!origin) {
    safeLog({ duration: durationBucket(now() - startedAt), outcome: 'rejected', reason: 'origin' })
    return jsonResponse(null, { error: 'Request origin is not allowed.' }, 403)
  }

  if (mediaType(request) !== 'application/json') {
    safeLog({
      duration: durationBucket(now() - startedAt),
      outcome: 'rejected',
      reason: 'media_type',
    })
    return jsonResponse(origin, { error: 'Send the assessment as JSON.' }, 415)
  }

  const clientAddress = clientAddressFromRequest(request, environment)

  let rawBody: string
  try {
    rawBody = await readBoundedRequestText(request)
  } catch (error) {
    const reason = error instanceof RequestBodyFailure ? error.reason : 'body'
    if (await rejectedSubmissionLimitReached(clientAddress, dependencies, environment)) {
      safeLog({
        duration: durationBucket(now() - startedAt),
        outcome: 'rejected',
        reason: 'reject_limit',
      })
      return rejectedSubmissionLimitResponse(origin)
    }
    safeLog({ duration: durationBucket(now() - startedAt), outcome: 'rejected', reason })
    return jsonResponse(
      origin,
      {
        error:
          reason === 'oversized'
            ? 'The assessment request is too large.'
            : 'The assessment request body is invalid.',
      },
      reason === 'oversized' ? 413 : 400,
    )
  }

  let parsedBody: unknown
  try {
    parsedBody = JSON.parse(rawBody)
  } catch {
    if (await rejectedSubmissionLimitReached(clientAddress, dependencies, environment)) {
      safeLog({
        duration: durationBucket(now() - startedAt),
        outcome: 'rejected',
        reason: 'reject_limit',
      })
      return rejectedSubmissionLimitResponse(origin)
    }
    safeLog({ duration: durationBucket(now() - startedAt), outcome: 'rejected', reason: 'json' })
    return jsonResponse(origin, { error: 'The assessment request body is invalid.' }, 400)
  }

  const validation = validateReadinessAssessmentRequest(parsedBody)
  if (!validation.ok) {
    if (await rejectedSubmissionLimitReached(clientAddress, dependencies, environment)) {
      safeLog({
        duration: durationBucket(now() - startedAt),
        outcome: 'rejected',
        reason: 'reject_limit',
      })
      return rejectedSubmissionLimitResponse(origin)
    }
    safeLog({
      duration: durationBucket(now() - startedAt),
      outcome: 'rejected',
      reason: validation.issues[0]?.code ?? 'validation',
    })
    return jsonResponse(
      origin,
      { error: validation.issues[0]?.message ?? 'Review the assessment and try again.' },
      400,
    )
  }

  try {
    const manifest = manifestFromAssessmentRequest(validation.value)
    const policyResult = scoreReadiness(manifest)
    const deterministicReport = createDeterministicReadinessReport(manifest, policyResult)
    const config = resolveOpenRouterReadinessConfig(environment)
    let report: ReadinessReport = deterministicReport
    let aiOutcome = config ? 'rate_limited' : 'disabled'
    let completionTokens: number | undefined
    let cost: number | undefined
    let promptTokens: number | undefined
    let provider: string | undefined
    let routingStrategy: string | undefined
    let servedModel: string | undefined
    let totalTokens: number | undefined

    if (config) {
      let permit: AIRequestPermit
      if (!clientAddress) {
        permit = { allowed: false, reason: 'unavailable' }
      } else {
        try {
          permit = dependencies.authorizeAI
            ? await dependencies.authorizeAI({
                anonymousToken: validation.value.anonymousToken,
                clientAddress,
              })
            : await authorizeReadinessAIRequest(
                {
                  anonymousToken: validation.value.anonymousToken,
                  clientAddress,
                },
                { environment },
              )
        } catch {
          permit = { allowed: false, reason: 'unavailable' }
        }
      }

      if (permit.allowed) {
        let releasePermit = false
        try {
          const outcome = dependencies.enhanceReport
            ? await dependencies.enhanceReport({
                config,
                deterministicReport,
                manifest,
                policyResult,
              })
            : await enhanceReadinessReport({
                config,
                deterministicReport,
                manifest,
                policyResult,
              })

          if (outcome.ok) {
            releasePermit = true
            report = outcome.report
            aiOutcome = 'enhanced'
            completionTokens = outcome.usage.completionTokens
            cost = outcome.usage.cost
            promptTokens = outcome.usage.promptTokens
            provider = outcome.provider
            routingStrategy = outcome.routingStrategy
            servedModel = outcome.model
            totalTokens = outcome.usage.totalTokens
          } else {
            aiOutcome = outcome.reason
            releasePermit = !['network', 'timeout'].includes(outcome.reason)
          }
        } catch {
          aiOutcome = 'invalid_response'
        } finally {
          if (releasePermit) {
            try {
              await permit.release()
            } catch {
              // The rate limiter has its own expiry fallback; never lose the deterministic report.
            }
          }
        }
      } else {
        aiOutcome = `limit_${permit.reason}`
      }
    }

    const reportId = requestId
    const handoffToken = createReadinessHandoffToken(reportId, report, environment, now())

    safeLog({
      aiOutcome,
      completionTokens,
      cost,
      duration: durationBucket(now() - startedAt),
      explanationSource: report.explanationSource,
      outcome: 'completed',
      policyVersion: report.policyVersion,
      promptTokens,
      provider,
      routingStrategy,
      servedModel,
      totalTokens,
    })

    return jsonResponse(origin, {
      fallbackUsed: report.explanationSource === 'deterministic',
      handoffToken,
      report,
      reportId,
    })
  } catch {
    safeLog({ duration: durationBucket(now() - startedAt), outcome: 'failed', reason: 'internal' })
    return jsonResponse(origin, { error: 'The assessment could not be processed. Try again.' }, 500)
  }
}
