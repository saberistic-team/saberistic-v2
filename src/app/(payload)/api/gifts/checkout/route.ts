import { handleGiftCheckout, handleGiftCheckoutOptions } from '@/lib/gifts/server/checkout-handler'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function OPTIONS(request: Request) {
  return handleGiftCheckoutOptions(request)
}

export async function POST(request: Request) {
  return handleGiftCheckout(request)
}
