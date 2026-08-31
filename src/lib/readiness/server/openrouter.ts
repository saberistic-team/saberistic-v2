import 'server-only'

import {
  buildReadinessModelMessages,
  buildReadinessModelResponseFormat,
  mergeReadinessModelResponse,
  validateReadinessModelResponse,
  type ReadinessManifest,
  type ReadinessPolicyResult,
  type ReadinessReport,
} from '../index'

import type { OpenRouterReadinessConfig } from './config'

const openRouterChatCompletionsURL = 'https://openrouter.ai/api/v1/chat/completions'
const maximumResponseBytes = 128 * 1024
const maximumModelContentBytes = 64 * 1024
const openRouterTitle = 'Saberistic Readiness Check'
const endpointModelPattern = /^[a-z0-9][a-z0-9._~-]*\/[a-z0-9][a-z0-9._~-]*$/i
const disabledOpenRouterPlugins = [
  { enabled: false, id: 'context-compression' },
  { enabled: false, id: 'file-parser' },
  { enabled: false, id: 'fusion' },
  { enabled: false, id: 'pareto-router' },
  { enabled: false, id: 'response-healing' },
  { enabled: false, id: 'web' },
] as const

export type OpenRouterFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export type OpenRouterEnhancementFailureReason =
  | 'timeout'
  | 'network'
  | 'http'
  | 'error_response'
  | 'invalid_response'
  | 'invalid_model_output'
  | 'oversized_response'

export interface OpenRouterUsage {
  completionTokens?: number
  cost?: number
  promptTokens?: number
  totalTokens?: number
}

export type OpenRouterEnhancementOutcome =
  | {
      model: string
      ok: true
      provider: string
      report: ReadinessReport
      routingStrategy: 'direct' | 'fallback'
      usage: OpenRouterUsage
    }
  | {
      ok: false
      reason: OpenRouterEnhancementFailureReason
      report: ReadinessReport
    }

export interface EnhanceReadinessReportInput {
  config: OpenRouterReadinessConfig
  deterministicReport: ReadinessReport
  fetchImpl?: OpenRouterFetch
  manifest: ReadinessManifest
  policyResult: ReadinessPolicyResult
}

class AdapterFailure extends Error {
  constructor(readonly reason: OpenRouterEnhancementFailureReason) {
    super(reason)
    this.name = 'OpenRouterReadinessAdapterFailure'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function fail(
  report: ReadinessReport,
  reason: OpenRouterEnhancementFailureReason,
): OpenRouterEnhancementOutcome {
  return { ok: false, reason, report }
}

function safeNonNegativeInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined
}

function safeNonNegativeNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined
}

function safeUsage(value: unknown): OpenRouterUsage {
  if (!isRecord(value)) return {}

  const usage: OpenRouterUsage = {}
  const promptTokens = safeNonNegativeInteger(value.prompt_tokens)
  const completionTokens = safeNonNegativeInteger(value.completion_tokens)
  const totalTokens = safeNonNegativeInteger(value.total_tokens)
  const cost = safeNonNegativeNumber(value.cost)

  if (promptTokens !== undefined) usage.promptTokens = promptTokens
  if (completionTokens !== undefined) usage.completionTokens = completionTokens
  if (totalTokens !== undefined) usage.totalTokens = totalTokens
  if (cost !== undefined) usage.cost = cost

  return usage
}

