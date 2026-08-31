import type { Metadata } from 'next'

import { GiftDiscoveryGame } from '@/components/gifts/GiftDiscoveryGame'
import { createPageMetadata } from '@/lib/seo'

import { giftEndpoints } from '../../lib/gift-endpoints'

export const metadata: Metadata = createPageMetadata({
  description:
    'Play a three-round gift draft for AmirSaber using varied, search-backed ideas and a transparent Stripe funding handoff.',
  path: '/gifts/',
  title: 'Gift Draft',
})

export default function GiftsPage() {
  const { checkoutEndpoint, ideasEndpoint, paymentStatusEndpoint } = giftEndpoints()

  return (
    <GiftDiscoveryGame
      checkoutEndpoint={checkoutEndpoint}
      ideasEndpoint={ideasEndpoint}
      paymentStatusEndpoint={paymentStatusEndpoint}
    />
  )
}
