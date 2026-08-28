import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export function GET() {
  const response = NextResponse.json({
    status: 'ok',
    service: 'saberistic-web',
    commit: process.env.RENDER_GIT_COMMIT?.slice(0, 12) || 'local',
  })

  response.headers.set('Cache-Control', 'no-store')
  return response
}
