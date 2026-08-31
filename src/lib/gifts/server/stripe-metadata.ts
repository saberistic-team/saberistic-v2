import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

import type Stripe from 'stripe'

import type { GiftQuoteClaim } from '../types'
import { safeGiftSourceURL } from '../validation'

const metadataKeys = [
  'gift_amount_cents',
  'gift_category',
  'gift_currency',
  'gift_draft_version',
  'gift_item_name',
  'gift_metadata_signature',
  'gift_offer_id',
  'gift_run_id',
  'reference_retailer',
  'reference_source',
] as const

const safeTextPattern = /^[^\u0000-\u001f\u007f]+$/
const checkoutSessionPattern = /^cs_(?:test|live)_[A-Za-z0-9]{16,255}$/

export type ValidatedGiftSession = {
  amountCents: number
  category: string
  checkoutCreatedAt: string
  stripeCheckoutSessionId: string
  checkoutStatus: 'complete' | 'expired' | 'open'
  currency: 'usd'
  giftNote?: string
  giftOfferId: string
  giftRunId: string
  itemName: string
  payerEmail?: string
  referenceRetailer: string
  referenceSource: string
  stripePaymentIntentId?: string
}

type SignedGiftMetadata = Omit<
  ValidatedGiftSession,
  | 'checkoutCreatedAt'
  | 'stripeCheckoutSessionId'
  | 'checkoutStatus'
  | 'giftNote'
  | 'payerEmail'
  | 'stripePaymentIntentId'
>

function signaturePayload(value: SignedGiftMetadata): string {
  return JSON.stringify({
    amountCents: value.amountCents,
    category: value.category,
    currency: value.currency,
    giftOfferId: value.giftOfferId,
    giftRunId: value.giftRunId,
    itemName: value.itemName,
    referenceRetailer: value.referenceRetailer,
    referenceSource: value.referenceSource,
    version: 1,
  })
}

function signMetadata(value: SignedGiftMetadata, quoteSecret: string): string {
  return createHmac('sha256', quoteSecret).update(signaturePayload(value)).digest('base64url')
}

function equalSignature(received: string, expected: string): boolean {
  const receivedBytes = Buffer.from(received)
  const expectedBytes = Buffer.from(expected)
  return (
    receivedBytes.length === expectedBytes.length && timingSafeEqual(receivedBytes, expectedBytes)
  )
}

function boundedSafeText(value: unknown, minimum: number, maximum: number): value is string {
  return (
    typeof value === 'string' &&
    value.length >= minimum &&
    value.length <= maximum &&
    value.trim() === value &&
    safeTextPattern.test(value)
  )
}

function paymentIntentId(value: Stripe.Checkout.Session['payment_intent']): string | undefined {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && typeof value.id === 'string') return value.id
  return undefined
}

function payerEmail(session: Stripe.Checkout.Session): string | undefined {
  const value = session.customer_details?.email ?? session.customer_email
  if (!value || value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return undefined
  return value.toLowerCase()
}

function giftNote(session: Stripe.Checkout.Session): string | undefined {
  const field = session.custom_fields.find(
    (candidate) => candidate.key === 'note_for_amir' && candidate.type === 'text',
  )
  const value = field?.text?.value?.trim()
  return value && value.length <= 180 && safeTextPattern.test(value) ? value : undefined
}

export function buildGiftSessionMetadata(
  claim: GiftQuoteClaim,
  quoteSecret: string,
): Record<string, string> {
  if (claim.sourceUrl.length > 500) throw new Error('gift_reference_source_too_long')

  const signed: SignedGiftMetadata = {
    amountCents: claim.amountCents,
    category: claim.category,
    currency: claim.currency,
    giftOfferId: claim.offerId,
    giftRunId: claim.runId,
    itemName: claim.itemName,
    referenceRetailer: claim.retailer,
    referenceSource: claim.sourceUrl,
  }

  return {
    gift_amount_cents: String(signed.amountCents),
    gift_category: signed.category,
    gift_currency: signed.currency,
    gift_draft_version: '1',
    gift_item_name: signed.itemName,
    gift_metadata_signature: signMetadata(signed, quoteSecret),
    gift_offer_id: signed.giftOfferId,
    gift_run_id: signed.giftRunId,
    reference_retailer: signed.referenceRetailer,
    reference_source: signed.referenceSource,
  }
}

export function hasGiftDraftMetadata(session: Stripe.Checkout.Session): boolean {
  return session.metadata?.gift_draft_version === '1'
}

export function validateGiftCheckoutSession(
  session: Stripe.Checkout.Session,
  quoteSecret: string,
): ValidatedGiftSession | null {
  const metadata = session.metadata
  if (!metadata || typeof metadata !== 'object') return null

  const actualKeys = Object.keys(metadata).sort()
  const expectedKeys = [...metadataKeys].sort()
  if (
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some((key, index) => key !== expectedKeys[index])
  ) {
    return null
  }

  const amountText = metadata.gift_amount_cents
  const amountCents = Number(amountText)
  const referenceSource = safeGiftSourceURL(metadata.reference_source)
  if (
    metadata.gift_draft_version !== '1' ||
    !/^[1-9]\d{3,4}$/.test(amountText) ||
    !Number.isSafeInteger(amountCents) ||
    amountCents < 1_000 ||
    amountCents > 30_000 ||
    metadata.gift_currency !== 'usd' ||
    !/^[A-Za-z0-9_-]{8,120}$/.test(metadata.gift_offer_id) ||
    !/^[A-Za-z0-9_-]{16,160}$/.test(metadata.gift_run_id) ||
    !boundedSafeText(metadata.gift_item_name, 3, 120) ||
    !boundedSafeText(metadata.gift_category, 2, 50) ||
    !boundedSafeText(metadata.reference_retailer, 2, 80) ||
    !referenceSource ||
    referenceSource !== metadata.reference_source ||
    !/^[A-Za-z0-9_-]{43}$/.test(metadata.gift_metadata_signature)
  ) {
    return null
  }

  const signed: SignedGiftMetadata = {
    amountCents,
    category: metadata.gift_category,
    currency: 'usd',
    giftOfferId: metadata.gift_offer_id,
    giftRunId: metadata.gift_run_id,
    itemName: metadata.gift_item_name,
    referenceRetailer: metadata.reference_retailer,
    referenceSource,
  }
  if (!equalSignature(metadata.gift_metadata_signature, signMetadata(signed, quoteSecret))) {
    return null
  }

  const checkoutCreatedAt = new Date(session.created * 1_000)

  if (
    session.object !== 'checkout.session' ||
    !checkoutSessionPattern.test(session.id) ||
    session.mode !== 'payment' ||
    session.client_reference_id !== signed.giftRunId ||
    session.amount_total !== signed.amountCents ||
    session.currency !== signed.currency ||
    !session.integration_identifier ||
    !/^saberistic_gift_draft_[a-z]{8}$/.test(session.integration_identifier) ||
    !Number.isSafeInteger(session.created) ||
    Number.isNaN(checkoutCreatedAt.getTime()) ||
    !Array.isArray(session.custom_fields) ||
    !['complete', 'expired', 'open'].includes(session.status ?? '')
  ) {
    return null
  }

  return {
    ...signed,
    checkoutCreatedAt: checkoutCreatedAt.toISOString(),
    stripeCheckoutSessionId: session.id,
    checkoutStatus: session.status as ValidatedGiftSession['checkoutStatus'],
    giftNote: giftNote(session),
    payerEmail: payerEmail(session),
    stripePaymentIntentId: paymentIntentId(session.payment_intent),
  }
}
