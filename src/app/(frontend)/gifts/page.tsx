import type { Metadata } from 'next'

import { GiftDiscoveryGame } from '@/components/gifts/GiftDiscoveryGame'
import { createPageMetadata } from '@/lib/seo'

export const metadata: Metadata = createPageMetadata({
  description:
    'Play a quick three-round gift draft using cached AI-created concepts, generated artwork, and transparent contribution amounts.',
  path: '/gifts/',
  title: 'Gift Draft',
})

export default function GiftsPage() {
  return <GiftDiscoveryGame />
}
