import 'server-only'

import { readinessPolicyVersion } from '../types'

const modelPattern = /^[a-z0-9][a-z0-9._~-]*\/[a-z0-9][a-z0-9._~-]*$/i

function boundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback
}

function configuredModel(value: string | undefined): string | null {
  const model = value?.trim()

  if (
    !model ||
    model.toLowerCase().startsWith('openrouter/') ||
    /(?:^|[-_/:])(?:auto|latest)(?:$|[-_:])/i.test(model) ||
    !modelPattern.test(model)
  ) {
    return null
  }
  return model
}

export type OpenRouterReadinessConfig = {
  apiKey: string
  fallbackModel: string
  maxCompletionTokens: number
  primaryModel: string
  siteURL: string | null
  timeoutMs: number
}

export function resolveOpenRouterReadinessConfig(
  environment: NodeJS.ProcessEnv = process.env,
): OpenRouterReadinessConfig | null {
  if (
    environment.AI_ENHANCEMENT_ENABLED !== '1' ||
    environment.OPENROUTER_ACCOUNT_GATES_CONFIRMED !== readinessPolicyVersion
  ) {
    return null
  }

  const apiKey = environment.OPENROUTER_API_KEY?.trim()
  const primaryModel = configuredModel(environment.OPENROUTER_PRIMARY_MODEL)
  const fallbackModel = configuredModel(environment.OPENROUTER_FALLBACK_MODEL)

  if (
    !apiKey ||
    !primaryModel ||
    !fallbackModel ||
    primaryModel.toLowerCase() === fallbackModel.toLowerCase()
  ) {
    return null
  }

  let siteURL: string | null = null
  const configuredSiteURL = environment.PUBLIC_SITE_URL?.trim() || environment.SITE_URL?.trim()

  if (configuredSiteURL) {
    try {
      siteURL = new URL(configuredSiteURL).origin
    } catch {
      siteURL = null
    }
  }

  return {
    apiKey,
    fallbackModel,
    maxCompletionTokens: boundedInteger(
      environment.OPENROUTER_MAX_COMPLETION_TOKENS,
      1_800,
      600,
      4_000,
    ),
    primaryModel,
    siteURL,
    timeoutMs: boundedInteger(environment.OPENROUTER_TIMEOUT_MS, 12_000, 3_000, 25_000),
  }
}

export function readinessAIIsConfigured(environment: NodeJS.ProcessEnv = process.env): boolean {
  const rateLimitSecret = environment.READINESS_RATE_LIMIT_SECRET?.trim()

  return Boolean(
    resolveOpenRouterReadinessConfig(environment) &&
    environment.REDIS_URL?.trim() &&
    rateLimitSecret &&
    rateLimitSecret.length >= 32 &&
    !rateLimitSecret.startsWith('replace-with-'),
  )
}
