import { readinessBlockersV1 } from './blockers.v1'
import {
  readinessActionCatalogV1,
  readinessControlById,
  readinessControlsV1,
  readinessMaintenanceActionCatalogV1,
} from './controls.v1'
import { readinessQuestionById } from './questions.v1'
import {
  readinessDimensions,
  readinessLevels,
  readinessPolicyVersion,
  type BlockerResult,
  type ControlEvaluation,
  type ControlStatus,
  type DimensionScore,
  type DoNotOptimizeDefinition,
  type NextStepId,
  type QuestionId,
  type ReadinessDimension,
  type ReadinessLevel,
  type ReadinessManifest,
  type ReadinessNextStep,
  type ReadinessPolicyResult,
  type ReadinessReport,
  type ReportDoNotOptimizeItem,
  type ReportPlanItem,
  type StrengthResult,
  type UnknownResult,
} from './types'

const statusHalfPoints: Record<ControlStatus, 0 | 1 | 2> = {
  fail: 0,
  not_applicable: 0,
  partial: 1,
  pass: 2,
  unknown: 0,
}

const severityRank = { critical: 0, major: 1 } as const
const statusActionRank: Record<ControlStatus, number> = {
  fail: 0,
  unknown: 1,
  partial: 2,
  pass: 3,
  not_applicable: 4,
}
const reportActionLimit = 6
const reportStrengthLimit = 6

export const readinessDisclaimer =
  'This directional result is based only on your controlled answers. It is not a security audit, code review, compliance assessment, certification, or guarantee of production safety.'

export const doNotOptimizeCatalogV1 = [
  {
    detail:
      'Do not present this self-reported directional result as an audit, certification, compliance finding, or proof that implementation was inspected.',
    id: 'DNO-CERTIFICATION',
    label: 'Do not turn the level into a certification claim',
    priority: 1,
  },
  {
    detail:
      'Resolve access, secret, recovery, payment, and material-action boundaries before polishing secondary features or visual details.',
    id: 'DNO-POLISH-BEFORE-GATES',
    label: 'Do not polish around unresolved production gates',
    priority: 2,
  },
  {
    detail:
      'Do not add capacity or architectural complexity before current limits, critical paths, and failure behavior are measured.',
    id: 'DNO-SCALE-BEFORE-LIMITS',
    label: 'Do not scale before the operating envelope is bounded',
    priority: 3,
  },
  {
    detail:
      'Do not spend time tuning models or adding autonomous tools before approval, privacy, cost, and recovery boundaries are proven.',
    id: 'DNO-MODEL-TUNING',
    label: 'Do not tune the AI layer before its action boundary',
    priority: 4,
  },
] as const satisfies readonly DoNotOptimizeDefinition[]

function roundNonnegativeRatioHalfUp(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0
  return Math.floor((2 * numerator + denominator) / (2 * denominator))
}

export function roundReadinessScoreHalfUp(
  earnedHalfPoints: number,
  maximumHalfPoints: number,
): number {
  if (
    !Number.isSafeInteger(earnedHalfPoints) ||
    !Number.isSafeInteger(maximumHalfPoints) ||
    earnedHalfPoints < 0 ||
    maximumHalfPoints <= 0 ||
    earnedHalfPoints > maximumHalfPoints
  ) {
    throw new RangeError('Readiness half-points must be safe integers within their maximum.')
  }

  return roundNonnegativeRatioHalfUp(earnedHalfPoints * 100, maximumHalfPoints)
}

function aggregateEvaluations(evaluations: readonly ControlEvaluation[]): DimensionScore {
  let applicableWeight = 0
  let completeWeight = 0
  let earnedHalfPoints = 0

  for (const evaluation of evaluations) {
    if (evaluation.status === 'not_applicable') continue

    applicableWeight += evaluation.weight
    earnedHalfPoints += statusHalfPoints[evaluation.status] * evaluation.weight
    if (evaluation.status !== 'unknown') completeWeight += evaluation.weight
  }

  if (applicableWeight === 0) {
    return {
      applicableWeight: 0,
      completeness: 100,
      earnedHalfPoints: 0,
      score: null,
    }
  }

  return {
    applicableWeight,
    completeness: roundNonnegativeRatioHalfUp(completeWeight * 100, applicableWeight),
    earnedHalfPoints,
    score: roundReadinessScoreHalfUp(earnedHalfPoints, applicableWeight * 2),
  }
}

