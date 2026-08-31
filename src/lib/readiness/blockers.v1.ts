import type { BlockerDefinition, QuestionId, ReadinessAnswers } from './types'

export interface ReadinessBlockerRule extends BlockerDefinition {
  matches: (answers: ReadinessAnswers) => boolean
}

const productionEnvironmentAnswers = new Set([
  'isolated',
  'partially_separated',
  'shared_production_state',
])
const highImpactAnswers = new Set(['high', 'critical'])
const missingReleaseRecoveryAnswers = new Set(['redeploy_only', 'none'])
const recoverableCustomerDataAnswers = new Set([
  'classified_non_sensitive',
  'classified_sensitive',
  'sensitive_unclassified',
])
const incompletePaymentAnswers = new Set(['one_control_missing', 'neither'])

export const readinessBlockersV1 = [
  {
    dependencyOrder: 10,
    evidenceQuestionIds: ['architecture.scope', 'identity.authorization'],
    label: 'Public accounts lack server-side authorization',
    matches: (answers) =>
      answers['architecture.scope'] === 'public_accounts' &&
      ['client_only_or_none', 'not_applicable'].includes(answers['identity.authorization']),
    maxLevel: 'demo_only',
    rationale:
      'A public interface or login screen cannot protect account or resource access when direct requests are not authorized at a trusted server boundary.',
    ruleId: 'SEC-AUTHZ-001',
    severity: 'critical',
    verification:
      'Call protected reads and mutations directly with missing, lower-privilege, and wrong-owner credentials and confirm they are denied.',
  },
  {
    dependencyOrder: 20,
    evidenceQuestionIds: ['risk.secrets'],
    label: 'Production secrets are exposed to clients or source control',
    matches: (answers) => answers['risk.secrets'] === 'source_or_client',
    maxLevel: 'demo_only',
    rationale:
      'A usable production credential in a public bundle or repository should be treated as exposed and can bypass otherwise sound application controls.',
    ruleId: 'SEC-SECRETS-001',
    severity: 'critical',
    verification:
      'Remove and rotate exposed values, then inspect built browser assets, repository history, CI output, and deployment configuration.',
  },
  {
    dependencyOrder: 30,
    evidenceQuestionIds: ['identity.data_classification', 'operations.backups'],
    label: 'Sensitive or customer data has no backup and restore path',
    matches: (answers) =>
      recoverableCustomerDataAnswers.has(answers['identity.data_classification']) &&
      answers['operations.backups'] === 'no_backup',
    maxLevel: 'demo_only',
    rationale:
      'Irreplaceable sensitive or customer data can be permanently lost when no usable recovery copy and restore procedure exist.',
    ruleId: 'OPS-BACKUP-001',
    severity: 'critical',
    verification:
      'Create a recoverable copy, restore it into an isolated environment, and verify representative records and application behavior.',
  },
  {
    dependencyOrder: 40,
    evidenceQuestionIds: ['risk.ai_actions'],
    label: 'Material AI or tool actions have no approval boundary',
    matches: (answers) => answers['risk.ai_actions'] === 'autonomous_material_no_approval',
    maxLevel: 'demo_only',
    rationale:
      'Untrusted input or model error can directly create consequential external state when material actions have no explicit approval or narrow permission boundary.',
    ruleId: 'AI-APPROVAL-001',
    severity: 'critical',
    verification:
      'Attempt a material action from untrusted user or retrieved content without approval and confirm it cannot execute.',
  },
  {
    dependencyOrder: 50,
    evidenceQuestionIds: ['risk.public_mutations'],
    label: 'Public mutations have neither trusted access nor rate limits',
    matches: (answers) => answers['risk.public_mutations'] === 'neither',
    maxLevel: 'demo_only',
    rationale:
      'An anonymous caller can repeatedly change state, trigger side effects, or consume resources without an identity or abuse-control boundary.',
    ruleId: 'SEC-MUTATION-001',
    severity: 'critical',
    verification:
      'Call each public mutation without credentials and above an approved burst and rolling limit and confirm both paths fail safely.',
  },
  {
    dependencyOrder: 60,
    evidenceQuestionIds: ['risk.payments'],
    label: 'Payment events are not fully verified and idempotent',
    matches: (answers) => incompletePaymentAnswers.has(answers['risk.payments']),
    maxLevel: 'internal_beta',
    rationale:
      'Missing signature verification, idempotency, or reconciliation permits forged, duplicate, delayed, or reordered events to corrupt payment state.',
    ruleId: 'PAY-WEBHOOK-001',
    severity: 'major',
    verification:
      'Replay a signed event, send an invalid signature, reorder related events, and reconcile the result against the authoritative provider.',
  },
  {
    dependencyOrder: 70,
    evidenceQuestionIds: [
      'architecture.failure_impact',
      'architecture.environments',
      'delivery.rollback',
    ],
    label: 'A high-impact production release has no recovery path',
    matches: (answers) =>
      productionEnvironmentAnswers.has(answers['architecture.environments']) &&
      highImpactAnswers.has(answers['architecture.failure_impact']) &&
      (missingReleaseRecoveryAnswers.has(answers['delivery.rollback']) ||
        answers['delivery.rollback'] === 'not_deployed'),
    maxLevel: 'limited_production',
    rationale:
      'A failed high-impact release can remain customer-affecting or data-incompatible when neither rollback nor forward recovery is proven.',
    ruleId: 'REL-ROLLBACK-001',
    severity: 'major',
    verification:
      'Exercise rollback or forward recovery from a production-like release, including schema and data compatibility checks.',
  },
  {
    dependencyOrder: 80,
    evidenceQuestionIds: ['operations.backups'],
    label: 'Backups have never been restored',
    matches: (answers) => answers['operations.backups'] === 'configured_never_restored',
    maxLevel: 'limited_production',
    rationale:
      'A configured backup proves that a job ran, not that the retained state is complete, readable, compatible, or recoverable in time.',
    ruleId: 'OPS-RESTORE-001',
    severity: 'major',
    verification:
      'Restore a current backup into an isolated environment and record representative integrity, recovery point, and recovery time.',
  },
] as const satisfies readonly ReadinessBlockerRule[]

export const blockerEvidenceQuestionIds = new Set<QuestionId>(
  readinessBlockersV1.flatMap((blocker) => blocker.evidenceQuestionIds),
)
