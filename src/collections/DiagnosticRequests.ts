import type { CollectionConfig, Field } from 'payload'

import { isAdmin } from '@/access/roles'

const immutable = {
  update: () => false,
}

function immutableField(field: Field): Field {
  return {
    ...field,
    access: {
      ...('access' in field && field.access ? field.access : {}),
      ...immutable,
    },
    admin: {
      ...('admin' in field && field.admin ? field.admin : {}),
      readOnly: true,
    },
  } as Field
}

export const DiagnosticRequests: CollectionConfig = {
  slug: 'diagnostic-requests',
  access: {
    create: () => false,
    delete: isAdmin,
    read: isAdmin,
    update: isAdmin,
  },
  admin: {
    defaultColumns: [
      'requestId',
      'requestType',
      'workflowStatus',
      'paymentStatus',
      'bookingStatus',
      'createdAt',
    ],
    group: 'Private leads',
    useAsTitle: 'requestId',
  },
  fields: [
    immutableField({
      name: 'requestId',
      type: 'text',
      index: true,
      maxLength: 36,
      required: true,
      unique: true,
    }),
    immutableField({
      name: 'submissionKey',
      type: 'text',
      index: true,
      maxLength: 64,
      required: true,
      unique: true,
      admin: { hidden: true },
    }),
    immutableField({
      name: 'requestType',
      type: 'select',
      defaultValue: 'architecture_diagnostic',
      index: true,
      options: [{ label: 'Architecture Diagnostic', value: 'architecture_diagnostic' }],
      required: true,
    }),
    immutableField({ name: 'name', type: 'text', maxLength: 120, required: true }),
    immutableField({ name: 'email', type: 'email', required: true }),
    immutableField({ name: 'company', type: 'text', maxLength: 140 }),
    immutableField({ name: 'additionalContext', type: 'textarea', maxLength: 1_000 }),
    immutableField({
      name: 'reportId',
      type: 'text',
      index: true,
      maxLength: 36,
      required: true,
      unique: true,
    }),
    immutableField({ name: 'policyVersion', type: 'text', maxLength: 40, required: true }),
    immutableField({
      name: 'readinessLevel',
      type: 'select',
      options: [
        { label: 'Demo only', value: 'demo_only' },
        { label: 'Internal beta', value: 'internal_beta' },
        { label: 'Limited production', value: 'limited_production' },
        { label: 'Production candidate', value: 'production_candidate' },
      ],
      required: true,
    }),
    immutableField({
      name: 'shareAssessmentSummary',
      type: 'checkbox',
      defaultValue: false,
      required: true,
    }),
    immutableField({
      name: 'selectedBlockers',
      type: 'array',
      admin: {
        description:
          'Canonical blocker IDs and labels selected by the visitor. The full readiness report is never stored.',
      },
      fields: [
        {
          name: 'ruleId',
          type: 'text',
          maxLength: 80,
          required: true,
        },
        {
          name: 'label',
          type: 'text',
          maxLength: 200,
          required: true,
        },
      ],
      maxRows: 20,
    }),
    immutableField({
      name: 'contactConsent',
      type: 'checkbox',
      defaultValue: false,
      required: true,
    }),
    immutableField({ name: 'consentedAt', type: 'date', required: true }),
    immutableField({ name: 'privacyNoticeVersion', type: 'text', maxLength: 40, required: true }),
    immutableField({
      name: 'timeframe',
      type: 'select',
      options: [
        { label: 'This week', value: 'this_week' },
        { label: 'Next two weeks', value: 'next_two_weeks' },
        { label: 'This month', value: 'this_month' },
      ],
      required: true,
    }),
    immutableField({
      name: 'timeBand',
      type: 'select',
      options: [
        { label: 'Morning', value: 'morning' },
        { label: 'Afternoon', value: 'afternoon' },
        { label: 'Flexible', value: 'flexible' },
      ],
      required: true,
    }),
    immutableField({ name: 'timeZone', type: 'text', maxLength: 80, required: true }),
    {
      name: 'workflowStatus',
      type: 'select',
      defaultValue: 'new',
      index: true,
      options: [
        { label: 'New', value: 'new' },
        { label: 'Reviewed', value: 'reviewed' },
        { label: 'Replied', value: 'replied' },
        { label: 'Archived', value: 'archived' },
      ],
      required: true,
    },
    immutableField({
      name: 'paymentStatus',
      type: 'select',
      defaultValue: 'pending',
      index: true,
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Paid', value: 'paid' },
        { label: 'Failed', value: 'failed' },
        { label: 'Refunded', value: 'refunded' },
      ],
      required: true,
    }),
    {
      name: 'bookingStatus',
      type: 'select',
      defaultValue: 'awaiting_payment',
      index: true,
      options: [
        { label: 'Awaiting payment', value: 'awaiting_payment' },
        { label: 'Awaiting time selection', value: 'awaiting_selection' },
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'Completed', value: 'completed' },
        { label: 'Canceled', value: 'canceled' },
      ],
      required: true,
    },
    immutableField({
      name: 'stripeCheckoutSessionId',
      type: 'text',
      index: true,
      maxLength: 255,
      unique: true,
    }),
    immutableField({ name: 'stripePaymentIntentId', type: 'text', maxLength: 255 }),
    immutableField({ name: 'stripeEventId', type: 'text', maxLength: 255 }),
    immutableField({ name: 'customerReportEmailId', type: 'text', maxLength: 255 }),
    immutableField({ name: 'internalNotificationEmailId', type: 'text', maxLength: 255 }),
    immutableField({ name: 'customerConfirmationEmailId', type: 'text', maxLength: 255 }),
    immutableField({ name: 'paidNotificationEmailId', type: 'text', maxLength: 255 }),
    immutableField({ name: 'customerReportSentAt', type: 'date' }),
    immutableField({ name: 'internalNotificationSentAt', type: 'date' }),
    immutableField({ name: 'paymentConfirmedAt', type: 'date' }),
    immutableField({ name: 'customerConfirmationSentAt', type: 'date' }),
    immutableField({ name: 'paidNotificationSentAt', type: 'date' }),
    immutableField({ name: 'retentionReviewAt', type: 'date', required: true }),
    {
      name: 'internalNotes',
      type: 'textarea',
      maxLength: 4_000,
    },
  ],
}