export function readinessLevelForScore(score: number): ReadinessLevel {
  if (!Number.isSafeInteger(score) || score < 0 || score > 100) {
    throw new RangeError('Readiness score must be a whole number from 0 to 100.')
  }

  if (score <= 44) return 'demo_only'
  if (score <= 64) return 'internal_beta'
  if (score <= 84) return 'limited_production'
  return 'production_candidate'
}

function lowerLevel(left: ReadinessLevel, right: ReadinessLevel): ReadinessLevel {
  return readinessLevels.indexOf(left) <= readinessLevels.indexOf(right) ? left : right
}

function evaluateControls(manifest: ReadinessManifest): ControlEvaluation[] {
  return readinessControlsV1.map((control) => {
    const question = readinessQuestionById[control.questionId]
    const answerValue = manifest.answers[control.questionId]
    const option = question.options.find((candidate) => candidate.value === answerValue)

    if (!option) {
      throw new Error(`Manifest contains an invalid answer for ${control.questionId}.`)
    }
    if (option.status === 'not_applicable' && !control.allowNotApplicable) {
      throw new Error(`Control ${control.id} does not permit a not-applicable answer.`)
    }

    return {
      answerLabel: option.label,
      answerValue,
      controlId: control.id,
      dimension: control.dimension,
      questionId: control.questionId,
      status: option.status,
      weight: control.weight,
    }
  })
}

function evaluateBlockers(manifest: ReadinessManifest): BlockerResult[] {
  return readinessBlockersV1
    .filter((blocker) => blocker.matches(manifest.answers))
    .map((blocker) => {
      const { matches: _matches, ...definition } = blocker

      return {
        ...definition,
        evidence: blocker.evidenceQuestionIds.map((questionId) => {
          const question = readinessQuestionById[questionId]
          const answerValue = manifest.answers[questionId]
          const option = question.options.find((candidate) => candidate.value === answerValue)

          if (!option) throw new Error(`Missing blocker evidence for ${questionId}.`)

          return { answerLabel: option.label, answerValue, questionId }
        }),
        explanation: blocker.rationale,
      }
    })
    .sort(
      (left, right) =>
        severityRank[left.severity] - severityRank[right.severity] ||
        left.dependencyOrder - right.dependencyOrder ||
        left.ruleId.localeCompare(right.ruleId),
    )
}

function unknownsFromEvaluations(evaluations: readonly ControlEvaluation[]): UnknownResult[] {
  return evaluations
    .filter((evaluation) => evaluation.status === 'unknown')
    .map((evaluation) => {
      const control = readinessControlById[evaluation.controlId]

      return {
        controlId: control.id,
        dimension: control.dimension,
        explanation: `${control.label} is unverified, so it earns no readiness credit until evidence replaces the unknown answer.`,
        label: control.label,
        questionId: control.questionId,
        verification: control.verification,
        weight: control.weight,
      }
    })
    .sort(
      (left, right) => right.weight - left.weight || left.controlId.localeCompare(right.controlId),
    )
}

function strengthsFromEvaluations(evaluations: readonly ControlEvaluation[]): StrengthResult[] {
  return evaluations
    .filter((evaluation) => evaluation.status === 'pass')
    .map((evaluation) => {
      const control = readinessControlById[evaluation.controlId]

      return {
        answerLabel: evaluation.answerLabel,
        controlId: control.id,
        dimension: control.dimension,
        explanation: control.strength,
        label: control.label,
        weight: control.weight,
      }
    })
    .sort(
      (left, right) => right.weight - left.weight || left.controlId.localeCompare(right.controlId),
    )
}

