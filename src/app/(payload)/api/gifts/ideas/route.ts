import {
  handleGiftIdeas,
  handleGiftIdeasOptions,
  handleGiftIdeasStatus,
} from '@/lib/gifts/server/ideas-handler'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function OPTIONS(request: Request) {
  return handleGiftIdeasOptions(request)
}

export async function GET(request: Request) {
  return handleGiftIdeasStatus(request)
}

export async function POST(request: Request) {
  return handleGiftIdeas(request)
}
