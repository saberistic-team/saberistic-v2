import 'server-only'

function originOf(value: string | undefined): string | null {
  if (!value?.trim()) return null

  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

export function allowedReadinessOrigins(
  request: Request,
  environment: NodeJS.ProcessEnv = process.env,
): Set<string> {
  const origins = new Set<string>()

  for (const value of [
    request.url,
    environment.SITE_URL,
    environment.RENDER_EXTERNAL_URL,
    environment.PUBLIC_SITE_URL,
  ]) {
    const origin = originOf(value)
    if (origin) origins.add(origin)
  }

  if (environment.NODE_ENV !== 'production') {
    origins.add('http://127.0.0.1:3000')
    origins.add('http://localhost:3000')
  }

  return origins
}

export function validatedReadinessOrigin(
  request: Request,
  environment: NodeJS.ProcessEnv = process.env,
): string | null {
  const origin = originOf(request.headers.get('origin') ?? undefined)
  if (!origin) return null

  return allowedReadinessOrigins(request, environment).has(origin) ? origin : null
}

export function readinessCORSHeaders(origin: string | null): HeadersInit {
  return {
    ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '600',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
    'X-Content-Type-Options': 'nosniff',
  }
}
