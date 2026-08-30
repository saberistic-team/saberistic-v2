import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  parsePublicSiteSnapshot,
  publicSiteSnapshotVersion,
  type PublicSiteSnapshot,
} from '@/lib/public-content/snapshot'
import type { PublicPrototype } from '@/lib/public-content/types'

type StaticContentMode = 'fixture' | 'remote'

type FetchPublicSiteSnapshotOptions = {
  attempts?: number
  cmsURL?: string
  fetchImpl?: typeof fetch
  mode?: StaticContentMode
  retryDelayMs?: number
}

const maximumSnapshotBytes = 2 * 1024 * 1024
const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export const generatedSnapshotPath = path.resolve(dirname, '../../.generated/public-content.json')

const fixtureItems: PublicPrototype[] = [
  {
    appUrl: 'https://backthen-mu.vercel.app/',
    availabilityStatus: 'available',
    canLaunch: true,
    dataClassification: 'synthetic-only',
    decisions: [
      {
        detail:
          'Any public demonstration must use sample memories until authentication and storage are reviewed.',
        title: 'Synthetic demo boundary',
      },
    ],
    featured: false,
    id: 'fixture-backthen',
    lastVerifiedAt: '2026-08-29T12:00:00.000Z',
    limitations: ['Fixture content is used only to validate the static build.'],
    problem: 'Personal histories are often scattered across messages, photos, and recordings.',
    safetyNotice: 'Use sample memories only; do not enter personal or sensitive information.',
    slug: 'backthen',
    sourceLicense: 'MIT',
    sourceRelation: 'organization_owned',
    sourceUrl: 'https://github.com/saberistic-team/back-then',
    status: 'prototype',
    story: 'BackThen explores a more intentional way to preserve personal stories.',
    summary:
      'A mobile-first life-story prototype that turns recurring prompts into an organized archive.',
    title: 'BackThen',
    updatedAt: '2026-08-29T15:15:50.804Z',
  },
  {
    appUrl: 'https://story-sprout-pay.lovable.app/',
    availabilityStatus: 'available',
    canLaunch: true,
    dataClassification: 'synthetic-only',
    decisions: [
      {
        detail: 'The public candidate must not create real charges before payment review.',
        title: 'Payment-disabled fallback',
      },
    ],
    featured: false,
    id: 'fixture-story-sprout-pay',
    lastVerifiedAt: '2026-08-29T12:00:00.000Z',
    limitations: ['Fixture content is used only to validate the static build.'],
    problem: 'Collaborative stories need understandable contribution and reward rules.',
    safetyNotice: 'Payment-disabled sandbox only. Use disposable test content.',
    slug: 'story-sprout-pay',
    sourceLicense: 'NOASSERTION',
    sourceRelation: 'organization_owned',
    sourceUrl: 'https://github.com/saberistic-team/story-sprout-pay',
    status: 'prototype',
    story: 'Story Sprout Pay explores collaborative branching stories and creator rewards.',
    summary:
      'A collaborative branching-story concept combining AI-assisted writing and paid contributions.',
    title: 'Story Sprout Pay',
    updatedAt: '2026-08-29T15:16:09.805Z',
  },
]

const fixtureSnapshot: PublicSiteSnapshot = {
  contentRevision: '0'.repeat(64),
  generatedAt: '2026-08-30T00:00:00.000Z',
  homepage: {
    items: fixtureItems,
    kind: 'recent',
    state: 'ready',
  },
  prototypes: {
    items: fixtureItems,
    state: 'ready',
  },
  version: publicSiteSnapshotVersion,
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function resolveMode(value = process.env.STATIC_CONTENT_MODE): StaticContentMode {
  if (value === 'fixture' || value === 'remote') return value
  throw new Error('STATIC_CONTENT_MODE must be explicitly set to "remote" or "fixture".')
}

function resolveCMSURL(value: string | undefined): URL {
  const candidate = value?.trim()
  if (!candidate) throw new Error('PAYLOAD_PUBLIC_URL is required in remote content mode.')

  const url = new URL(candidate)
  const isLocal = url.hostname === '127.0.0.1' || url.hostname === 'localhost'

  if (url.protocol !== 'https:' && !(isLocal && url.protocol === 'http:')) {
    throw new Error('PAYLOAD_PUBLIC_URL must use HTTPS outside local development.')
  }

  url.pathname = '/'
  url.search = ''
  url.hash = ''
  return url
}

export async function fetchPublicSiteSnapshot({
  attempts = 18,
  cmsURL = process.env.PAYLOAD_PUBLIC_URL,
  fetchImpl = fetch,
  mode = resolveMode(),
  retryDelayMs = 5_000,
}: FetchPublicSiteSnapshotOptions = {}): Promise<PublicSiteSnapshot> {
  if (mode === 'fixture') {
    if (process.env.RENDER === 'true') {
      throw new Error('Fixture content is forbidden in a Render deployment.')
    }

    return parsePublicSiteSnapshot(fixtureSnapshot)
  }

  const endpoint = new URL('/api/public/site-snapshot/v1', resolveCMSURL(cmsURL))
  let finalError: unknown

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)

    try {
      const response = await fetchImpl(endpoint, {
        headers: { Accept: 'application/json' },
        redirect: 'error',
        signal: controller.signal,
      })

      if (!response.ok) throw new Error(`Payload returned HTTP ${response.status}.`)
      if (!response.headers.get('content-type')?.toLowerCase().includes('application/json')) {
        throw new Error('Payload did not return JSON while waking up.')
      }
      if (response.redirected) throw new Error('Payload redirected the snapshot request.')
      if (response.url && new URL(response.url).origin !== endpoint.origin) {
        throw new Error('Payload returned the snapshot from a different origin.')
      }

      const declaredLength = Number(response.headers.get('content-length'))
      if (Number.isFinite(declaredLength) && declaredLength > maximumSnapshotBytes) {
        throw new Error('Payload returned an oversized snapshot.')
      }

      const body = await response.text()
      if (Buffer.byteLength(body, 'utf8') > maximumSnapshotBytes) {
        throw new Error('Payload returned an oversized snapshot.')
      }

      return parsePublicSiteSnapshot(JSON.parse(body) as unknown)
    } catch (error) {
      finalError = error
      if (attempt < attempts) await delay(retryDelayMs)
    } finally {
      clearTimeout(timeout)
    }
  }

  const reason = finalError instanceof Error ? finalError.message : 'Unknown Payload error.'
  throw new Error(`Unable to build the public site snapshot: ${reason}`)
}

export function readGeneratedPublicSiteSnapshot(): PublicSiteSnapshot {
  const body = readFileSync(generatedSnapshotPath, 'utf8')
  if (Buffer.byteLength(body, 'utf8') > maximumSnapshotBytes) {
    throw new Error('The generated public site snapshot is oversized.')
  }

  return parsePublicSiteSnapshot(JSON.parse(body) as unknown)
}