function safeRouterMetadata(
  value: unknown,
  servedModel: string,
  configuredModels: readonly [string, string],
): { provider: string; routingStrategy: 'direct' | 'fallback' } {
  if (!isRecord(value)) throw new AdapterFailure('invalid_response')

  const allowedModels = new Set(configuredModels)
  if (
    typeof value.requested !== 'string' ||
    (!allowedModels.has(value.requested) && value.requested !== configuredModels.join(','))
  ) {
    throw new AdapterFailure('invalid_response')
  }

  const strategy = value.strategy
  if (strategy !== 'direct' && strategy !== 'fallback') {
    throw new AdapterFailure('invalid_response')
  }

  const pipeline = value.pipeline
  if (pipeline !== undefined) {
    if (!Array.isArray(pipeline)) throw new AdapterFailure('invalid_response')

    for (const stage of pipeline) {
      if (!isRecord(stage) || stage.type !== 'guardrail') {
        throw new AdapterFailure('invalid_response')
      }
    }
  }

  if (!isRecord(value.endpoints) || !Array.isArray(value.endpoints.available)) {
    throw new AdapterFailure('invalid_response')
  }

  const selected = value.endpoints.available.filter(
    (endpoint): endpoint is Record<string, unknown> =>
      isRecord(endpoint) && endpoint.selected === true,
  )
  const selectedModel = selected[0]?.model
  const servedAuthor = servedModel.slice(0, servedModel.indexOf('/')).toLowerCase()
  if (
    selected.length !== 1 ||
    typeof selectedModel !== 'string' ||
    selectedModel.length > 160 ||
    !endpointModelPattern.test(selectedModel) ||
    selectedModel.slice(0, selectedModel.indexOf('/')).toLowerCase() !== servedAuthor
  ) {
    throw new AdapterFailure('invalid_response')
  }

  const provider = selected[0].provider
  if (
    typeof provider !== 'string' ||
    provider.length < 1 ||
    provider.length > 80 ||
    provider.trim() !== provider ||
    /[\u0000-\u001f\u007f]/.test(provider)
  ) {
    throw new AdapterFailure('invalid_response')
  }

  return { provider, routingStrategy: strategy }
}

async function cancelResponse(response: Response): Promise<void> {
  try {
    await response.body?.cancel()
  } catch {
    // The response is already unusable and no upstream detail should escape this adapter.
  }
}

async function readResponseText(response: Response): Promise<string> {
  const contentLength = response.headers.get('content-length')
  const declaredLength = contentLength === null ? Number.NaN : Number(contentLength)

  if (Number.isFinite(declaredLength) && declaredLength > maximumResponseBytes) {
    await cancelResponse(response)
    throw new AdapterFailure('oversized_response')
  }

  if (!response.body) throw new AdapterFailure('invalid_response')

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let byteLength = 0

  try {
    while (true) {
      const result = await reader.read()
      if (result.done) break
      if (!result.value) continue

      byteLength += result.value.byteLength
      if (byteLength > maximumResponseBytes) {
        try {
          await reader.cancel()
        } catch {
          // The bounded result is already known; cancellation detail is not useful to callers.
        }
        throw new AdapterFailure('oversized_response')
      }

      chunks.push(result.value)
    }
  } finally {
    reader.releaseLock()
  }

  if (byteLength === 0) throw new AdapterFailure('invalid_response')

  const bytes = new Uint8Array(byteLength)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    throw new AdapterFailure('invalid_response')
  }
}

function parseOpenRouterResponse(
  responseText: string,
  config: OpenRouterReadinessConfig,
): {
  content: string
  model: string
  provider: string
  routingStrategy: 'direct' | 'fallback'
  usage: OpenRouterUsage
} {
  let payload: unknown

  try {
    payload = JSON.parse(responseText)
  } catch {
    throw new AdapterFailure('invalid_response')
  }

  if (!isRecord(payload)) throw new AdapterFailure('invalid_response')
  if (payload.error !== undefined && payload.error !== null) {
    throw new AdapterFailure('error_response')
  }

  const choices = payload.choices
  if (!Array.isArray(choices) || choices.length === 0 || !isRecord(choices[0])) {
    throw new AdapterFailure('invalid_response')
  }

  const choice = choices[0]
  if (choice.error !== undefined && choice.error !== null) {
    throw new AdapterFailure('error_response')
  }

  if (choice.finish_reason === 'error') throw new AdapterFailure('error_response')
  if (choice.finish_reason === 'length') throw new AdapterFailure('invalid_response')
  if (choice.finish_reason !== 'stop') throw new AdapterFailure('invalid_response')

  if (!isRecord(choice.message) || typeof choice.message.content !== 'string') {
    throw new AdapterFailure('invalid_response')
  }

  const rawContent = choice.message.content
  if (new TextEncoder().encode(rawContent).byteLength > maximumModelContentBytes) {
    throw new AdapterFailure('oversized_response')
  }
  const content = rawContent.trim()
  if (!content) throw new AdapterFailure('invalid_response')

  const allowedModels = new Set([config.primaryModel, config.fallbackModel])
  if (typeof payload.model !== 'string' || !allowedModels.has(payload.model)) {
    throw new AdapterFailure('invalid_response')
  }

  const routing = safeRouterMetadata(payload.openrouter_metadata, payload.model, [
    config.primaryModel,
    config.fallbackModel,
  ])

  return {
    content,
    model: payload.model,
    ...routing,
    usage: safeUsage(payload.usage),
  }
}

