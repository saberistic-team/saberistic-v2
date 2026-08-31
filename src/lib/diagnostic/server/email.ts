import 'server-only'

import type { ReadinessReport } from '@/lib/readiness'

import type { DiagnosticProviderConfig } from './config'
import { diagnosticInternalRecipient } from './config'

type ResendAttachment = {
  content: string
  filename: string
}

export type DiagnosticEmail = {
  attachments?: ResendAttachment[]
  html: string
  subject: string
  text: string
  to: string[]
}

type SendEmailOptions = {
  fetch?: typeof fetch
}

const levelLabels: Record<ReadinessReport['level'], string> = {
  demo_only: 'Demo only',
  internal_beta: 'Internal beta',
  limited_production: 'Limited production',
  production_candidate: 'Production candidate',
}

export function escapeDiagnosticHTML(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    if (character === '&') return '&amp;'
    if (character === '<') return '&lt;'
    if (character === '>') return '&gt;'
    if (character === '"') return '&quot;'
    return '&#39;'
  })
}

function reportText(report: ReadinessReport): string {
  const blockerText = report.blockers.length
    ? report.blockers.map((blocker) => `- ${blocker.label}\n  ${blocker.explanation}`).join('\n')
    : '- No release-blocking control was identified from the supplied answers.'
  const plan48Hours = report.plan48Hours.map((item) => `- ${item.label}: ${item.detail}`).join('\n')
  const planTwoWeeks = report.planTwoWeeks
    .map((item) => `- ${item.label}: ${item.detail}`)
    .join('\n')

  return [
    'Your Saberistic readiness report',
    '',
    `Readiness level: ${levelLabels[report.level]}`,
    `Score: ${report.score}/100`,
    '',
    report.summary,
    '',
    'Release blockers',
    blockerText,
    '',
    'Next 48 hours',
    plan48Hours || '- No immediate action was generated.',
    '',
    'Next two weeks',
    planTwoWeeks || '- No two-week action was generated.',
    '',
    report.disclaimer,
    '',
    'A JSON copy of the complete report is attached for your records.',
  ].join('\n')
}

function reportList(items: Array<{ detail: string; label: string }>): string {
  if (items.length === 0) return '<li>No action was generated for this phase.</li>'
  return items
    .map(
      (item) =>
        `<li><strong>${escapeDiagnosticHTML(item.label)}</strong><br>${escapeDiagnosticHTML(item.detail)}</li>`,
    )
    .join('')
}

export function buildCustomerReportEmail(
  name: string,
  email: string,
  report: ReadinessReport,
): DiagnosticEmail {
  const blockers = report.blockers.length
    ? report.blockers
        .map(
          (blocker) =>
            `<li><strong>${escapeDiagnosticHTML(blocker.label)}</strong><br>${escapeDiagnosticHTML(blocker.explanation)}</li>`,
        )
        .join('')
    : '<li>No release-blocking control was identified from the supplied answers.</li>'
  const safeName = escapeDiagnosticHTML(name)

  return {
    attachments: [
      {
        content: Buffer.from(JSON.stringify(report, null, 2), 'utf8').toString('base64'),
        filename: 'saberistic-readiness-report.json',
      },
    ],
    html: `<!doctype html><html lang="en"><body style="margin:0;background:#f4f1e9;color:#17211b;font-family:Arial,sans-serif"><main style="max-width:680px;margin:0 auto;padding:32px 20px"><p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase">Saberistic architecture diagnostic</p><h1 style="font-size:30px;line-height:1.15">Your readiness report</h1><p>Hi ${safeName},</p><p>Here is the assessment snapshot you created. Keep the attached JSON as a portable copy.</p><section style="background:#fff;border:1px solid #d8d2c4;border-radius:12px;padding:20px"><p><strong>Readiness level:</strong> ${escapeDiagnosticHTML(levelLabels[report.level])}<br><strong>Score:</strong> ${report.score}/100</p><p>${escapeDiagnosticHTML(report.summary)}</p></section><h2>Release blockers</h2><ul>${blockers}</ul><h2>Next 48 hours</h2><ul>${reportList(report.plan48Hours)}</ul><h2>Next two weeks</h2><ul>${reportList(report.planTwoWeeks)}</ul><p style="font-size:13px;color:#56605a">${escapeDiagnosticHTML(report.disclaimer)}</p></main></body></html>`,
    subject: 'Your Saberistic readiness report',
    text: `Hi ${name},\n\n${reportText(report)}`,
    to: [email],
  }
}

export function buildInternalLeadEmail(requestId: string): DiagnosticEmail {
  const safeRequestId = escapeDiagnosticHTML(requestId)
  return {
    html: `<p>Request type: architecture_diagnostic</p><p>Request ID: ${safeRequestId}</p>`,
    subject: `New architecture diagnostic request — ${requestId}`,
    text: `Request type: architecture_diagnostic\nRequest ID: ${requestId}`,
    to: [diagnosticInternalRecipient],
  }
}

export function buildCustomerPaidEmail(email: string, bookingUrl: string): DiagnosticEmail {
  const safeBookingUrl = escapeDiagnosticHTML(bookingUrl)
  return {
    html: `<!doctype html><html lang="en"><body><h1>Your architecture diagnostic is ready to schedule</h1><p>Payment is confirmed. Choose the exact call time that works for you:</p><p><a href="${safeBookingUrl}">Pick your call time</a></p><p>If the button does not open, copy this address into your browser:<br>${safeBookingUrl}</p></body></html>`,
    subject: 'Choose your architecture diagnostic call time',
    text: `Payment is confirmed. Choose your architecture diagnostic call time:\n${bookingUrl}`,
    to: [email],
  }
}

export function buildInternalPaidEmail(requestId: string): DiagnosticEmail {
  const safeRequestId = escapeDiagnosticHTML(requestId)
  return {
    html: `<p>Request type: architecture_diagnostic</p><p>Request ID: ${safeRequestId}</p><p>Payment state: paid</p>`,
    subject: `Paid architecture diagnostic request — ${requestId}`,
    text: `Request type: architecture_diagnostic\nRequest ID: ${requestId}\nPayment state: paid`,
    to: [diagnosticInternalRecipient],
  }
}

export async function sendDiagnosticEmail(
  message: DiagnosticEmail,
  idempotencyKey: string,
  config: Pick<DiagnosticProviderConfig, 'resendApiKey' | 'resendFrom'>,
  options: SendEmailOptions = {},
): Promise<string> {
  if (!/^[a-z0-9][a-z0-9-]{7,127}$/.test(idempotencyKey)) {
    throw new Error('resend_idempotency_key_invalid')
  }

  const response = await (options.fetch ?? fetch)('https://api.resend.com/emails', {
    body: JSON.stringify({ ...message, from: config.resendFrom }),
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
      'User-Agent': 'saberistic-diagnostic/1.0',
    },
    method: 'POST',
    signal: AbortSignal.timeout(6_000),
  })

  if (!response.ok) throw new Error('resend_request_failed')

  const rawResponse = await response.text()
  if (rawResponse.length > 8_192) throw new Error('resend_response_invalid')

  let body: unknown
  try {
    body = JSON.parse(rawResponse)
  } catch {
    throw new Error('resend_response_invalid')
  }
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    typeof (body as { id?: unknown }).id !== 'string' ||
    !/^[A-Za-z0-9_-]{8,255}$/.test((body as { id: string }).id)
  ) {
    throw new Error('resend_response_invalid')
  }

  return (body as { id: string }).id
}
