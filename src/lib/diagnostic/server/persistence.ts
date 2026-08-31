import 'server-only'

import configPromise from '@payload-config'
import { getPayload } from 'payload'

import type { BlockerRuleId, ReadinessLevel } from '@/lib/readiness'
import type { DiagnosticTimeBand, DiagnosticTimeframe } from '@/lib/diagnostic'

export type DiagnosticRequestCreate = {
  additionalContext?: string
  bookingStatus: 'awaiting_payment'
  company?: string
  consentedAt: string
  contactConsent: true
  email: string
  name: string
  paymentStatus: 'pending'
  policyVersion: string
  privacyNoticeVersion: string
  readinessLevel: ReadinessLevel
  reportId: string
  requestId: string
  requestType: 'architecture_diagnostic'
  retentionReviewAt: string
  selectedBlockers: Array<{ label: string; ruleId: BlockerRuleId }>
  shareAssessmentSummary: boolean
  submissionKey: string
  timeBand: DiagnosticTimeBand
  timeframe: DiagnosticTimeframe
  timeZone: string
  workflowStatus: 'new'
}

export type DiagnosticRequestUpdate = Partial<{
  bookingStatus: 'awaiting_payment' | 'awaiting_selection'
  customerConfirmationEmailId: string
  customerConfirmationSentAt: string
  customerReportEmailId: string
  customerReportSentAt: string
  internalNotificationEmailId: string
  internalNotificationSentAt: string
  paidNotificationEmailId: string
  paidNotificationSentAt: string
  paymentConfirmedAt: string
  paymentStatus: 'pending' | 'paid'
  stripeCheckoutSessionId: string
  stripeEventId: string
  stripePaymentIntentId: string
}>

export type DiagnosticRequestRecord = Omit<
  DiagnosticRequestCreate,
  'bookingStatus' | 'paymentStatus'
> &
  DiagnosticRequestUpdate & {
    bookingStatus: 'awaiting_payment' | 'awaiting_selection'
    id: number | string
    paymentStatus: 'pending' | 'paid'
  }

export type DiagnosticStore = {
  create: (data: DiagnosticRequestCreate) => Promise<DiagnosticRequestRecord>
  findByRequestId: (requestId: string) => Promise<DiagnosticRequestRecord | null>
  findBySubmissionKey: (submissionKey: string) => Promise<DiagnosticRequestRecord | null>
  update: (id: number | string, data: DiagnosticRequestUpdate) => Promise<DiagnosticRequestRecord>
}

type LocalPayload = {
  create: (args: {
    collection: 'diagnostic-requests'
    data: DiagnosticRequestCreate
    overrideAccess: true
  }) => Promise<unknown>
  find: (args: {
    collection: 'diagnostic-requests'
    depth: 0
    limit: 1
    overrideAccess: true
    pagination: false
    where: Record<string, { equals: string }>
  }) => Promise<{ docs: unknown[] }>
  update: (args: {
    collection: 'diagnostic-requests'
    data: DiagnosticRequestUpdate
    id: number | string
    overrideAccess: true
  }) => Promise<unknown>
}

function diagnosticRecord(value: unknown): DiagnosticRequestRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('diagnostic_record_invalid')
  }
  const record = value as Record<string, unknown>
  if (
    (typeof record.id !== 'string' && typeof record.id !== 'number') ||
    typeof record.requestId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      record.requestId,
    ) ||
    typeof record.submissionKey !== 'string' ||
    !/^[0-9a-f]{64}$/.test(record.submissionKey) ||
    typeof record.email !== 'string' ||
    typeof record.reportId !== 'string'
  ) {
    throw new Error('diagnostic_record_invalid')
  }
  return value as DiagnosticRequestRecord
}

async function localPayload(): Promise<LocalPayload> {
  return (await getPayload({ config: configPromise })) as unknown as LocalPayload
}

async function findOne(
  where: Record<string, { equals: string }>,
): Promise<DiagnosticRequestRecord | null> {
  const payload = await localPayload()
  const result = await payload.find({
    collection: 'diagnostic-requests',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    where,
  })
  const document = result.docs[0]
  return document ? diagnosticRecord(document) : null
}

export const payloadDiagnosticStore: DiagnosticStore = {
  async create(data) {
    const payload = await localPayload()
    return diagnosticRecord(
      await payload.create({
        collection: 'diagnostic-requests',
        data,
        overrideAccess: true,
      }),
    )
  },

  findByRequestId(requestId) {
    return findOne({ requestId: { equals: requestId } })
  },

  findBySubmissionKey(submissionKey) {
    return findOne({ submissionKey: { equals: submissionKey } })
  },

  async update(id, data) {
    const payload = await localPayload()
    return diagnosticRecord(
      await payload.update({
        collection: 'diagnostic-requests',
        data,
        id,
        overrideAccess: true,
      }),
    )
  },
}
