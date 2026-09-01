import { getGiftInventoryArtwork, getGiftInventoryDatabase } from '@/lib/gifts/server/inventory'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const sharedHeaders = {
  'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
  'Content-Type': 'image/webp',
  'Cross-Origin-Resource-Policy': 'cross-origin',
  'X-Content-Type-Options': 'nosniff',
} as const

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params
    const artwork = await getGiftInventoryArtwork(getGiftInventoryDatabase(), id)
    if (!artwork) {
      return new Response(null, { headers: { 'Cache-Control': 'no-store' }, status: 404 })
    }

    const etag = `"${artwork.sha256}"`
    if (request.headers.get('if-none-match') === etag) {
      return new Response(null, { headers: { ...sharedHeaders, ETag: etag }, status: 304 })
    }

    return new Response(Buffer.from(artwork.bytes), {
      headers: {
        ...sharedHeaders,
        'Content-Length': String(artwork.bytes.byteLength),
        ETag: etag,
      },
      status: 200,
    })
  } catch (error) {
    const code = error instanceof Error ? error.message : ''
    return new Response(null, {
      headers: { 'Cache-Control': 'no-store', 'Retry-After': '30' },
      status: code === 'gift_inventory_id_invalid' ? 404 : 503,
    })
  }
}
