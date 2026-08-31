function backendURL(value: string | undefined, pathname: string): URL | null {
  const candidate = value?.trim()
  if (!candidate) return null

  try {
    const url = new URL(candidate)
    const isLocal = url.hostname === '127.0.0.1' || url.hostname === 'localhost'

    if (
      url.username ||
      url.password ||
      (url.protocol !== 'https:' && !(isLocal && url.protocol === 'http:'))
    ) {
      return null
    }

    url.pathname = pathname
    url.search = ''
    url.hash = ''
    return url
  } catch {
    return null
  }
}

export function readinessAssessmentEndpoint(
  value: string | undefined = process.env.PAYLOAD_PUBLIC_URL,
  contentMode: string | undefined = process.env.STATIC_CONTENT_MODE,
): string {
  const endpoint = backendURL(value, '/api/readiness/assess')?.toString()
  if (endpoint) return endpoint

  if (contentMode === 'fixture') return '/api/readiness/assess'

  throw new Error(
    'PAYLOAD_PUBLIC_URL must identify the HTTPS readiness backend for a remote static-site build.',
  )
}

export function readinessDiagnosticEndpoint(
  value: string | undefined = process.env.PAYLOAD_PUBLIC_URL,
  contentMode: string | undefined = process.env.STATIC_CONTENT_MODE,
): string {
  const endpoint = backendURL(value, '/api/diagnostics/requests')?.toString()
  if (endpoint) return endpoint

  if (contentMode === 'fixture') return '/api/diagnostics/requests'

  throw new Error(
    'PAYLOAD_PUBLIC_URL must identify the HTTPS diagnostic backend for a remote static-site build.',
  )
}
