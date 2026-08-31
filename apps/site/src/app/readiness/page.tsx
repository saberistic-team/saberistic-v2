import type { Metadata } from 'next'
import { Suspense } from 'react'

import { ReadinessAssessment } from '@/components/readiness/ReadinessAssessment'
import { createPageMetadata } from '@/lib/seo'

import {
  readinessAssessmentEndpoint,
  readinessDiagnosticEndpoint,
} from '../../lib/readiness-endpoint'
import { ReadinessInteractive } from './ReadinessStaticPage'

export const metadata: Metadata = createPageMetadata({
  description:
    'Answer controlled architecture questions and get a deterministic production-readiness level, hard blockers, unknowns, and a prioritized plan.',
  path: '/readiness/',
  title: 'Production Readiness Check',
})

export default function ReadinessPage() {
  const assessmentEndpoint = readinessAssessmentEndpoint()
  const diagnosticEndpoint = readinessDiagnosticEndpoint()

  return (
    <Suspense
      fallback={
        <ReadinessAssessment
          assessmentEndpoint={assessmentEndpoint}
          diagnosticEndpoint={diagnosticEndpoint}
        />
      }
    >
      <ReadinessInteractive
        assessmentEndpoint={assessmentEndpoint}
        diagnosticEndpoint={diagnosticEndpoint}
      />
    </Suspense>
  )
}
