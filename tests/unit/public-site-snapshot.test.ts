import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchPublicSiteSnapshot } from '../../apps/site/src/lib/snapshot-source'
import { mapListStrict } from '@/lib/public-content/mapping'
import { parsePublicSiteSnapshot, type PublicSiteSnapshot } from '@/lib/public-content/snapshot'
import type { PublicPrototype } from '@/lib/public-content/types'

const prototype: PublicPrototype = {
  availabilityStatus: 'unchecked',
  canLaunch: false,
  dataClassification: 'none',
  decisions: [],
  featured: false,
  id: 'prototype-1',
  limitations: [],
  safetyNotice: 'Use disposable test information only.',
  slug: 'prototype-one',
  status: 'concept',
  summary: 'A public prototype summary.',
  title: 'Prototype One',
}

const snapshot: PublicSiteSnapshot = {
  contentRevision: 'a'.repeat(64),
  generatedAt: '2026-08-30T12:00:00.000Z',
  homepage: { items: [prototype], kind: 'recent', state: 'ready' },
  prototypes: { items: [prototype], state: 'ready' },
  version: 1,
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('public site snapshot validation', () => {
  it('accepts a complete versioned snapshot', () => {
    expect(parsePublicSiteSnapshot(snapshot)).toEqual(snapshot)
  })

  it('rejects duplicate public slugs', () => {
    expect(() =>
      parsePublicSiteSnapshot({
        ...snapshot,
        prototypes: {
          items: [prototype, { ...prototype, id: 'prototype-2' }],
          state: 'ready',
        },
      }),
    ).toThrow('duplicate public prototype identifiers')
  })

  it('fails closed when Payload truncates or cannot map a published record', () => {
    expect(mapListStrict({ docs: [prototype], hasNextPage: true, totalDocs: 2 })).toEqual({
      items: [],
      state: 'unavailable',
    })
    expect(mapListStrict({ docs: [{ id: 'missing-public-fields' }], totalDocs: 1 })).toEqual({
      items: [],
      state: 'unavailable',
    })
  })
})

describe('static content preparation', () => {
  it('fetches the versioned CMS endpoint once and validates the response', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify(snapshot), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }),
    )

    await expect(
      fetchPublicSiteSnapshot({
        attempts: 1,
        cmsURL: 'https://cms.example.com',
        fetchImpl: fetchImpl as unknown as typeof fetch,
        mode: 'remote',
        retryDelayMs: 0,
      }),
    ).resolves.toEqual(snapshot)

    const calls = fetchImpl.mock.calls as unknown as Array<[URL, RequestInit]>
    expect(fetchImpl).toHaveBeenCalledOnce()
    expect(String(calls[0]?.[0])).toBe('https://cms.example.com/api/public/site-snapshot/v1')
    expect(calls[0]?.[1]).toEqual(expect.objectContaining({ redirect: 'error' }))
  })

  it('refuses reviewed fixture content inside Render', async () => {
    vi.stubEnv('RENDER', 'true')

    await expect(fetchPublicSiteSnapshot({ mode: 'fixture' })).rejects.toThrow(
      'Fixture content is forbidden',
    )
  })

  it('fails the build for an invalid CMS response', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response('{"version":1}', {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }),
    )

    await expect(
      fetchPublicSiteSnapshot({
        attempts: 1,
        cmsURL: 'https://cms.example.com',
        fetchImpl: fetchImpl as unknown as typeof fetch,
        mode: 'remote',
        retryDelayMs: 0,
      }),
    ).rejects.toThrow('Unable to build the public site snapshot')
  })
})
