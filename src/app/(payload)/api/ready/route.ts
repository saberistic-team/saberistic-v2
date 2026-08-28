import config from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const payload = await getPayload({ config })

    await payload.find({
      collection: 'prototypes',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      pagination: false,
      select: { slug: true },
    })

    const response = NextResponse.json({ status: 'ready' })
    response.headers.set('Cache-Control', 'no-store')
    return response
  } catch {
    const response = NextResponse.json({ status: 'not_ready' }, { status: 503 })
    response.headers.set('Cache-Control', 'no-store')
    return response
  }
}
