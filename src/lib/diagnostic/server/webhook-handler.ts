import 'server-only'

import type Stripe from 'stripe'

import { resolveDiagnosticFulfillmentConfig, resolveDiagnosticWebhookConfig } from './config'
import { buildCustomerPaidEmail, buildInternalPaidEmail, sendDiagnosticEmail } from './email'
import {
  DiagnosticBodyFailure,
  diagnosticJSONResponse,
  diagnosticMediaType,
  readBoundedDiagnosticText,
} from './http'
import {
  payloadDiagnosticStore,
  type DiagnosticRequestRecord,
  type DiagnosticRequestUpdate,
  type DiagnosticStore,
} from './persistence'
import { diagnosticAmountCents, diagnosticCurrency, verifyDiagnosticStripeEvent } from './stripe'

const maximumWebhookBytes = 512 * 1024
const paidEventTypes = new Set([
  'checkout.session.async_payment_succeeded',
  'checkout.session.completed',
])

type WebhookHandlerDependencies = {
  environment?: NodeJS.ProcessEnv
  now?: () => number
  sendEmail?: typeof sendDiagnosticEmail
  store?: DiagnosticStore
  verifyEvent?: typeof verifyDiagnosticStripeEvent
}

type PaidCheckout = {
  eventId: string
  paymentIntentId: string
  requestId: string
  sessionId: string
}

function uuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  )
}

function providerId(value: unknown, prefix: string): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 255 &&
    new RegExp(`^${prefix}_[A-Za-z0-9_]+$`).test(value)
  )
}

function diagnosticCheckout(
  event: Stripe.Event,
  expectedPaymentStatus: 'paid' | 'unpaid',
): PaidCheckout | null {
  if (!paidEventTypes.has(event.type) || !providerId(event.id, 'evt')) return null

  const session = event.data.object as Stripe.Checkout.Session
  const metadata = session.metadata
  const metadataKeys = metadata ? Object.keys(metadata) : []
  const requestId = metadata?.diagnostic_request_id
  const paymentIntentId =
    typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id

  if (
    session.object !== 'checkout.session' ||
    !providerId(session.id, 'cs') ||
    session.mode !== 'payment' ||
    session.status !== 'complete' ||
    session.payment_status !== expectedPaymentStatus ||
    session.amount_total !== diagnosticAmountCents ||
    session.currency !== diagnosticCurrency ||
    metadataKeys.length !== 1 ||
    metadataKeys[0] !== 'diagnostic_request_id' ||
    !uuid(requestId) ||
    session.client_reference_id !== requestId ||
    !providerId(paymentIntentId, 'pi')
  ) {
    return null
  }

  return {
    eventId: event.id,
    paymentIntentId,
    requestId,
    sessionId: session.id,
  }
}

export function paidDiagnosticCheckout(event: Stripe.Event): PaidCheckout | null {
  return diagnosticCheckout(event, 'paid')
}

function claimedDiagnosticRequestId(event: Stripe.Event): string | null {
  if (!paidEventTypes.has(event.type)) return null
  const session = event.data.object as Stripe.Checkout.Session
  return session.object === 'checkout.session' && uuid(session.metadata?.diagnostic_request_id)
    ? session.metadata.diagnostic_request_id
    : null
}

function paymentMatchesRecord(record: DiagnosticRequestRecord, checkout: PaidCheckout): boolean {
  return (
    record.requestId === checkout.requestId &&
    record.stripeCheckoutSessionId === checkout.sessionId &&
    (!record.stripePaymentIntentId || record.stripePaymentIntentId === checkout.paymentIntentId)
  )
}

