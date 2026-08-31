import {
  handleReadinessAssessment,
  handleReadinessOptions,
} from '@/lib/readiness/server/assessment-handler'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function OPTIONS(request: Request) {
  return handleReadinessOptions(request)
}

export async function POST(request: Request) {
  return handleReadinessAssessment(request)
}
