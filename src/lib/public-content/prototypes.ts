import 'server-only'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { cache } from 'react'

import {
  prototypeStatuses,
  type AvailabilityStatus,
  type DataClassification,
  type HomepagePrototypeFeed,
  type PrototypeStatus,
  type PublicPrototype,
  type PublicPrototypeDetail,
  type PublicPrototypeList,
} from './types'

type UnknownRecord = Record<string, unknown>

type PublicPayload = {
  find: (args: UnknownRecord) => Promise<{ docs: unknown[] }>
}

const cardSelect = {
  appUrl: true,
  availabilityCheckedAt: true,
  availabilityMessage: true,
  availabilityStatus: true,
  dataClassification: true,
  featureUntil: true,
  featured: true,
  featuredOrder: true,
  lastVerifiedAt: true,
  launchApproval: true,
  problem: true,
  safetyNotice: true,
  slug: true,
  sourceUrl: true,
  status: true,
  summary: true,
  title: true,
  updatedAt: true,
}

const detailSelect = {
  ...cardSelect,
  dataHandlingNotes: true,
  decisions: true,
  limitations: true,
  sourceProvenance: true,
  story: true,
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : {}
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function asBoolean(value: unknown): boolean {
  return value === true
}

function asSafePublicURL(value: unknown): string | undefined {
  const candidate = asString(value)

  if (!candidate) return undefined

  try {
    const parsed = new URL(candidate)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
      ? parsed.toString()
      : undefined
  } catch {
    return undefined
  }
}

function asStatus(value: unknown): PrototypeStatus {
  return prototypeStatuses.includes(value as PrototypeStatus)
    ? (value as PrototypeStatus)
    : 'concept'
}

function asAvailability(value: unknown): AvailabilityStatus {
  const allowed: AvailabilityStatus[] = [
    'unchecked',
    'available',
    'degraded',
    'unavailable',
    'retired',
  ]

  return allowed.includes(value as AvailabilityStatus) ? (value as AvailabilityStatus) : 'unchecked'
}

function asDataClassification(value: unknown): DataClassification {
  const allowed: DataClassification[] = [
    'none',
    'synthetic-only',
    'non-sensitive',
    'account-data',
    'sensitive',
  ]

  return allowed.includes(value as DataClassification) ? (value as DataClassification) : 'none'
}

function mapDecisions(value: unknown): PublicPrototype['decisions'] {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => {
      const record = asRecord(item)
      const title = asString(record.title)
      const detail = asString(record.detail)

      return title && detail ? { detail, title } : null
    })
    .filter((item): item is { detail: string; title: string } => item !== null)
}

function mapLimitations(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => asString(asRecord(item).text))
    .filter((item): item is string => Boolean(item))
}

function mapPrototype(value: unknown): PublicPrototype | null {
  const doc = asRecord(value)
  const id = asString(doc.id) ?? (typeof doc.id === 'number' ? String(doc.id) : undefined)
  const title = asString(doc.title)
  const slug = asString(doc.slug)
  const summary = asString(doc.summary)

  if (!id || !title || !slug || !summary) return null

  const status = asStatus(doc.status)
  const availabilityStatus = asAvailability(doc.availabilityStatus)
  const launchApproval = asString(doc.launchApproval)
  const candidateAppURL = asSafePublicURL(doc.appUrl)
  const canLaunch = Boolean(
    candidateAppURL &&
    availabilityStatus === 'available' &&
    launchApproval === 'approved' &&
    ['prototype', 'alpha', 'beta', 'live'].includes(status),
  )
  const provenance = asRecord(doc.sourceProvenance)

  return {
    appUrl: canLaunch ? candidateAppURL : undefined,
    availabilityCheckedAt: asString(doc.availabilityCheckedAt),
    availabilityMessage: asString(doc.availabilityMessage),
    availabilityStatus,
    canLaunch,
    dataClassification: asDataClassification(doc.dataClassification),
    dataHandlingNotes: asString(doc.dataHandlingNotes),
    decisions: mapDecisions(doc.decisions),
    featured: asBoolean(doc.featured),
    id,
    lastVerifiedAt: asString(doc.lastVerifiedAt),
    limitations: mapLimitations(doc.limitations),
    problem: asString(doc.problem),
    safetyNotice:
      asString(doc.safetyNotice) ??
      'This is an early build. Use only disposable, non-sensitive information.',
    slug,
    sourceLastCheckedAt: asString(provenance.sourceLastCheckedAt),
    sourceLicense: asString(provenance.licenseSpdxExpression),
    sourceRelation: asString(provenance.relation),
    sourceUrl: asSafePublicURL(doc.sourceUrl),
    status,
    story: asString(doc.story),
    summary,
    title,
    updatedAt: asString(doc.updatedAt),
  }
}

async function publicFind(args: UnknownRecord): Promise<{ docs: unknown[] } | null> {
  try {
    const payload = (await getPayload({ config: configPromise })) as unknown as PublicPayload

    return await payload.find({
      ...args,
      depth: 1,
      overrideAccess: false,
    })
  } catch (error) {
    const errorName = error instanceof Error ? error.name : 'UnknownError'
    console.error(`[public-content] Payload query unavailable (${errorName})`)
    return null
  }
}

function mapList(result: { docs: unknown[] } | null): PublicPrototypeList {
  if (!result) return { items: [], state: 'unavailable' }

  const items = result.docs
    .map(mapPrototype)
    .filter((item): item is PublicPrototype => item !== null)

  return { items, state: items.length ? 'ready' : 'empty' }
}

export const getPublicPrototypes = cache(async (): Promise<PublicPrototypeList> => {
  const result = await publicFind({
    collection: 'prototypes',
    limit: 100,
    select: cardSelect,
    sort: '-updatedAt',
    where: {
      _status: { equals: 'published' },
    },
  })

  return mapList(result)
})

export const getHomepagePrototypes = cache(async (): Promise<HomepagePrototypeFeed> => {
  const now = new Date().toISOString()
  const featured = await publicFind({
    collection: 'prototypes',
    limit: 3,
    select: cardSelect,
    sort: ['featuredOrder', '-updatedAt'],
    where: {
      and: [
        { _status: { equals: 'published' } },
        { featured: { equals: true } },
        { status: { not_equals: 'archived' } },
        {
          or: [{ featureUntil: { exists: false } }, { featureUntil: { greater_than: now } }],
        },
      ],
    },
  })
  const featuredList = mapList(featured)

  if (featuredList.state === 'unavailable') {
    return { ...featuredList, kind: 'featured' }
  }

  if (featuredList.items.length) {
    return { ...featuredList, kind: 'featured' }
  }

  const recent = await publicFind({
    collection: 'prototypes',
    limit: 3,
    select: cardSelect,
    sort: '-updatedAt',
    where: {
      and: [{ _status: { equals: 'published' } }, { status: { not_equals: 'archived' } }],
    },
  })

  return { ...mapList(recent), kind: 'recent' }
})

export const getPublicPrototypeBySlug = cache(
  async (slug: string): Promise<PublicPrototypeDetail> => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return { item: null, state: 'not-found' }
    }

    const result = await publicFind({
      collection: 'prototypes',
      limit: 1,
      select: detailSelect,
      where: {
        and: [{ _status: { equals: 'published' } }, { slug: { equals: slug } }],
      },
    })

    if (!result) return { item: null, state: 'unavailable' }

    const item = result.docs.length ? mapPrototype(result.docs[0]) : null
    return item ? { item, state: 'ready' } : { item: null, state: 'not-found' }
  },
)
