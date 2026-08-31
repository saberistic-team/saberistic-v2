import 'server-only'

export class DiagnosticBodyFailure extends Error {
  constructor(readonly reason: 'empty' | 'invalid_encoding' | 'oversized') {
    super(reason)
    this.name = 'DiagnosticBodyFailure'
  }
}

function originOf(value: string | undefined): string | null {
  if (!value?.trim()) return null
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

export function allowedDiagnosticOrigins(
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

export function validatedDiagnosticOrigin(
  request: Request,
  environment: NodeJS.ProcessEnv = process.env,
): string | null {
  const origin = originOf(request.headers.get('origin') ?? undefined)
  return origin && allowedDiagnosticOrigins(request, environment).has(origin) ? origin : null
}

export function diagnosticHeaders(origin: string | null, cors = true): HeadersInit {
  return {
    ...(cors && origin ? { 'Access-Control-Allow-Origin': origin } : {}),
    ...(cors
      ? {
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Max-Age': '600',
          Vary: 'Origin',
        }
      : {}),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  }
}

export function diagnosticJSONResponse(
  origin: string | null,
  body: unknown,
  status = 200,
  cors = true,
): Response {
  const headers = new Headers(diagnosticHeaders(origin, cors))
  headers.set('Content-Type', 'application/json; charset=utf-8')
  return Response.json(body, { headers, status })
}

export function diagnosticMediaType(request: Request): string {
  return request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase() ?? ''
}

export async function readBoundedDiagnosticText(
  request: Request,
  maximumBytes: number,
): Promise<string> {
  const contentLength = request.headers.get('content-length')
  const declaredLength = contentLength === null ? Number.NaN : Number(contentLength)
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    throw new DiagnosticBodyFailure('oversized')
  }
  if (!request.body) throw new DiagnosticBodyFailure('empty')

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const result = await reader.read()
      if (result.done) break
      if (!result.value) continue
      length += result.value.byteLength
      if (length > maximumBytes) {
        try {
          await reader.cancel()
        } catch {
          // The bounded rejection is already final.
        }
        throw new DiagnosticBodyFailure('oversized')
      }
      chunks.push(result.value)
    }
  } finally {
    reader.releaseLock()
  }

  if (length === 0) throw new DiagnosticBodyFailure('empty')
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    throw new DiagnosticBodyFailure('invalid_encoding')
  }
}
