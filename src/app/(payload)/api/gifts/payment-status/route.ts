import {
  handleGiftPaymentStatus,
  handleGiftPaymentStatusOptions,
} from '@/lib/gifts/server/payment-status-handler'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  return handleGiftPaymentStatus(request)
}

export async function OPTIONS(request: Request) {
  return handleGiftPaymentStatusOptions(request)
}
