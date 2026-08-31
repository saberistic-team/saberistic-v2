export const readinessPolicyVersion = '2026-09-01.1' as const

export const readinessDimensions = [
  'security',
  'reliability',
  'maintainability',
  'data_privacy',
  'operability',
] as const

export const readinessLevels = [
  'demo_only',
  'internal_beta',
  'limited_production',
  'production_candidate',
] as const

export const controlStatuses = ['pass', 'partial', 'unknown', 'fail', 'not_applicable'] as const
export const blockerSeverities = ['critical', 'major'] as const
export const nextStepIds = [
  'self_serve',
  'architecture_diagnostic',
  'engineering_rescue_inquiry',
] as const
export const readinessProfiles = ['ai_saas', 'agent_workflow', 'payments', 'custom'] as const

export type ReadinessPolicyVersion = typeof readinessPolicyVersion
export type ReadinessDimension = (typeof readinessDimensions)[number]
export type ReadinessLevel = (typeof readinessLevels)[number]
export type ControlStatus = (typeof controlStatuses)[number]
export type BlockerSeverity = (typeof blockerSeverities)[number]
export type NextStepId = (typeof nextStepIds)[number]
export type ReadinessProfile = (typeof readinessProfiles)[number]

export type QuestionId =
  | 'architecture.scope'
  | 'architecture.failure_impact'
  | 'architecture.environments'
  | 'architecture.dependencies'
  | 'identity.authorization'
  | 'identity.data_classification'
  | 'identity.tenancy'
  | 'identity.deletion'
  | 'delivery.review'
  | 'delivery.tests'
  | 'delivery.dependencies'
  | 'delivery.rollback'
  | 'operations.monitoring'
  | 'operations.backups'
  | 'operations.runbooks'
  | 'risk.secrets'
  | 'risk.public_mutations'
  | 'risk.payments'
  | 'risk.ai_actions'
  | 'risk.traffic_cost'

export type ControlId =
  | 'ARCH-SCOPE-001'
  | 'ARCH-IMPACT-001'
  | 'ARCH-ENV-001'
  | 'ARCH-DEPS-001'
  | 'IDENT-AUTHZ-001'
  | 'DATA-CLASS-001'
  | 'IDENT-TENANCY-001'
  | 'DATA-DELETE-001'
  | 'DELIVERY-REVIEW-001'
  | 'DELIVERY-TESTS-001'
  | 'DELIVERY-DEPS-001'
  | 'DELIVERY-ROLLBACK-001'
  | 'OPS-MONITOR-001'
  | 'OPS-BACKUP-001'
  | 'OPS-RUNBOOK-001'
  | 'RISK-SECRETS-001'
  | 'RISK-MUTATION-001'
  | 'RISK-PAYMENTS-001'
  | 'RISK-AI-001'
  | 'RISK-TRAFFIC-001'

export type BlockerRuleId =
  | 'SEC-AUTHZ-001'
  | 'SEC-SECRETS-001'
  | 'OPS-BACKUP-001'
  | 'PAY-WEBHOOK-001'
  | 'AI-APPROVAL-001'
  | 'SEC-MUTATION-001'
  | 'REL-ROLLBACK-001'
  | 'OPS-RESTORE-001'

export type PlanPhase = '48_hours' | 'two_weeks'
export type ExplanationSource = 'deterministic' | 'model'

export type ReadinessAnswers = Record<QuestionId, string>

export interface ReadinessManifest {
  answers: ReadinessAnswers
  policyVersion: ReadinessPolicyVersion
  profile: ReadinessProfile
  symptom?: string
}

export interface ReadinessAssessmentRequest extends ReadinessManifest {
  anonymousToken: string
}

export interface ReadinessAnswerOption {
  description: string
  label: string
  status: ControlStatus
  value: string
}

export interface ReadinessQuestion {
  controlId: ControlId
  description: string
  id: QuestionId
  label: string
  options: readonly ReadinessAnswerOption[]
  sectionId: ReadinessSectionId
}

export type ReadinessSectionId =
  'stage_architecture' | 'identity_data' | 'delivery' | 'operations' | 'risk_boundaries'

export interface ReadinessSection {
  description: string
  id: ReadinessSectionId
  label: string
  questionIds: readonly QuestionId[]
}

export interface ReadinessActionPair {
  action48Hours: string
  actionTwoWeeks: string
}

export interface ReadinessControl {
  actions: ReadinessActionPair
  allowNotApplicable: boolean
  dimension: ReadinessDimension
  id: ControlId
  label: string
  questionId: QuestionId
  strength: string
  verification: string
  weight: 1 | 2 | 3
}

export interface ControlEvaluation {
  answerLabel: string
  answerValue: string
  controlId: ControlId
  dimension: ReadinessDimension
  questionId: QuestionId
  status: ControlStatus
  weight: 1 | 2 | 3
}

export interface AnswerEvidence {
  answerLabel: string
  answerValue: string
  questionId: QuestionId
}

