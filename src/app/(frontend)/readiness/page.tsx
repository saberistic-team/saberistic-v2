import type { Metadata } from 'next'

import { ReadinessAssessment } from '@/components/readiness/ReadinessAssessment'
import type { ReadinessProfile } from '@/lib/readiness'
import { createPageMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = createPageMetadata({
  description:
    'Answer controlled architecture questions and get a deterministic production-readiness level, hard blockers, unknowns, and a prioritized plan.',
  path: '/readiness/',
  title: 'Production Readiness Check',
})

type ReadinessPageProps = {
  searchParams: Promise<{
    checkout?: string | string[]
    next?: string | string[]
    profile?: string | string[]
  }>
}

function firstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}

function profileFromSearch(value?: string): ReadinessProfile {
  switch (value) {
    case 'agent-workflow':
    case 'agent_workflow':
      return 'agent_workflow'
    case 'payments':
      return 'payments'
    case 'custom':
      return 'custom'
    default:
      return 'ai_saas'
  }
}

export default async function ReadinessPage({ searchParams }: ReadinessPageProps) {
  const params = await searchParams
  const checkoutValue = firstValue(params.checkout)
  const checkoutReturn =
    checkoutValue === 'canceled' || checkoutValue === 'success' ? checkoutValue : null
  const diagnosticIntent = firstValue(params.next) === 'architecture-diagnostic'
  const initialProfile = profileFromSearch(firstValue(params.profile))

  return (
    <ReadinessAssessment
      checkoutReturn={checkoutReturn}
      diagnosticIntent={diagnosticIntent}
      initialProfile={initialProfile}
      key={`${initialProfile}:${diagnosticIntent ? 'diagnostic' : 'standard'}:${checkoutReturn ?? 'new'}`}
    />
  )
}