export function scoreReadiness(manifest: ReadinessManifest): ReadinessPolicyResult {
  if (manifest.policyVersion !== readinessPolicyVersion) {
    throw new Error(`Unsupported readiness policy version: ${manifest.policyVersion}`)
  }

  const evaluations = evaluateControls(manifest)
  const overall = aggregateEvaluations(evaluations)
  const score = overall.score ?? 0
  const baselineLevel = readinessLevelForScore(score)
  const blockers = evaluateBlockers(manifest)
  let level = blockers.reduce(
    (current, blocker) => lowerLevel(current, blocker.maxLevel),
    baselineLevel,
  )

  const unknownWeightThree = evaluations.some(
    (evaluation) => evaluation.status === 'unknown' && evaluation.weight === 3,
  )
  const hasMajorOrCriticalBlocker = blockers.length > 0

  if (
    level === 'production_candidate' &&
    (overall.completeness < 90 || unknownWeightThree || hasMajorOrCriticalBlocker)
  ) {
    level = 'limited_production'
  }

  const dimensionScores = Object.fromEntries(
    readinessDimensions.map((dimension) => [
      dimension,
      aggregateEvaluations(evaluations.filter((evaluation) => evaluation.dimension === dimension)),
    ]),
  ) as Record<ReadinessDimension, DimensionScore>

  return {
    baselineLevel,
    blockers,
    completeness: overall.completeness,
    dimensionScores,
    evaluations,
    level,
    policyVersion: manifest.policyVersion,
    profile: manifest.profile,
    score,
    strengths: strengthsFromEvaluations(evaluations),
    unknowns: unknownsFromEvaluations(evaluations),
  }
}

function blockerPriorityByQuestion(
  blockers: readonly BlockerResult[],
): ReadonlyMap<QuestionId, number> {
  const priorities = new Map<QuestionId, number>()

  for (const blocker of blockers) {
    const priority = severityRank[blocker.severity]
    for (const questionId of blocker.evidenceQuestionIds) {
      const current = priorities.get(questionId)
      if (current === undefined || priority < current) priorities.set(questionId, priority)
    }
  }

  return priorities
}

function planForPhase(
  policyResult: ReadinessPolicyResult,
  phase: '48_hours' | 'two_weeks',
): ReportPlanItem[] {
  const blockerPriorities = blockerPriorityByQuestion(policyResult.blockers)
  const gaps = policyResult.evaluations
    .filter((evaluation) => ['fail', 'partial', 'unknown'].includes(evaluation.status))
    .sort((left, right) => {
      const leftBlocker = blockerPriorities.get(left.questionId) ?? 3
      const rightBlocker = blockerPriorities.get(right.questionId) ?? 3

      return (
        leftBlocker - rightBlocker ||
        statusActionRank[left.status] - statusActionRank[right.status] ||
        right.weight - left.weight ||
        left.controlId.localeCompare(right.controlId)
      )
    })

  const actions = gaps
    .map((evaluation) =>
      readinessActionCatalogV1.find(
        (action) => action.controlId === evaluation.controlId && action.phase === phase,
      ),
    )
    .filter((action): action is NonNullable<typeof action> => Boolean(action))
    .slice(0, reportActionLimit)

  if (actions.length === 0) {
    const maintenance = readinessMaintenanceActionCatalogV1.find((action) => action.phase === phase)
    if (maintenance) actions.push(maintenance)
  }

  return actions.map((action) => ({
    actionId: action.id,
    controlId: action.controlId,
    detail: action.detail,
    label: action.label,
  }))
}

function doNotOptimizeForResult(
  manifest: ReadinessManifest,
  policyResult: ReadinessPolicyResult,
): ReportDoNotOptimizeItem[] {
  const selected: DoNotOptimizeDefinition[] = [doNotOptimizeCatalogV1[0]]

  if (policyResult.blockers.length > 0 || policyResult.score < 65) {
    selected.push(doNotOptimizeCatalogV1[1])
  }
  if (
    policyResult.evaluations.some(
      (evaluation) => evaluation.controlId === 'RISK-TRAFFIC-001' && evaluation.status !== 'pass',
    ) ||
    policyResult.score < 85
  ) {
    selected.push(doNotOptimizeCatalogV1[2])
  }
  if (
    manifest.profile === 'ai_saas' ||
    manifest.profile === 'agent_workflow' ||
    policyResult.evaluations.some(
      (evaluation) =>
        evaluation.controlId === 'RISK-AI-001' && evaluation.status !== 'not_applicable',
    )
  ) {
    selected.push(doNotOptimizeCatalogV1[3])
  }

  return selected
    .sort((left, right) => left.priority - right.priority)
    .slice(0, 3)
    .map((action) => ({ actionId: action.id, detail: action.detail, label: action.label }))
}

