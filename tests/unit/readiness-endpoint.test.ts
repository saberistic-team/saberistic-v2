import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  readinessAssessmentEndpoint,
  readinessDiagnosticEndpoint,
} from '../../apps/site/src/lib/readiness-endpoint'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('static readiness assessment endpoint', () => {
  it('uses HTTPS and replaces any configured path, query, and fragment', () => {
    expect(
      readinessAssessmentEndpoint(
        '  https://backend.example:8443/cms/path?token=must-be-removed#fragment  ',
      ),
    ).toBe('https://backend.example:8443/api/readiness/assess')
    expect(
      readinessDiagnosticEndpoint(
        '  https://backend.example:8443/cms/path?token=must-be-removed#fragment  ',
      ),
    ).toBe('https://backend.example:8443/api/diagnostics/requests')
  })

  it.each([
    ['http://localhost:3000', 'http://localhost:3000/api/readiness/assess'],
    ['http://127.0.0.1:3100/base', 'http://127.0.0.1:3100/api/readiness/assess'],
  ])('allows the exact local HTTP exception for %s', (configured, expected) => {
    expect(readinessAssessmentEndpoint(configured)).toBe(expected)
  })

  it.each([
    'http://backend.example',
    'http://localhost.example.com',
    'http://127.0.0.2:3000',
    'ftp://backend.example',
    'javascript:alert(1)',
  ])('rejects a non-HTTPS, non-local backend: %s', (configured) => {
    expect(() => readinessAssessmentEndpoint(configured, 'remote')).toThrow(
      'PAYLOAD_PUBLIC_URL must identify the HTTPS readiness backend',
    )
  })

  it.each(['', '   ', 'not a URL', '://backend.example'])(
    'falls back to the relative endpoint for missing or malformed configuration: %j',
    (value) => {
      expect(() => readinessAssessmentEndpoint(value, 'remote')).toThrow(
        'PAYLOAD_PUBLIC_URL must identify the HTTPS readiness backend',
      )
    },
  )

  it('fails closed without an ambient backend in remote content mode', () => {
    vi.stubEnv('PAYLOAD_PUBLIC_URL', '')
    vi.stubEnv('STATIC_CONTENT_MODE', 'remote')

    expect(() => readinessAssessmentEndpoint()).toThrow(
      'PAYLOAD_PUBLIC_URL must identify the HTTPS readiness backend',
    )
  })

  it('rejects a credential-bearing backend URL instead of exposing it to the client', () => {
    expect(() =>
      readinessAssessmentEndpoint('https://user:password@backend.example/internal', 'remote'),
    ).toThrow('PAYLOAD_PUBLIC_URL must identify the HTTPS readiness backend')
  })

  it('allows a relative placeholder only for the non-deployable fixture export', () => {
    expect(readinessAssessmentEndpoint(undefined, 'fixture')).toBe('/api/readiness/assess')
    expect(readinessDiagnosticEndpoint(undefined, 'fixture')).toBe('/api/diagnostics/requests')
  })

  it('fails closed when the static diagnostic backend is not configured', () => {
    expect(() => readinessDiagnosticEndpoint(undefined, 'remote')).toThrow(
      'PAYLOAD_PUBLIC_URL must identify the HTTPS diagnostic backend',
    )
  })
})
