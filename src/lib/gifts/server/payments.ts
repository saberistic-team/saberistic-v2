import 'server-only'

import type Stripe from 'stripe'

import type { GiftPaymentStatus } from '../types'
import { type ValidatedGiftSession, validateGiftCheckoutSession } from './stripe-metadata'

export const giftStripeEventTypes = [
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'checkout.session.expired',
  'charge.refunded',
] as const

export type GiftStripeEventType = (typeof giftStripeEventTypes)[number]
export type { GiftPaymentStatus } from '../types'

export type GiftPaymentProviderData = ValidatedGiftSession & {
  checkoutExpiredAt?: string
  paymentConfirmedAt?: string
  paymentFailedAt?: string
  paymentStatus: GiftPaymentStatus
  refundedAmountCents: number
  refundedAt?: string
  retentionReviewAt: string
  stripeChargeId?: string
  stripeEventCreatedAt: string
  stripeEventId: string
  stripeEventType: GiftStripeEventType
}

export type GiftPaymentCreate = GiftPaymentProviderData & {
  fulfillmentStatus: 'awaiting_review'
  processedStripeEventIds: string[]
}

export type GiftPaymentUpdate = Partial<GiftPaymentProviderData> & {
  processedStripeEventIds: string[]
}

export type GiftPaymentRecord = GiftPaymentCreate & {
  id: number | string
  internalNotes?: string
  updatedAt?: string
}

export type GiftPaymentStore = {
  create: (data: GiftPaymentCreate) => Promise<GiftPaymentRecord>
  findBySessionId: (sessionId: string) => Promise<GiftPaymentRecord | null>
  runExclusive?: <T>(
    sessionId: string,
    operation: (lockedStore: GiftPaymentStore) => Promise<T>,
  ) => Promise<T>
  update: (id: number | string, data: GiftPaymentUpdate) => Promise<GiftPaymentRecord>
}

const retentionWindowMs = 90 * 24 * 60 * 60 * 1_000

