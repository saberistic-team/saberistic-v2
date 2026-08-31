import type { Metadata } from 'next'

import { GiftDiscoveryGame } from '@/components/gifts/GiftDiscoveryGame'
import { createPageMetadata } from '@/lib/seo'

export const metadata: Metadata = createPageMetadata({
  description:
    'Play a three-round gift draft for AmirSaber using varied, search-backed ideas and a transparent Stripe funding handoff.',
  path: '/gifts/',
  title: 'Gift Draft',
})

export default function GiftsPage() {
  return <GiftDiscoveryGame />
}
