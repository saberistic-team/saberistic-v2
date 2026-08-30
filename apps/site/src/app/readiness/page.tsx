import type { Metadata } from 'next'
import { Suspense } from 'react'

import { ReadinessContent, ReadinessInteractive } from './ReadinessStaticPage'

export const metadata: Metadata = {
  description:
    'A deterministic preview of the Saberistic Production Readiness Check and its AI boundary.',
  title: 'Production Readiness Preview',
}

export default function ReadinessPage() {
  return (
    <Suspense fallback={<ReadinessContent diagnosticIntent={false} selectedKey="ai-saas" />}>
      <ReadinessInteractive />
    </Suspense>
  )
}
