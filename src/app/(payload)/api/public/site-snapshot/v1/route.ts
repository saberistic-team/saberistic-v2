import { createHash } from 'node:crypto'

import { getPublicSiteContent } from '@/lib/public-content/prototypes'
import { publicSiteSnapshotVersion, type PublicSiteSnapshot } from '@/lib/public-content/snapshot'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const headers = {
  'Cache-Control': 'no-store, max-age=0',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
}

export async function GET() {
  const { homepage, prototypes } = await getPublicSiteContent()

  if (homepage.state === 'unavailable' || prototypes.state === 'unavailable') {
    return Response.json(
      { status: 'unavailable' },
      {
        headers,
        status: 503,
      },
    )
  }

  const contentRevision = createHash('sha256')
    .update(JSON.stringify({ homepage, prototypes, version: publicSiteSnapshotVersion }))
    .digest('hex')
  const snapshot: PublicSiteSnapshot = {
    contentRevision,
    generatedAt: new Date().toISOString(),
    homepage,
    prototypes,
    version: publicSiteSnapshotVersion,
  }

  return Response.json(snapshot, { headers })
}
