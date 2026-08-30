import { createBuildNotesRSS } from '@/lib/build-notes-feed'

export const dynamic = 'force-static'

export function GET() {
  return new Response(createBuildNotesRSS(), {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
