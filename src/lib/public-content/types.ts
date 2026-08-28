export const prototypeStatuses = [
  'concept',
  'prototype',
  'alpha',
  'beta',
  'live',
  'archived',
] as const

export type PrototypeStatus = (typeof prototypeStatuses)[number]

export type AvailabilityStatus = 'unchecked' | 'available' | 'degraded' | 'unavailable' | 'retired'

export type DataClassification =
  'none' | 'synthetic-only' | 'non-sensitive' | 'account-data' | 'sensitive'

export type PublicPrototype = {
  id: string
  title: string
  slug: string
  summary: string
  story?: string
  status: PrototypeStatus
  problem?: string
  decisions: Array<{ detail: string; title: string }>
  limitations: string[]
  dataClassification: DataClassification
  safetyNotice: string
  dataHandlingNotes?: string
  availabilityStatus: AvailabilityStatus
  availabilityMessage?: string
  availabilityCheckedAt?: string
  appUrl?: string
  sourceUrl?: string
  sourceRelation?: string
  sourceLicense?: string
  sourceLastCheckedAt?: string
  lastVerifiedAt?: string
  updatedAt?: string
  featured: boolean
  canLaunch: boolean
}

export type PublicContentState = 'ready' | 'empty' | 'unavailable'

export type PublicPrototypeList = {
  items: PublicPrototype[]
  state: PublicContentState
}

export type PublicPrototypeDetail = {
  item: PublicPrototype | null
  state: 'ready' | 'not-found' | 'unavailable'
}

export type HomepagePrototypeFeed = PublicPrototypeList & {
  kind: 'featured' | 'recent'
}