function unixTimestamp(seconds: number): string | null {
  if (!Number.isSafeInteger(seconds) || seconds < 0) return null
  const date = new Date(seconds * 1_000)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function eventTimestamp(event: Stripe.Event): string | null {
  return unixTimestamp(event.created)
}

function eventIdentity(event: Stripe.Event): {
  stripeEventCreatedAt: string
  stripeEventId: string
  stripeEventType: GiftStripeEventType
} | null {
  const createdAt = eventTimestamp(event)
  if (
    !createdAt ||
    !/^evt_[A-Za-z0-9]{10,255}$/.test(event.id) ||
    !giftStripeEventTypes.some((type) => type === event.type)
  ) {
    return null
  }
  return {
    stripeEventCreatedAt: createdAt,
    stripeEventId: event.id,
    stripeEventType: event.type as GiftStripeEventType,
  }
}

function retentionReviewAt(eventCreatedAt: string): string {
  return new Date(Date.parse(eventCreatedAt) + retentionWindowMs).toISOString()
}

function paymentStatusForCheckoutEvent(
  type: Exclude<GiftStripeEventType, 'charge.refunded'>,
  session: Stripe.Checkout.Session,
): GiftPaymentStatus | null {
  const paid = session.payment_status === 'paid' || session.payment_status === 'no_payment_required'

  if (type === 'checkout.session.completed') return paid ? 'paid' : 'pending'
  if (type === 'checkout.session.async_payment_succeeded') return paid ? 'paid' : null
  if (type === 'checkout.session.async_payment_failed') return paid ? null : 'failed'
  if (type === 'checkout.session.expired') {
    return session.status === 'expired' && !paid ? 'expired' : null
  }
  return null
}

export function giftPaymentFromCheckoutEvent(
  event: Stripe.Event,
  quoteSecret: string,
): GiftPaymentProviderData | null {
  if (
    !giftStripeEventTypes.slice(0, 4).some((type) => type === event.type) ||
    !event.data.object ||
    event.data.object.object !== 'checkout.session'
  ) {
    return null
  }

  const identity = eventIdentity(event)
  const session = event.data.object as Stripe.Checkout.Session
  const gift = validateGiftCheckoutSession(session, quoteSecret)
  const paymentStatus = paymentStatusForCheckoutEvent(
    event.type as Exclude<GiftStripeEventType, 'charge.refunded'>,
    session,
  )
  if (!identity || !gift || !paymentStatus || event.livemode !== session.livemode) return null
  if (paymentStatus === 'paid' && !gift.stripePaymentIntentId) return null

  return {
    ...gift,
    ...(paymentStatus === 'paid' ? { paymentConfirmedAt: identity.stripeEventCreatedAt } : {}),
    ...(paymentStatus === 'failed' ? { paymentFailedAt: identity.stripeEventCreatedAt } : {}),
    ...(paymentStatus === 'expired' ? { checkoutExpiredAt: identity.stripeEventCreatedAt } : {}),
    ...identity,
    paymentStatus,
    refundedAmountCents: 0,
    retentionReviewAt: retentionReviewAt(identity.stripeEventCreatedAt),
  }
}

function chargePaymentIntentId(charge: Stripe.Charge): string | null {
  if (typeof charge.payment_intent === 'string') return charge.payment_intent
  if (charge.payment_intent && typeof charge.payment_intent === 'object') {
    return charge.payment_intent.id
  }
  return null
}

export function giftPaymentFromRefundEvent(
  event: Stripe.Event,
  session: Stripe.Checkout.Session,
  quoteSecret: string,
): GiftPaymentProviderData | null {
  if (
    event.type !== 'charge.refunded' ||
    !event.data.object ||
    event.data.object.object !== 'charge'
  ) {
    return null
  }

  const identity = eventIdentity(event)
  const gift = validateGiftCheckoutSession(session, quoteSecret)
  const charge = event.data.object as Stripe.Charge
  const paymentIntentId = chargePaymentIntentId(charge)
  const chargeCreatedAt = unixTimestamp(charge.created)
  if (
    !identity ||
    !gift ||
    event.livemode !== session.livemode ||
    charge.livemode !== session.livemode ||
    !/^ch_[A-Za-z0-9]{10,255}$/.test(charge.id) ||
    !paymentIntentId ||
    paymentIntentId !== gift.stripePaymentIntentId ||
    charge.currency !== gift.currency ||
    charge.amount !== gift.amountCents ||
    !chargeCreatedAt ||
    !Number.isSafeInteger(charge.amount_refunded) ||
    charge.amount_refunded <= 0 ||
    charge.amount_refunded > gift.amountCents
  ) {
    return null
  }

  return {
    ...gift,
    ...identity,
    paymentConfirmedAt: chargeCreatedAt,
    paymentStatus: charge.amount_refunded === gift.amountCents ? 'refunded' : 'partially_refunded',
    refundedAmountCents: charge.amount_refunded,
    refundedAt: identity.stripeEventCreatedAt,
    retentionReviewAt: retentionReviewAt(identity.stripeEventCreatedAt),
    stripeChargeId: charge.id,
  }
}

const statusRank: Record<GiftPaymentStatus, number> = {
  expired: 2,
  failed: 3,
  paid: 4,
  partially_refunded: 5,
  pending: 1,
  refunded: 6,
}

function laterISO(first: string, second: string): string {
  return Date.parse(first) >= Date.parse(second) ? first : second
}

function earlierISO(first: string | undefined, second: string | undefined): string | undefined {
  if (!first) return second
  if (!second) return first
  return Date.parse(first) <= Date.parse(second) ? first : second
}

function samePayment(existing: GiftPaymentRecord, incoming: GiftPaymentProviderData): boolean {
  return (
    existing.stripeCheckoutSessionId === incoming.stripeCheckoutSessionId &&
    existing.giftOfferId === incoming.giftOfferId &&
    existing.giftRunId === incoming.giftRunId &&
    existing.itemName === incoming.itemName &&
    existing.category === incoming.category &&
    existing.referenceRetailer === incoming.referenceRetailer &&
    existing.referenceSource === incoming.referenceSource &&
    existing.amountCents === incoming.amountCents &&
    existing.currency === incoming.currency &&
    (!existing.stripePaymentIntentId ||
      !incoming.stripePaymentIntentId ||
      existing.stripePaymentIntentId === incoming.stripePaymentIntentId)
  )
}

async function updateExistingGiftPayment(
  store: GiftPaymentStore,
  existing: GiftPaymentRecord,
  incoming: GiftPaymentProviderData,
): Promise<{ duplicate: boolean; record: GiftPaymentRecord }> {
  if (!samePayment(existing, incoming)) throw new Error('gift_payment_identity_mismatch')
  if (existing.processedStripeEventIds.includes(incoming.stripeEventId)) {
    return { duplicate: true, record: existing }
  }

  const incomingIsLatest =
    Date.parse(incoming.stripeEventCreatedAt) >= Date.parse(existing.stripeEventCreatedAt)
  const paymentStatus =
    statusRank[incoming.paymentStatus] >= statusRank[existing.paymentStatus]
      ? incoming.paymentStatus
      : existing.paymentStatus
  const refundedAmountCents = Math.max(existing.refundedAmountCents, incoming.refundedAmountCents)
  const processedStripeEventIds = [
    ...existing.processedStripeEventIds,
    incoming.stripeEventId,
  ].slice(-100)

  const update: GiftPaymentUpdate = {
    ...(incomingIsLatest
      ? {
          checkoutStatus: incoming.checkoutStatus,
          stripeEventCreatedAt: incoming.stripeEventCreatedAt,
          stripeEventId: incoming.stripeEventId,
          stripeEventType: incoming.stripeEventType,
        }
      : {}),
    ...(!existing.payerEmail && incoming.payerEmail ? { payerEmail: incoming.payerEmail } : {}),
    ...(!existing.giftNote && incoming.giftNote ? { giftNote: incoming.giftNote } : {}),
    ...(!existing.stripePaymentIntentId && incoming.stripePaymentIntentId
      ? { stripePaymentIntentId: incoming.stripePaymentIntentId }
      : {}),
    ...(!existing.stripeChargeId && incoming.stripeChargeId
      ? { stripeChargeId: incoming.stripeChargeId }
      : {}),
    checkoutExpiredAt: earlierISO(existing.checkoutExpiredAt, incoming.checkoutExpiredAt),
    paymentConfirmedAt: earlierISO(existing.paymentConfirmedAt, incoming.paymentConfirmedAt),
    paymentFailedAt: earlierISO(existing.paymentFailedAt, incoming.paymentFailedAt),
    paymentStatus,
    processedStripeEventIds,
    refundedAmountCents,
    refundedAt: earlierISO(existing.refundedAt, incoming.refundedAt),
    retentionReviewAt: laterISO(existing.retentionReviewAt, incoming.retentionReviewAt),
  }

  return { duplicate: false, record: await store.update(existing.id, update) }
}

export async function upsertGiftPayment(
  store: GiftPaymentStore,
  incoming: GiftPaymentProviderData,
): Promise<{ duplicate: boolean; record: GiftPaymentRecord }> {
  if (store.runExclusive) {
    return store.runExclusive(incoming.stripeCheckoutSessionId, (lockedStore) =>
      upsertGiftPayment(lockedStore, incoming),
    )
  }

  const existing = await store.findBySessionId(incoming.stripeCheckoutSessionId)
  if (existing) return updateExistingGiftPayment(store, existing, incoming)

  const create: GiftPaymentCreate = {
    ...incoming,
    fulfillmentStatus: 'awaiting_review',
    processedStripeEventIds: [incoming.stripeEventId],
  }
  try {
    return { duplicate: false, record: await store.create(create) }
  } catch (createError) {
    // A concurrent delivery can win the unique checkout-session insert. Re-read and merge it.
    const concurrent = await store.findBySessionId(incoming.stripeCheckoutSessionId)
    if (!concurrent) throw createError
    return updateExistingGiftPayment(store, concurrent, incoming)
  }
}
