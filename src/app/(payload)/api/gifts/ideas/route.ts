import { handleGiftIdeas, handleGiftIdeasOptions } from '@/lib/gifts/server/ideas-handler'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function OPTIONS(request: Request) {
  return handleGiftIdeasOptions(request)
}

export async function POST(request: Request) {
  return handleGiftIdeas(request)
}
