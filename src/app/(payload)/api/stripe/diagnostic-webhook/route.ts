import { handleDiagnosticStripeWebhook } from '@/lib/diagnostic/server/webhook-handler'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
  return handleDiagnosticStripeWebhook(request)
}
