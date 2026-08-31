import type { BlockerRuleId, ReadinessReport } from '@/lib/readiness'

export const diagnosticPrivacyNoticeVersion = '2026-08-31' as const

export const diagnosticTimeframes = ['this_week', 'next_two_weeks', 'this_month'] as const
export const diagnosticTimeBands = ['morning', 'afternoon', 'flexible'] as const

export type DiagnosticTimeframe = (typeof diagnosticTimeframes)[number]
export type DiagnosticTimeBand = (typeof diagnosticTimeBands)[number]

export type DiagnosticRequestInput = {
  anonymousToken: string
  contact: {
    company?: string
    email: string
    name: string
  }
  consent: {
    contact: true
    privacy: true
    privacyVersion: typeof diagnosticPrivacyNoticeVersion
  }
  handoffToken: string
  context?: string
  report: ReadinessReport
  selectedBlockerIds: BlockerRuleId[]
  shareSummary: boolean
  timeBand: DiagnosticTimeBand
  timeframe: DiagnosticTimeframe
  timezone: string
}

export type DiagnosticRequestSuccess = {
  checkoutUrl: string
  requestId: string
}

export type DiagnosticSelectedBlocker = {
  label: string
  ruleId: BlockerRuleId
}
