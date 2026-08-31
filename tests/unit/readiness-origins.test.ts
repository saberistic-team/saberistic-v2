import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  allowedReadinessOrigins,
  readinessCORSHeaders,
  validatedReadinessOrigin,
} from '@/lib/readiness/server/origins'

const routeURL = 'https://request.example/api/readiness/assess'

const productionEnvironment = (): NodeJS.ProcessEnv => ({
  NODE_ENV: 'production',
  PUBLIC_SITE_URL: 'https://public.example/readiness?profile=ai-saas',
  RENDER_EXTERNAL_URL: 'https://render.example/internal/path',
  SITE_URL: 'https://cms.example/admin',
})

function request(origin?: string, extraHeaders?: HeadersInit) {
  return new Request(routeURL, {
    headers: {
      ...(origin === undefined ? {} : { Origin: origin }),
      ...extraHeaders,
    },
  })
}

describe('readiness origin validation', () => {
  it('allows only the exact request and configured origins in production', () => {
    const origins = allowedReadinessOrigins(request(), productionEnvironment())

    expect([...origins].sort()).toEqual(
      [
        'https://cms.example',
        'https://public.example',
        'https://render.example',
        'https://request.example',
      ].sort(),
    )
    expect(origins).not.toContain('https://public.example.evil.invalid')
    expect(origins).not.toContain('https://public.example:444')
  })

  it.each([
    'https://request.example',
    'https://cms.example',
    'https://render.example',
    'https://public.example',
  ])('accepts an exact allowed request Origin: %s', (origin) => {
    expect(validatedReadinessOrigin(request(origin), productionEnvironment())).toBe(origin)
  })

  it.each([
    'https://public.example.evil.invalid',
    'https://public.example:444',
    'http://public.example',
    'not an origin',
    'null',
  ])('rejects an unconfigured or malformed request Origin: %s', (origin) => {
    expect(validatedReadinessOrigin(request(origin), productionEnvironment())).toBeNull()
  })

  it('requires the Origin header even when a same-site Referer is present', () => {
    const withoutOrigin = request(undefined, { Referer: 'https://public.example/readiness' })

    expect(validatedReadinessOrigin(withoutOrigin, productionEnvironment())).toBeNull()
  })

  it('ignores malformed configured URLs without widening the allowlist', () => {
    const environment = productionEnvironment()
    environment.SITE_URL = 'not a URL'
    environment.RENDER_EXTERNAL_URL = ''
    environment.PUBLIC_SITE_URL = '://invalid'

    expect([...allowedReadinessOrigins(request(), environment)]).toEqual([
      'https://request.example',
    ])
  })

  it('adds the two fixed local origins outside production but not in production', () => {
    const development = allowedReadinessOrigins(request(), { NODE_ENV: 'development' })
    const production = allowedReadinessOrigins(request(), { NODE_ENV: 'production' })

    expect(development).toContain('http://localhost:3000')
    expect(development).toContain('http://127.0.0.1:3000')
    expect(production).not.toContain('http://localhost:3000')
    expect(production).not.toContain('http://127.0.0.1:3000')

    expect(validatedReadinessOrigin(request('http://localhost:3000'), { NODE_ENV: 'test' })).toBe(
      'http://localhost:3000',
    )
    expect(
      validatedReadinessOrigin(request('http://localhost:3001'), { NODE_ENV: 'test' }),
    ).toBeNull()
  })
})

describe('readiness CORS headers', () => {
  it('reflects only the validated origin and declares the narrow request contract', () => {
    const headers = new Headers(readinessCORSHeaders('https://public.example'))

    expect(headers.get('Access-Control-Allow-Origin')).toBe('https://public.example')
    expect(headers.get('Access-Control-Allow-Headers')).toBe('Content-Type')
    expect(headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS')
    expect(headers.get('Access-Control-Max-Age')).toBe('600')
    expect(headers.get('Cache-Control')).toBe('no-store')
    expect(headers.get('Vary')).toBe('Origin')
    expect(headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(headers.has('Access-Control-Allow-Credentials')).toBe(false)
  })

  it('omits Access-Control-Allow-Origin when validation did not produce an origin', () => {
    const headers = new Headers(readinessCORSHeaders(null))

    expect(headers.has('Access-Control-Allow-Origin')).toBe(false)
    expect(headers.get('Cache-Control')).toBe('no-store')
    expect(headers.get('Vary')).toBe('Origin')
  })
})