const nextStepLabels: Record<NextStepId, string> = {
  architecture_diagnostic: 'Start the Architecture Diagnostic',
  engineering_rescue_inquiry: 'Engineering Rescue inquiry',
  self_serve: 'Continue with self-serve guidance',
}

function nextStepForResult(policyResult: ReadinessPolicyResult): ReadinessNextStep {
  let id: NextStepId
  let reason: string

  if (policyResult.blockers.some((blocker) => blocker.severity === 'critical')) {
    id = 'engineering_rescue_inquiry'
    reason =
      'At least one uncontained critical boundary needs prompt human triage before broader production work continues.'
  } else if (policyResult.level === 'production_candidate' && policyResult.blockers.length === 0) {
    id = 'self_serve'
    reason =
      'The declared controls support continued self-serve hardening, with periodic evidence refresh and failure exercises.'
  } else {
    id = 'architecture_diagnostic'
    reason =
      'A focused human review can validate the remaining architecture, evidence, and recovery tradeoffs without treating this self-report as an audit.'
  }

  return { id, label: nextStepLabels[id], reason }
}

function deterministicSummary(policyResult: ReadinessPolicyResult): string {
  const blockerCount = policyResult.blockers.length
  const unknownCount = policyResult.unknowns.length

  if (policyResult.level === 'demo_only') {
    return `The declared controls support demo-only use. ${blockerCount} hard blocker${blockerCount === 1 ? '' : 's'} and ${unknownCount} unknown${unknownCount === 1 ? '' : 's'} define the safest next work.`
  }
  if (policyResult.level === 'internal_beta') {
    return `The declared controls support a bounded internal beta. Close the remaining high-consequence gaps before inviting broader production use.`
  }
  if (policyResult.level === 'limited_production') {
    return `The declared controls support limited production only within explicit boundaries. Preserve the confirmed strengths while proving recovery and unresolved high-weight controls.`
  }

  return 'The declared controls meet the production-candidate policy gate. Keep the evidence current and treat the result as directional self-report, not certification.'
}

export function createDeterministicReadinessReport(
  manifest: ReadinessManifest,
  policyResult = scoreReadiness(manifest),
): ReadinessReport {
  if (
    policyResult.policyVersion !== manifest.policyVersion ||
    policyResult.profile !== manifest.profile
  ) {
    throw new Error('The policy result does not belong to this readiness manifest.')
  }

  return {
    baselineLevel: policyResult.baselineLevel,
    blockers: policyResult.blockers,
    completeness: policyResult.completeness,
    dimensionScores: policyResult.dimensionScores,
    disclaimer: readinessDisclaimer,
    doNotOptimizeYet: doNotOptimizeForResult(manifest, policyResult),
    explanationSource: 'deterministic',
    level: policyResult.level,
    nextStep: nextStepForResult(policyResult),
    plan48Hours: planForPhase(policyResult, '48_hours'),
    planTwoWeeks: planForPhase(policyResult, 'two_weeks'),
    policyVersion: policyResult.policyVersion,
    profile: manifest.profile,
    score: policyResult.score,
    strengths: policyResult.strengths.slice(0, reportStrengthLimit),
    summary: deterministicSummary(policyResult),
    unknowns: policyResult.unknowns,
  }
}

export function levelAtOrBelow(level: ReadinessLevel, maximum: ReadinessLevel): boolean {
  return readinessLevels.indexOf(level) <= readinessLevels.indexOf(maximum)
}
