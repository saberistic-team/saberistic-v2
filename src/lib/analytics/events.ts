import { prototypeStatuses, type PrototypeStatus } from '@/lib/public-content/types'
import { isPublishedBuildNoteSlug } from '@/lib/build-notes'

export const analyticsCTAs = [
  'architecture_diagnostic',
  'check_readiness',
  'explore_build_notes',
  'explore_prototypes',
] as const

export const analyticsCTAPlacements = [
  'footer',
  'header',
  'home_build_notes',
  'home_hero',
  'home_prototypes',
  'readiness_page',
  'situation',
] as const

export const analyticsServices = [
  'engineering_rescue',
  'fractional_principal_engineer',
  'prototype_to_production',
] as const

export const analyticsPrototypeCardPlacements = ['home', 'index'] as const
export const analyticsBuildNotePlacements = ['home', 'index'] as const
export const analyticsPrototypePlacements = ['detail', ...analyticsPrototypeCardPlacements] as const
export const analyticsReadinessEntries = ['home_preview', 'readiness_page'] as const
export const analyticsReadyEventName = 'saberistic:analytics-ready'

type AnalyticsCTA = (typeof analyticsCTAs)[number]
type AnalyticsCTAPlacement = (typeof analyticsCTAPlacements)[number]
type AnalyticsBuildNotePlacement = (typeof analyticsBuildNotePlacements)[number]
type AnalyticsService = (typeof analyticsServices)[number]
export type AnalyticsPrototypeCardPlacement = (typeof analyticsPrototypeCardPlacements)[number]
type AnalyticsPrototypePlacement = (typeof analyticsPrototypePlacements)[number]
type AnalyticsReadinessEntry = (typeof analyticsReadinessEntries)[number]

export type AnalyticsEvent =
  | {
      data: { cta: AnalyticsCTA; placement: AnalyticsCTAPlacement }
      name: 'primary_cta_clicked'
    }
  | { data: { service: AnalyticsService }; name: 'service_viewed' }
  | {
      data: {
        placement: AnalyticsPrototypeCardPlacement
        prototype: string
        status: PrototypeStatus
      }
      name: 'prototype_card_clicked'
    }
  | {
      data: { prototype: string; status: PrototypeStatus }
      name: 'prototype_view'
    }
  | {
      data: { placement: AnalyticsPrototypePlacement; prototype: string }
      name: 'prototype_launch'
    }
  | { data: { prototype: string }; name: 'prototype_source_clicked' }
  | {
      data: { note: string; placement: AnalyticsBuildNotePlacement }
      name: 'build_note_card_clicked'
    }
  | { data: { note: string }; name: 'build_note_view' }
  | { data: { note: string }; name: 'build_note_source_clicked' }
  | {
      data: { entry: AnalyticsReadinessEntry; mode: 'example' }
      name: 'readiness_started'
    }

type AnalyticsData = Record<string, string>

type UmamiTracker = {
  track: (name: string, data: AnalyticsData) => unknown
}

declare global {
  interface Window {
    saberisticUmamiBeforeSend?: (type: string, payload: unknown) => unknown
    umami?: UmamiTracker
  }
}

const prototypeSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function hasExactKeys(value: Record<string, unknown>, expectedKeys: readonly string[]): boolean {
  const actualKeys = Object.keys(value).sort()
  const sortedExpectedKeys = [...expectedKeys].sort()

  return (
    actualKeys.length === sortedExpectedKeys.length &&
    actualKeys.every((key, index) => key === sortedExpectedKeys[index])
  )
}

function isMember<const Values extends readonly string[]>(
  value: unknown,
  values: Values,
): value is Values[number] {
  return typeof value === 'string' && values.includes(value)
}

function isPrototypeSlug(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 80 && prototypeSlugPattern.test(value)
}

export function validateAnalyticsEvent(value: unknown): AnalyticsEvent | null {
  if (!isRecord(value) || !hasExactKeys(value, ['data', 'name']) || !isRecord(value.data)) {
    return null
  }

  const data = value.data

  switch (value.name) {
    case 'primary_cta_clicked':
      return hasExactKeys(data, ['cta', 'placement']) &&
        isMember(data.cta, analyticsCTAs) &&
        isMember(data.placement, analyticsCTAPlacements)
        ? (value as AnalyticsEvent)
        : null
    case 'service_viewed':
      return hasExactKeys(data, ['service']) && isMember(data.service, analyticsServices)
        ? (value as AnalyticsEvent)
        : null
    case 'prototype_card_clicked':
      return hasExactKeys(data, ['placement', 'prototype', 'status']) &&
        isMember(data.placement, analyticsPrototypeCardPlacements) &&
        isPrototypeSlug(data.prototype) &&
        isMember(data.status, prototypeStatuses)
        ? (value as AnalyticsEvent)
        : null
    case 'prototype_view':
      return hasExactKeys(data, ['prototype', 'status']) &&
        isPrototypeSlug(data.prototype) &&
        isMember(data.status, prototypeStatuses)
        ? (value as AnalyticsEvent)
        : null
    case 'prototype_launch':
      return hasExactKeys(data, ['placement', 'prototype']) &&
        isMember(data.placement, analyticsPrototypePlacements) &&
        isPrototypeSlug(data.prototype)
        ? (value as AnalyticsEvent)
        : null
    case 'prototype_source_clicked':
      return hasExactKeys(data, ['prototype']) && isPrototypeSlug(data.prototype)
        ? (value as AnalyticsEvent)
        : null
    case 'build_note_card_clicked':
      return hasExactKeys(data, ['note', 'placement']) &&
        isPublishedBuildNoteSlug(data.note) &&
        isMember(data.placement, analyticsBuildNotePlacements)
        ? (value as AnalyticsEvent)
        : null
    case 'build_note_view':
    case 'build_note_source_clicked':
      return hasExactKeys(data, ['note']) && isPublishedBuildNoteSlug(data.note)
        ? (value as AnalyticsEvent)
        : null
    case 'readiness_started':
      return hasExactKeys(data, ['entry', 'mode']) &&
        data.mode === 'example' &&
        isMember(data.entry, analyticsReadinessEntries)
        ? (value as AnalyticsEvent)
        : null
    default:
      return null
  }
}

export function trackAnalyticsEvent(value: unknown): boolean {
  const event = validateAnalyticsEvent(value)

  if (!event || typeof window === 'undefined' || typeof window.umami?.track !== 'function') {
    return false
  }

  try {
    window.umami.track(event.name, event.data)
    return true
  } catch {
    return false
  }
}
