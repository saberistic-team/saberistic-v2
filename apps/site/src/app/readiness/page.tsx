import type { Metadata } from 'next'
import { Suspense } from 'react'

import { createPageMetadata } from '@/lib/seo'

import { ReadinessContent, ReadinessInteractive } from './ReadinessStaticPage'

export const metadata: Metadata = createPageMetadata({
  description:
    'A deterministic preview of the Saberistic Production Readiness Check and its AI boundary.',
  path: '/readiness/',
  title: 'Production Readiness Preview',
})

export default function ReadinessPage() {
  return (
    <Suspense fallback={<ReadinessContent diagnosticIntent={false} selectedKey="ai-saas" />}>
      <ReadinessInteractive />
    </Suspense>
  )
}
