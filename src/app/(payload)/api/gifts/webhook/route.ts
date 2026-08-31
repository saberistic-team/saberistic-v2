import { handleGiftWebhook } from '@/lib/gifts/server/webhook-handler'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
  return handleGiftWebhook(request)
}