export async function handleDiagnosticStripeWebhook(
  request: Request,
  dependencies: WebhookHandlerDependencies = {},
): Promise<Response> {
  const environment = dependencies.environment ?? process.env
  const config = resolveDiagnosticWebhookConfig(environment)
  if (!config) {
    return diagnosticJSONResponse(null, { error: 'Webhook is unavailable.' }, 503, false)
  }
  if (diagnosticMediaType(request) !== 'application/json') {
    return diagnosticJSONResponse(null, { error: 'Unsupported webhook media type.' }, 415, false)
  }

  const signature = request.headers.get('stripe-signature')?.trim()
  if (!signature || signature.length > 2_048) {
    return diagnosticJSONResponse(null, { error: 'Webhook signature is invalid.' }, 400, false)
  }

  let rawBody: string
  try {
    rawBody = await readBoundedDiagnosticText(request, maximumWebhookBytes)
  } catch (error) {
    const oversized = error instanceof DiagnosticBodyFailure && error.reason === 'oversized'
    return diagnosticJSONResponse(
      null,
      { error: oversized ? 'Webhook body is too large.' : 'Webhook body is invalid.' },
      oversized ? 413 : 400,
      false,
    )
  }

  let event: Stripe.Event
  try {
    event = (dependencies.verifyEvent ?? verifyDiagnosticStripeEvent)(rawBody, signature, config)
  } catch {
    return diagnosticJSONResponse(null, { error: 'Webhook signature is invalid.' }, 400, false)
  }

  if (!paidEventTypes.has(event.type)) {
    return diagnosticJSONResponse(null, { received: true }, 200, false)
  }

  if (!claimedDiagnosticRequestId(event)) {
    return diagnosticJSONResponse(null, { received: true }, 200, false)
  }

  const suppliedSession = event.data.object as Stripe.Checkout.Session
  if (event.type === 'checkout.session.completed' && suppliedSession.payment_status === 'unpaid') {
    if (!diagnosticCheckout(event, 'unpaid')) {
      return diagnosticJSONResponse(null, { error: 'Checkout data is invalid.' }, 400, false)
    }
    return diagnosticJSONResponse(null, { received: true }, 200, false)
  }

  const checkout = paidDiagnosticCheckout(event)
  if (!checkout) {
    return diagnosticJSONResponse(null, { error: 'Paid checkout data is invalid.' }, 400, false)
  }

  const store = dependencies.store ?? payloadDiagnosticStore
  let record: DiagnosticRequestRecord | null
  try {
    record = await store.findByRequestId(checkout.requestId)
  } catch {
    return diagnosticJSONResponse(null, { error: 'Payment record lookup failed.' }, 500, false)
  }
  if (!record) {
    return diagnosticJSONResponse(null, { error: 'Payment record was not found.' }, 404, false)
  }
  if (!paymentMatchesRecord(record, checkout)) {
    return diagnosticJSONResponse(null, { error: 'Payment record does not match.' }, 409, false)
  }

  const nowMs = (dependencies.now ?? Date.now)()
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) {
    return diagnosticJSONResponse(null, { error: 'Payment update is unavailable.' }, 503, false)
  }
  const paidAt = new Date(nowMs).toISOString()

  try {
    if (record.paymentStatus !== 'paid') {
      record = await store.update(record.id, {
        bookingStatus: 'awaiting_selection',
        paymentConfirmedAt: paidAt,
        paymentStatus: 'paid',
        stripeEventId: record.stripeEventId ?? checkout.eventId,
        stripePaymentIntentId: checkout.paymentIntentId,
      })
    }
  } catch {
    return diagnosticJSONResponse(null, { error: 'Payment update failed.' }, 500, false)
  }

  const fulfillment = resolveDiagnosticFulfillmentConfig(environment)
  if (!fulfillment) {
    return diagnosticJSONResponse(
      null,
      { error: 'Payment was recorded, but fulfillment is unavailable.' },
      500,
      false,
    )
  }

  const sendEmail = dependencies.sendEmail ?? sendDiagnosticEmail
  const pendingEmails: Array<{
    field: 'customerConfirmationEmailId' | 'paidNotificationEmailId'
    sentAt: 'customerConfirmationSentAt' | 'paidNotificationSentAt'
    task: Promise<string>
  }> = []
  if (!record.customerConfirmationEmailId) {
    pendingEmails.push({
      field: 'customerConfirmationEmailId',
      sentAt: 'customerConfirmationSentAt',
      task: sendEmail(
        buildCustomerPaidEmail(record.email, fulfillment.bookingUrl),
        `diagnostic-paid-customer-${record.requestId}`,
        fulfillment,
      ),
    })
  }
  if (!record.paidNotificationEmailId) {
    pendingEmails.push({
      field: 'paidNotificationEmailId',
      sentAt: 'paidNotificationSentAt',
      task: sendEmail(
        buildInternalPaidEmail(record.requestId),
        `diagnostic-paid-internal-${record.requestId}`,
        fulfillment,
      ),
    })
  }

  const results = await Promise.allSettled(pendingEmails.map((email) => email.task))
  const updates: DiagnosticRequestUpdate = {}
  let failed = false
  results.forEach((result, index) => {
    const pending = pendingEmails[index]
    if (!pending) return
    if (result.status === 'rejected') {
      failed = true
      return
    }
    updates[pending.field] = result.value
    updates[pending.sentAt] = paidAt
  })

  if (Object.keys(updates).length > 0) {
    try {
      await store.update(record.id, updates)
    } catch {
      return diagnosticJSONResponse(
        null,
        { error: 'Payment email status update failed.' },
        500,
        false,
      )
    }
  }
  if (failed) {
    return diagnosticJSONResponse(null, { error: 'Payment email delivery failed.' }, 500, false)
  }

  return diagnosticJSONResponse(null, { received: true }, 200, false)
}