export interface BlockerDefinition {
  dependencyOrder: number
  evidenceQuestionIds: readonly QuestionId[]
  label: string
  maxLevel: ReadinessLevel
  rationale: string
  ruleId: BlockerRuleId
  severity: BlockerSeverity
  verification: string
}

export interface BlockerResult extends BlockerDefinition {
  evidence: AnswerEvidence[]
  explanation: string
}

export interface DimensionScore {
  applicableWeight: number
  completeness: number
  earnedHalfPoints: number
  score: number | null
}

export interface UnknownResult {
  controlId: ControlId
  dimension: ReadinessDimension
  explanation: string
  label: string
  questionId: QuestionId
  verification: string
  weight: 1 | 2 | 3
}

export interface StrengthResult {
  answerLabel: string
  controlId: ControlId
  dimension: ReadinessDimension
  explanation: string
  label: string
  weight: 1 | 2 | 3
}

export interface ReadinessPolicyResult {
  baselineLevel: ReadinessLevel
  blockers: BlockerResult[]
  completeness: number
  dimensionScores: Record<ReadinessDimension, DimensionScore>
  evaluations: ControlEvaluation[]
  level: ReadinessLevel
  policyVersion: ReadinessPolicyVersion
  profile: ReadinessProfile
  score: number
  strengths: StrengthResult[]
  unknowns: UnknownResult[]
}

export interface ReadinessPlanActionDefinition {
  controlId: ControlId
  detail: string
  id: string
  label: string
  phase: PlanPhase
  priority: 1 | 2 | 3
}

export interface ReportPlanItem {
  actionId: string
  controlId: ControlId
  detail: string
  label: string
}

export interface DoNotOptimizeDefinition {
  detail: string
  id: string
  label: string
  priority: number
}

export interface ReportDoNotOptimizeItem {
  actionId: string
  detail: string
  label: string
}

export interface ReadinessNextStep {
  id: NextStepId
  label: string
  reason: string
}

export interface ReadinessReport {
  baselineLevel: ReadinessLevel
  blockers: BlockerResult[]
  completeness: number
  dimensionScores: Record<ReadinessDimension, DimensionScore>
  disclaimer: string
  doNotOptimizeYet: ReportDoNotOptimizeItem[]
  explanationSource: ExplanationSource
  level: ReadinessLevel
  nextStep: ReadinessNextStep
  plan48Hours: ReportPlanItem[]
  planTwoWeeks: ReportPlanItem[]
  policyVersion: ReadinessPolicyVersion
  profile: ReadinessProfile
  score: number
  strengths: StrengthResult[]
  summary: string
  unknowns: UnknownResult[]
}

export type ValidationIssueCode =
  | 'invalid_type'
  | 'missing_field'
  | 'unknown_field'
  | 'unsupported_policy'
  | 'invalid_answer'
  | 'contradictory_answers'
  | 'invalid_anonymous_token'
  | 'symptom_too_long'
  | 'symptom_control_character'
  | 'symptom_secret'
  | 'symptom_email'
  | 'symptom_phone'
  | 'symptom_payment_card'
  | 'symptom_url'
  | 'symptom_code'
  | 'symptom_log'

export interface ValidationIssue {
  code: ValidationIssueCode
  message: string
  path: string
}

export type ManifestValidationResult =
  { issues: []; ok: true; value: ReadinessManifest } | { issues: ValidationIssue[]; ok: false }

export type AssessmentRequestValidationResult =
  | { issues: []; ok: true; value: ReadinessAssessmentRequest }
  | { issues: ValidationIssue[]; ok: false }

export interface ModelBlockerExplanation {
  explanation: string
  ruleId: BlockerRuleId
}

export interface ModelControlExplanation {
  controlId: ControlId
  explanation: string
}

export interface ModelActionExplanation {
  actionId: string
  explanation: string
}

export interface ReadinessModelResponse {
  blockerExplanations: ModelBlockerExplanation[]
  doNotOptimizeYet: ModelActionExplanation[]
  nextStepReason: string
  plan48Hours: ModelActionExplanation[]
  planTwoWeeks: ModelActionExplanation[]
  strengths: ModelControlExplanation[]
  summary: string
  unknownExplanations: ModelControlExplanation[]
}

export interface ModelValidationIssue {
  message: string
  path: string
}

export type ModelResponseValidationResult =
  | { issues: []; ok: true; value: ReadinessModelResponse }
  | { issues: ModelValidationIssue[]; ok: false }

export type ModelMergeResult =
  | { issues: []; ok: true; report: ReadinessReport }
  | { issues: ModelValidationIssue[]; ok: false; report: ReadinessReport }

export interface JsonSchemaResponseFormat {
  json_schema: {
    name: string
    schema: Record<string, unknown>
    strict: true
  }
  type: 'json_schema'
}

export interface ReadinessModelMessage {
  content: string
  role: 'system' | 'user'
}

export type AssessmentResult =
  | { issues: []; ok: true; report: ReadinessReport; value: ReadinessManifest }
  | { issues: ValidationIssue[]; ok: false }
