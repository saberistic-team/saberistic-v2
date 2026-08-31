import 'server-only'

const restrictedStripeKeyPattern = /^rk_(?:test|live)_[A-Za-z0-9]{16,}$/
const resendKeyPattern = /^re_[A-Za-z0-9_-]{16,}$/
const webhookSecretPattern = /^whsec_[A-Za-z0-9]{16,}$/
const emailAddressPattern =
  /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i

export const diagnosticInternalRecipient = 'inbox@saberistic.com' as const

export type DiagnosticFulfillmentConfig = {
  bookingUrl: string
  resendApiKey: string
  resendFrom: string
}

export type DiagnosticProviderConfig = DiagnosticFulfillmentConfig & {
  publicSiteOrigin: string
  stripeApiKey: string
}

export type DiagnosticWebhookConfig = {
  stripeApiKey: string
  stripeWebhookSecret: string
}

function configuredHTTPSUrl(value: string | undefined): string | null {
  const candidate = value?.trim()
  if (!candidate || candidate.length > 2_048) return null

  try {
    const url = new URL(candidate)
    if (url.protocol !== 'https:' || url.username || url.password) return null
    return url.toString()
  } catch {
    return null
  }
}

function configuredSiteOrigin(environment: NodeJS.ProcessEnv): string | null {
  const candidate = environment.PUBLIC_SITE_URL?.trim() || environment.SITE_URL?.trim()
  if (!candidate) return null

  try {
    const url = new URL(candidate)
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
    if (
      url.username ||
      url.password ||
      (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))
    ) {
      return null
    }
    return url.origin
  } catch {
    return null
  }
}

function configuredSender(value: string | undefined): string | null {
  const address = value?.trim().toLowerCase()
  if (!address || address.length > 254 || !emailAddressPattern.test(address)) return null
  return `Saberistic <${address}>`
}

export function resolveDiagnosticFulfillmentConfig(
  environment: NodeJS.ProcessEnv = process.env,
): DiagnosticFulfillmentConfig | null {
  const bookingUrl = configuredHTTPSUrl(environment.DIAGNOSTIC_BOOKING_URL)
  const resendApiKey = environment.RESEND_API_KEY?.trim()
  const resendFrom = configuredSender(environment.RESEND_FROM_ADDRESS)

  if (!bookingUrl || !resendApiKey || !resendKeyPattern.test(resendApiKey) || !resendFrom) {
    return null
  }

  return { bookingUrl, resendApiKey, resendFrom }
}

export function resolveDiagnosticProviderConfig(
  environment: NodeJS.ProcessEnv = process.env,
): DiagnosticProviderConfig | null {
  if (environment.DIAGNOSTIC_ENABLED !== '1') return null
  const fulfillment = resolveDiagnosticFulfillmentConfig(environment)
  const webhook = resolveDiagnosticWebhookConfig(environment)
  const publicSiteOrigin = configuredSiteOrigin(environment)
  const rateLimitSecret = environment.DIAGNOSTIC_RATE_LIMIT_SECRET?.trim()
  if (
    !fulfillment ||
    !webhook ||
    !publicSiteOrigin ||
    !environment.REDIS_URL?.trim() ||
    !rateLimitSecret ||
    rateLimitSecret.length < 32 ||
    rateLimitSecret.startsWith('replace-with-')
  ) {
    return null
  }
  return { ...fulfillment, publicSiteOrigin, stripeApiKey: webhook.stripeApiKey }
}

export function resolveDiagnosticWebhookConfig(
  environment: NodeJS.ProcessEnv = process.env,
): DiagnosticWebhookConfig | null {
  const stripeApiKey = environment.STRIPE_DIAGNOSTIC_RESTRICTED_KEY?.trim()
  const stripeWebhookSecret = environment.STRIPE_DIAGNOSTIC_WEBHOOK_SECRET?.trim()

  if (
    !stripeApiKey ||
    !restrictedStripeKeyPattern.test(stripeApiKey) ||
    !stripeWebhookSecret ||
    !webhookSecretPattern.test(stripeWebhookSecret)
  ) {
    return null
  }

  return { stripeApiKey, stripeWebhookSecret }
}
