import 'server-only'

import { readinessPolicyVersion } from '@/lib/readiness/types'

const modelPattern = /^[a-z0-9][a-z0-9._~-]*\/[a-z0-9][a-z0-9._~-]*$/i
const giftWebhookSecretPattern = /^whsec_[A-Za-z0-9]{16,}$/

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
    /(?:^|[-_/:])(?:auto|free|latest|online)(?:$|[-_:])/i.test(model) ||
    !modelPattern.test(model)
  ) {
    return null
  }

  return model
}

function configuredSiteOrigin(environment: NodeJS.ProcessEnv): string | null {
  const value = environment.PUBLIC_SITE_URL?.trim() || environment.SITE_URL?.trim()
  if (!value) return null

  try {
    const url = new URL(value)
    const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
    if (
      url.username ||
      url.password ||
      (url.protocol !== 'https:' && !(isLocal && url.protocol === 'http:'))
    ) {
      return null
    }
    return url.origin
  } catch {
    return null
  }
}

function configuredQuoteSecret(environment: NodeJS.ProcessEnv): string | null {
  const secret = environment.GIFT_QUOTE_SECRET?.trim()
  return secret && secret.length >= 32 && !secret.startsWith('replace-with-') ? secret : null
}

function configuredGiftWebhookSecret(environment: NodeJS.ProcessEnv): string | null {
  const secret = environment.STRIPE_GIFT_WEBHOOK_SECRET?.trim()
  return secret && giftWebhookSecretPattern.test(secret) ? secret : null
}

export type OpenRouterGiftConfig = {
  apiKey: string
  fallbackModel: string
  maxCompletionTokens: number
  primaryModel: string
  quoteSecret: string
  siteOrigin: string | null
  timeoutMs: number
}

export type StripeGiftConfig = {
  apiKey: string
  publicSiteOrigin: string
  quoteSecret: string
}

export type StripeGiftWebhookConfig = StripeGiftConfig & {
  webhookSecret: string
}

function stripeGiftBaseConfig(environment: NodeJS.ProcessEnv): StripeGiftConfig | null {
  const apiKey = environment.STRIPE_RESTRICTED_KEY?.trim()
  const publicSiteOrigin = configuredSiteOrigin(environment)
  const quoteSecret = configuredQuoteSecret(environment)

  if (
    !apiKey ||
    !/^rk_(?:test|live)_[A-Za-z0-9]+$/.test(apiKey) ||
    !publicSiteOrigin ||
    !quoteSecret
  ) {
    return null
  }

  return { apiKey, publicSiteOrigin, quoteSecret }
}

export function resolveOpenRouterGiftConfig(
  environment: NodeJS.ProcessEnv = process.env,
): OpenRouterGiftConfig | null {
  if (
    environment.GIFTING_AI_ENABLED !== '1' ||
    environment.OPENROUTER_ACCOUNT_GATES_CONFIRMED !== readinessPolicyVersion
  ) {
    return null
  }

  const apiKey = environment.OPENROUTER_API_KEY?.trim()
  const primaryModel = configuredModel(environment.OPENROUTER_GIFT_PRIMARY_MODEL)
  const fallbackModel = configuredModel(environment.OPENROUTER_GIFT_FALLBACK_MODEL)
  const quoteSecret = configuredQuoteSecret(environment)

  if (
    !apiKey ||
    !primaryModel ||
    !fallbackModel ||
    !quoteSecret ||
    primaryModel.toLowerCase() === fallbackModel.toLowerCase()
  ) {
    return null
  }

  return {
    apiKey,
    fallbackModel,
    maxCompletionTokens: boundedInteger(
      environment.OPENROUTER_GIFT_MAX_COMPLETION_TOKENS,
      3_000,
      1_500,
      6_000,
    ),
    primaryModel,
    quoteSecret,
    siteOrigin: configuredSiteOrigin(environment),
    timeoutMs: boundedInteger(environment.OPENROUTER_GIFT_TIMEOUT_MS, 60_000, 8_000, 60_000),
  }
}

export function resolveStripeGiftConfig(
  environment: NodeJS.ProcessEnv = process.env,
): StripeGiftConfig | null {
  if (environment.GIFTING_CHECKOUT_ENABLED !== '1' || !configuredGiftWebhookSecret(environment)) {
    return null
  }
  return stripeGiftBaseConfig(environment)
}

export function resolveStripeGiftReadConfig(
  environment: NodeJS.ProcessEnv = process.env,
): StripeGiftConfig | null {
  return stripeGiftBaseConfig(environment)
}

export function resolveStripeGiftWebhookConfig(
  environment: NodeJS.ProcessEnv = process.env,
): StripeGiftWebhookConfig | null {
  const config = stripeGiftBaseConfig(environment)
  const webhookSecret = configuredGiftWebhookSecret(environment)

  if (!config || !webhookSecret) return null
  return { ...config, webhookSecret }
}
