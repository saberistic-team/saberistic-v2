const LOCAL_HOSTS = new Set(['127.0.0.1', '[::1]', 'localhost'])

const asOptionalString = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined
  if (typeof value !== 'string') return undefined

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const parseAllowedURL = (value: unknown): URL | string | undefined => {
  const candidate = asOptionalString(value)
  if (!candidate) return undefined

  let parsed: URL

  try {
    parsed = new URL(candidate)
  } catch {
    return 'Enter a complete URL.'
  }

  if (parsed.username || parsed.password) {
    return 'URLs cannot contain credentials.'
  }

  if (parsed.protocol === 'https:') return parsed

  if (parsed.protocol === 'http:' && LOCAL_HOSTS.has(parsed.hostname)) {
    return parsed
  }

  return 'Use HTTPS. HTTP is allowed only for a local development URL.'
}

export const normalizeSlug = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export const validateSlug = (value: unknown): true | string => {
  if (typeof value !== 'string' || value.length === 0) return 'A slug is required.'
  if (value.length > 100) return 'Use at most 100 characters.'
  if (normalizeSlug(value) !== value) return 'Use lowercase kebab-case.'
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) return 'Use lowercase kebab-case.'

  return true
}

export const validateHttpUrl = (value: unknown): true | string => {
  if (value === null || value === undefined || value === '') return true
  if (typeof value !== 'string') return 'Enter a complete URL.'
  if (value.length > 2048) return 'Use at most 2,048 characters.'

  const result = parseAllowedURL(value)

  return typeof result === 'string' ? result : true
}

export const validateCanonicalOrigin = (value: unknown): true | string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return 'A canonical origin is required.'
  }

  const result = parseAllowedURL(value)
  if (typeof result === 'string') return result
  if (!result) return 'A canonical origin is required.'

  if (result.pathname !== '/' || result.search || result.hash) {
    return 'Use an origin only, without a path, query, or fragment.'
  }

  return true
}
