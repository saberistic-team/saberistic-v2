'use client'

import { useSearchParams } from 'next/navigation'

import { ReadinessAssessment } from '@/components/readiness/ReadinessAssessment'
import type { ReadinessProfile } from '@/lib/readiness'

function profileFromSearch(value: string | null): ReadinessProfile {
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

export function ReadinessInteractive({
  assessmentEndpoint,
  diagnosticEndpoint,
}: {
  assessmentEndpoint: string
  diagnosticEndpoint: string
}) {
  const searchParams = useSearchParams()
  const checkoutValue = searchParams.get('checkout')
  const checkoutReturn =
    checkoutValue === 'canceled' || checkoutValue === 'success' ? checkoutValue : null
  const diagnosticIntent = searchParams.get('next') === 'architecture-diagnostic'
  const initialProfile = profileFromSearch(searchParams.get('profile'))

  return (
    <ReadinessAssessment
      assessmentEndpoint={assessmentEndpoint}
      checkoutReturn={checkoutReturn}
      diagnosticEndpoint={diagnosticEndpoint}
      diagnosticIntent={diagnosticIntent}
      initialProfile={initialProfile}
      key={`${initialProfile}:${diagnosticIntent ? 'diagnostic' : 'standard'}:${checkoutReturn ?? 'new'}`}
    />
  )
}
