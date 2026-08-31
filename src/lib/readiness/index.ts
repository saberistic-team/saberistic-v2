import { createDeterministicReadinessReport, scoreReadiness } from './score.v1'
import type { AssessmentResult } from './types'
import { validateReadinessManifest } from './validate.v1'

export * from './blockers.v1'
export * from './controls.v1'
export * from './prompt.v1'
export * from './questions.v1'
export * from './report-schema.v1'
export * from './score.v1'
export * from './types'
export * from './validate.v1'

export function assessReadiness(input: unknown): AssessmentResult {
  const validation = validateReadinessManifest(input)
  if (!validation.ok) return validation

  const policyResult = scoreReadiness(validation.value)
  const report = createDeterministicReadinessReport(validation.value, policyResult)

  return { issues: [], ok: true, report, value: validation.value }
}
