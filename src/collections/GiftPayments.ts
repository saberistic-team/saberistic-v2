import type { CollectionConfig, Field } from 'payload'

import { isAdmin, isStaff, staffFieldAccess } from '@/access/roles'

const immutable = {
  update: () => false,
}

function providerControlledField(field: Field): Field {
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

export const GiftPayments: CollectionConfig = {
  slug: 'gift-payments',
  access: {
    create: () => false,
    delete: isAdmin,
    read: isStaff,
    update: isStaff,
  },
  admin: {
    defaultColumns: [
      'itemName',
      'amountCents',
      'paymentStatus',
      'fulfillmentStatus',
      'stripeCheckoutSessionId',
      'updatedAt',
    ],
    description:
      'Private Gift Draft contributions. Provider-controlled payment fields are read-only; fulfillment fields are maintained by staff.',
    group: 'Private payments',
    useAsTitle: 'itemName',
  },
  fields: [
    providerControlledField({
      name: 'giftOfferId',
      type: 'text',
      index: true,
      maxLength: 120,
      required: true,
    }),
    providerControlledField({
      name: 'giftRunId',
      type: 'text',
      index: true,
      maxLength: 160,
      required: true,
    }),
    providerControlledField({
      name: 'inventoryReservationId',
      type: 'text',
      index: true,
      maxLength: 96,
      required: true,
      unique: true,
    }),
    providerControlledField({
      name: 'itemName',
      type: 'text',
      maxLength: 120,
      required: true,
    }),
    providerControlledField({
      name: 'category',
      type: 'text',
      maxLength: 50,
      required: true,
    }),
    providerControlledField({
      name: 'referenceRetailer',
      type: 'text',
      maxLength: 80,
      required: true,
    }),
    providerControlledField({
      name: 'referenceSource',
      type: 'text',
      maxLength: 500,
      required: true,
    }),
    providerControlledField({
      name: 'amountCents',
      type: 'number',
      max: 30_000,
      min: 1_000,
      required: true,
    }),
    providerControlledField({
      name: 'currency',
      type: 'select',
      options: [{ label: 'USD', value: 'usd' }],
      required: true,
    }),
    providerControlledField({
      name: 'payerEmail',
      type: 'email',
      access: { read: staffFieldAccess },
      admin: {
        description: 'Collected by Stripe Checkout. Retained only for payment support and review.',
      },
    }),
    providerControlledField({
      name: 'giftNote',
      type: 'textarea',
      access: { read: staffFieldAccess },
      maxLength: 180,
    }),
    providerControlledField({
      name: 'stripeCheckoutSessionId',
      type: 'text',
      index: true,
      maxLength: 255,
      required: true,
      unique: true,
    }),
    providerControlledField({
      name: 'stripePaymentIntentId',
      type: 'text',
      index: true,
      maxLength: 255,
    }),
    providerControlledField({
      name: 'stripeChargeId',
      type: 'text',
      index: true,
      maxLength: 255,
    }),
    providerControlledField({
      name: 'stripeEventId',
      type: 'text',
      index: true,
      maxLength: 255,
      required: true,
    }),
    providerControlledField({
      name: 'stripeEventType',
      type: 'select',
      options: [
        { label: 'Checkout completed', value: 'checkout.session.completed' },
        {
          label: 'Async payment succeeded',
          value: 'checkout.session.async_payment_succeeded',
        },
        { label: 'Async payment failed', value: 'checkout.session.async_payment_failed' },
        { label: 'Checkout expired', value: 'checkout.session.expired' },
        { label: 'Charge refunded', value: 'charge.refunded' },
      ],
      required: true,
    }),
    providerControlledField({
      name: 'processedStripeEventIds',
      type: 'json',
      admin: {
        description: 'Bounded event IDs used to make Stripe webhook retries idempotent.',
        hidden: true,
      },
      required: true,
    }),
    providerControlledField({
      name: 'checkoutStatus',
      type: 'select',
      options: [
        { label: 'Open', value: 'open' },
        { label: 'Complete', value: 'complete' },
        { label: 'Expired', value: 'expired' },
      ],
      required: true,
    }),
    providerControlledField({
      name: 'paymentStatus',
      type: 'select',
      defaultValue: 'pending',
      index: true,
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Paid', value: 'paid' },
        { label: 'Partially refunded', value: 'partially_refunded' },
        { label: 'Refunded', value: 'refunded' },
        { label: 'Failed', value: 'failed' },
        { label: 'Expired', value: 'expired' },
      ],
      required: true,
    }),
    providerControlledField({
      name: 'refundedAmountCents',
      type: 'number',
      defaultValue: 0,
      max: 30_000,
      min: 0,
      required: true,
    }),
    providerControlledField({ name: 'checkoutCreatedAt', type: 'date', required: true }),
    providerControlledField({ name: 'stripeEventCreatedAt', type: 'date', required: true }),
    providerControlledField({ name: 'paymentConfirmedAt', type: 'date' }),
    providerControlledField({ name: 'paymentFailedAt', type: 'date' }),
    providerControlledField({ name: 'checkoutExpiredAt', type: 'date' }),
    providerControlledField({ name: 'refundedAt', type: 'date' }),
    providerControlledField({
      name: 'retentionReviewAt',
      type: 'date',
      required: true,
      admin: {
        description: 'Review payer contact data for deletion after the support window.',
      },
    }),
    {
      name: 'fulfillmentStatus',
      type: 'select',
      defaultValue: 'awaiting_review',
      index: true,
      options: [
        { label: 'Awaiting review', value: 'awaiting_review' },
        { label: 'Planned', value: 'planned' },
        { label: 'Ordered', value: 'ordered' },
        { label: 'Fulfilled', value: 'fulfilled' },
        { label: 'Substituted', value: 'substituted' },
        { label: 'Declined', value: 'declined' },
        { label: 'Refunded', value: 'refunded' },
      ],
      required: true,
    },
    {
      name: 'internalNotes',
      type: 'textarea',
      maxLength: 4_000,
    },
  ],
}
