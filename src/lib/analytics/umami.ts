export type UmamiAnalyticsConfig = {
  domains: string
  scriptUrl: string
  websiteId: string
}

type AnalyticsEnvironment = Record<string, string | undefined>

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const normalizeScriptURL = (value: string | undefined): string | undefined => {
  if (!value?.trim()) return undefined

  try {
    const url = new URL(value.trim())

    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname === '/'
    ) {
      return undefined
    }

    return url.toString()
  } catch {
    return undefined
  }
}

const normalizeDomains = (value: string | undefined): string | undefined => {
  const candidates = (value ?? 'saberistic.com,www.saberistic.com')
    .split(',')
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean)

  if (candidates.length === 0) return undefined

  const domains = [...new Set(candidates)]

  for (const domain of domains) {
    try {
      const url = new URL(`https://${domain}`)

      if (
        url.hostname !== domain ||
        url.port ||
        url.pathname !== '/' ||
        url.search ||
        url.hash
      ) {
        return undefined
      }
    } catch {
      return undefined
    }
  }

  return domains.join(',')
}

export const resolveUmamiAnalyticsConfig = (
  environment: AnalyticsEnvironment,
): UmamiAnalyticsConfig | null => {
  const scriptUrl = normalizeScriptURL(environment.UMAMI_SCRIPT_URL)
  const websiteId = environment.UMAMI_WEBSITE_ID?.trim()
  const domains = normalizeDomains(environment.UMAMI_TRACK_DOMAINS)

  if (!scriptUrl || !websiteId || !uuidPattern.test(websiteId) || !domains) return null

  return { domains, scriptUrl, websiteId }
}