async function runOpenRouterRequest(
  input: EnhanceReadinessReportInput,
  fetchImpl: OpenRouterFetch,
  controller: AbortController,
): Promise<OpenRouterEnhancementOutcome> {
  const { config, deterministicReport, manifest } = input
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${config.apiKey}`,
    'Content-Type': 'application/json',
    'X-OpenRouter-Cache': 'false',
    'X-OpenRouter-Metadata': 'enabled',
  }

  if (config.siteURL) {
    headers['HTTP-Referer'] = config.siteURL
    headers['X-OpenRouter-Title'] = openRouterTitle
  }

  let requestBody: string

  try {
    requestBody = JSON.stringify({
      max_completion_tokens: config.maxCompletionTokens,
      messages: buildReadinessModelMessages(manifest, deterministicReport),
      models: [config.primaryModel, config.fallbackModel],
      plugins: disabledOpenRouterPlugins,
      provider: {
        allow_fallbacks: true,
        data_collection: 'deny',
        require_parameters: true,
        zdr: true,
      },
      response_format: buildReadinessModelResponseFormat(deterministicReport),
      stream: false,
      temperature: 0,
    })
  } catch {
    throw new AdapterFailure('invalid_response')
  }

  let response: Response

  try {
    response = await fetchImpl(openRouterChatCompletionsURL, {
      body: requestBody,
      cache: 'no-store',
      headers,
      method: 'POST',
      redirect: 'error',
      signal: controller.signal,
    })
  } catch {
    throw new AdapterFailure(controller.signal.aborted ? 'timeout' : 'network')
  }

  if (response.redirected || !response.ok) {
    await cancelResponse(response)
    throw new AdapterFailure('http')
  }

  let responseText: string
  try {
    responseText = await readResponseText(response)
  } catch (error) {
    if (error instanceof AdapterFailure) throw error
    throw new AdapterFailure(controller.signal.aborted ? 'timeout' : 'network')
  }

  const parsedResponse = parseOpenRouterResponse(responseText, config)
  let modelValue: unknown

  try {
    modelValue = JSON.parse(parsedResponse.content)
  } catch {
    throw new AdapterFailure('invalid_model_output')
  }

  let validatedModel
  try {
    validatedModel = validateReadinessModelResponse(modelValue, deterministicReport)
  } catch {
    throw new AdapterFailure('invalid_model_output')
  }

  if (!validatedModel.ok) throw new AdapterFailure('invalid_model_output')

  let merged
  try {
    merged = mergeReadinessModelResponse(deterministicReport, validatedModel.value)
  } catch {
    throw new AdapterFailure('invalid_model_output')
  }

  if (!merged.ok) throw new AdapterFailure('invalid_model_output')

  return {
    model: parsedResponse.model,
    ok: true,
    provider: parsedResponse.provider,
    report: merged.report,
    routingStrategy: parsedResponse.routingStrategy,
    usage: parsedResponse.usage,
  }
}

export async function enhanceReadinessReport(
  input: EnhanceReadinessReportInput,
): Promise<OpenRouterEnhancementOutcome> {
  const fetchImpl = input.fetchImpl ?? globalThis.fetch
  const controller = new AbortController()
  let timeout: ReturnType<typeof setTimeout> | undefined

  const timeoutResult = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      controller.abort()
      reject(new AdapterFailure('timeout'))
    }, input.config.timeoutMs)
  })

  try {
    return await Promise.race([runOpenRouterRequest(input, fetchImpl, controller), timeoutResult])
  } catch (error) {
    return fail(
      input.deterministicReport,
      error instanceof AdapterFailure ? error.reason : 'invalid_response',
    )
  } finally {
    if (timeout !== undefined) clearTimeout(timeout)
  }
}
