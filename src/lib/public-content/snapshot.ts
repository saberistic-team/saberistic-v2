import {
  prototypeStatuses,
  type HomepagePrototypeFeed,
  type PublicPrototype,
  type PublicPrototypeList,
} from './types'

export const publicSiteSnapshotVersion = 1 as const

export type PublicSiteSnapshot = {
  contentRevision: string
  generatedAt: string
  homepage: HomepagePrototypeFeed
  prototypes: PublicPrototypeList
  version: typeof publicSiteSnapshotVersion
}

type UnknownRecord = Record<string, unknown>

const availabilityStatuses = [
  'unchecked',
  'available',
  'degraded',
  'unavailable',
  'retired',
] as const
const dataClassifications = [
  'none',
  'synthetic-only',
  'non-sensitive',
  'account-data',
  'sensitive',
] as const

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string'
}

function isHTTPURL(value: unknown): value is string {
  if (typeof value !== 'string') return false

  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

function isOptionalHTTPURL(value: unknown): value is string | undefined {
  return value === undefined || isHTTPURL(value)
}

function isPublicPrototype(value: unknown): value is PublicPrototype {
  if (!isRecord(value)) return false

  const decisionsValid =
    Array.isArray(value.decisions) &&
    value.decisions.every(
      (decision) =>
        isRecord(decision) &&
        typeof decision.detail === 'string' &&
        typeof decision.title === 'string',
    )
  const limitationsValid =
    Array.isArray(value.limitations) && value.limitations.every((item) => typeof item === 'string')

  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.slug === 'string' &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug) &&
    typeof value.summary === 'string' &&
    prototypeStatuses.includes(value.status as (typeof prototypeStatuses)[number]) &&
    dataClassifications.includes(
      value.dataClassification as (typeof dataClassifications)[number],
    ) &&
    availabilityStatuses.includes(
      value.availabilityStatus as (typeof availabilityStatuses)[number],
    ) &&
    typeof value.safetyNotice === 'string' &&
    typeof value.featured === 'boolean' &&
    typeof value.canLaunch === 'boolean' &&
    decisionsValid &&
    limitationsValid &&
    isOptionalString(value.story) &&
    isOptionalString(value.problem) &&
    isOptionalString(value.dataHandlingNotes) &&
    isOptionalString(value.availabilityMessage) &&
    isOptionalString(value.availabilityCheckedAt) &&
    isOptionalString(value.sourceRelation) &&
    isOptionalString(value.sourceLicense) &&
    isOptionalString(value.sourceLastCheckedAt) &&
    isOptionalString(value.lastVerifiedAt) &&
    isOptionalString(value.updatedAt) &&
    isOptionalHTTPURL(value.appUrl) &&
    isOptionalHTTPURL(value.sourceUrl) &&
    (!value.canLaunch || Boolean(value.appUrl))
  )
}

function isPrototypeList(value: unknown): value is PublicPrototypeList {
  if (!isRecord(value) || !Array.isArray(value.items)) return false
  if (value.state !== 'ready' && value.state !== 'empty') return false
  if (!value.items.every(isPublicPrototype)) return false

  return (value.state === 'ready') === value.items.length > 0
}

function isHomepageFeed(value: unknown): value is HomepagePrototypeFeed {
  if (!isRecord(value) || !isPrototypeList(value)) return false
  const kind = (value as UnknownRecord).kind
  return kind === 'featured' || kind === 'recent'
}

export function parsePublicSiteSnapshot(value: unknown): PublicSiteSnapshot {
  if (!isRecord(value)) throw new Error('The CMS snapshot is not an object.')

  if (value.version !== publicSiteSnapshotVersion) {
    throw new Error('The CMS snapshot version is not supported.')
  }

  if (typeof value.generatedAt !== 'string' || Number.isNaN(Date.parse(value.generatedAt))) {
    throw new Error('The CMS snapshot does not have a valid generation time.')
  }

  if (typeof value.contentRevision !== 'string' || !/^[a-f0-9]{64}$/.test(value.contentRevision)) {
    throw new Error('The CMS snapshot does not have a valid content revision.')
  }

  if (!isPrototypeList(value.prototypes) || !isHomepageFeed(value.homepage)) {
    throw new Error('The CMS snapshot has an invalid public content shape.')
  }

  const prototypeSlugs = value.prototypes.items.map((item) => item.slug)
  const prototypeIDs = value.prototypes.items.map((item) => item.id)
  if (
    new Set(prototypeSlugs).size !== prototypeSlugs.length ||
    new Set(prototypeIDs).size !== prototypeIDs.length
  ) {
    throw new Error('The CMS snapshot contains duplicate public prototype identifiers.')
  }

  const homepageSlugs = value.homepage.items.map((item) => item.slug)
  if (new Set(homepageSlugs).size !== homepageSlugs.length) {
    throw new Error('The CMS snapshot contains a duplicate homepage prototype.')
  }

  const publicSlugs = new Set(prototypeSlugs)
  if (value.homepage.items.some((item) => !publicSlugs.has(item.slug))) {
    throw new Error('The homepage snapshot references a non-public prototype.')
  }

  return value as PublicSiteSnapshot
}
