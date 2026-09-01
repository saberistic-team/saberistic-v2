import 'server-only'

import { isIP } from 'node:net'

const maximumRequestBytes = 24 * 1024

export class GiftRequestBodyFailure extends Error {
  constructor(readonly reason: 'empty' | 'invalid_encoding' | 'oversized') {
    super(reason)
    this.name = 'GiftRequestBodyFailure'
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

export function allowedGiftOrigins(
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

export function validatedGiftOrigin(
  request: Request,
  environment: NodeJS.ProcessEnv = process.env,
): string | null {
  const origin = originOf(request.headers.get('origin') ?? undefined)
  return origin && allowedGiftOrigins(request, environment).has(origin) ? origin : null
}

export function giftCORSHeaders(origin: string | null, methods = 'POST, OPTIONS'): HeadersInit {
  return {
    ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Max-Age': '600',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
    'X-Content-Type-Options': 'nosniff',
  }
}

export function giftJSONResponse(
  origin: string | null,
  body: unknown,
  status = 200,
  methods = 'POST, OPTIONS',
): Response {
  const headers = new Headers(giftCORSHeaders(origin, methods))
  headers.set('Content-Type', 'application/json; charset=utf-8')
  return Response.json(body, { headers, status })
}

export function giftOptionsResponse(
  request: Request,
  environment: NodeJS.ProcessEnv = process.env,
  methods = 'POST, OPTIONS',
): Response {
  const origin = validatedGiftOrigin(request, environment)
  if (!origin) return giftJSONResponse(null, { error: 'Request origin is not allowed.' }, 403)
  return new Response(null, { headers: giftCORSHeaders(origin, methods), status: 204 })
}

export function giftRequestMediaType(request: Request): string {
  return request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase() ?? ''
}

export function giftClientAddress(
  request: Request,
  environment: NodeJS.ProcessEnv = process.env,
): string | null {
  if (environment.NODE_ENV === 'production') {
    if (environment.RENDER !== 'true' || environment.RENDER_SERVICE_TYPE !== 'web') return null

    const address = request.headers.get('cf-connecting-ip')?.trim()
    return address && isIP(address) !== 0 ? address : null
  }

  const localAddress = request.headers.get('x-real-ip')?.trim()
  return localAddress && isIP(localAddress) !== 0 ? localAddress : '127.0.0.1'
}

export async function readBoundedGiftRequestText(request: Request): Promise<string> {
  const contentLength = request.headers.get('content-length')
  const declaredLength = contentLength === null ? Number.NaN : Number(contentLength)

  if (Number.isFinite(declaredLength) && declaredLength > maximumRequestBytes) {
    throw new GiftRequestBodyFailure('oversized')
  }
  if (!request.body) throw new GiftRequestBodyFailure('empty')

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
          // The request is already rejected.
        }
        throw new GiftRequestBodyFailure('oversized')
      }
      chunks.push(result.value)
    }
  } finally {
    reader.releaseLock()
  }

  if (byteLength === 0) throw new GiftRequestBodyFailure('empty')

  const bytes = new Uint8Array(byteLength)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    throw new GiftRequestBodyFailure('invalid_encoding')
  }
}
