import {
  handleDiagnosticOptions,
  handleDiagnosticRequest,
} from '@/lib/diagnostic/server/request-handler'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function OPTIONS(request: Request) {
  return handleDiagnosticOptions(request)
}

export async function POST(request: Request) {
  return handleDiagnosticRequest(request)
}
