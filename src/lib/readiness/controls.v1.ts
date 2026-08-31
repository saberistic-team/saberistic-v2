import type {
  ControlId,
  QuestionId,
  ReadinessControl,
  ReadinessPlanActionDefinition,
} from './types'

export const readinessControlsV1 = [
  {
    actions: {
      action48Hours:
        'Write down who can reach the system, whether accounts exist, and which boundary is intentionally public.',
      actionTwoWeeks:
        'Enforce and test the declared audience boundary so deployment configuration cannot silently widen access.',
    },
    allowNotApplicable: false,
    dimension: 'operability',
    id: 'ARCH-SCOPE-001',
    label: 'Reachability and audience are explicit',
    questionId: 'architecture.scope',
    strength: 'The current audience and reachability boundary are explicitly known.',
    verification:
      'Confirm the deployed route, account requirement, and intended audience from configuration rather than interface copy.',
    weight: 1,
  },
  {
    actions: {
      action48Hours:
        'Name the most consequential credible failure and record who or what would be affected.',
      actionTwoWeeks:
        'Turn the failure-impact classification into recovery targets, ownership, and an exercised response scenario.',
    },
    allowNotApplicable: false,
    dimension: 'reliability',
    id: 'ARCH-IMPACT-001',
    label: 'Failure impact is classified',
    questionId: 'architecture.failure_impact',
    strength: 'The consequence of a material failure is explicitly classified.',
    verification:
      'Review one realistic outage or incorrect-result scenario and confirm its customer, financial, safety, and data impact.',
    weight: 2,
  },
  {
    actions: {
      action48Hours:
        'Separate production configuration, data, and credentials from development wherever a shared boundary can change live state.',
      actionTwoWeeks:
        'Exercise a repeatable promotion path through an isolated non-production environment before the next production change.',
    },
    allowNotApplicable: false,
    dimension: 'maintainability',
    id: 'ARCH-ENV-001',
    label: 'Environment boundaries are controlled',
    questionId: 'architecture.environments',
    strength: 'Production and non-production boundaries are deliberately separated.',
    verification:
      'Compare environment configuration, credentials, data stores, and deployment permissions for accidental sharing.',
    weight: 2,
  },
  {
    actions: {
      action48Hours:
        'List the dependencies that can stop a critical journey and record their owners, timeouts, and failure behavior.',
      actionTwoWeeks:
        'Add bounded retries, timeouts, degradation behavior, and one dependency-failure exercise for the critical path.',
    },
    allowNotApplicable: false,
    dimension: 'reliability',
    id: 'ARCH-DEPS-001',
    label: 'Critical dependencies are bounded',
    questionId: 'architecture.dependencies',
    strength: 'Critical dependencies and their failure behavior are known and bounded.',
    verification:
      'Disable or fault one critical dependency and confirm the application fails within the documented boundary.',
    weight: 2,
  },
  {
    actions: {
      action48Hours:
        'Move every material authorization decision to a trusted server boundary and deny access by default.',
      actionTwoWeeks:
        'Add negative authorization tests for role, ownership, and direct-object access across every protected mutation and read.',
    },
    allowNotApplicable: true,
    dimension: 'security',
    id: 'IDENT-AUTHZ-001',
    label: 'Authorization is enforced server-side',
    questionId: 'identity.authorization',
    strength: 'Material access decisions are enforced at a trusted server boundary.',
    verification:
      'Call protected reads and mutations directly with missing, lower-privilege, and wrong-owner credentials.',
    weight: 3,
  },
  {
    actions: {
      action48Hours:
        'Inventory stored and transmitted user data, assign a classification, and stop unnecessary collection or model sharing.',
      actionTwoWeeks:
        'Verify retention, encryption, access, deletion, and provider handling against the documented data classification.',
    },
    allowNotApplicable: false,
    dimension: 'data_privacy',
    id: 'DATA-CLASS-001',
    label: 'Data is classified and minimized',
    questionId: 'identity.data_classification',
    strength: 'The application has an explicit classification for the data it handles.',
    verification:
      'Trace representative data from collection through storage, logs, analytics, model providers, exports, and deletion.',
    weight: 2,
  },
  {
    actions: {
      action48Hours:
        'Centralize tenant scope at the data-access boundary and remove client-supplied tenant trust.',
      actionTwoWeeks:
        'Add cross-tenant negative tests for reads, writes, exports, background jobs, caches, and administrator paths.',
    },
    allowNotApplicable: true,
    dimension: 'security',
    id: 'IDENT-TENANCY-001',
    label: 'Tenant isolation is enforced',
    questionId: 'identity.tenancy',
    strength: 'Tenant scope is enforced and tested at the trusted data-access boundary.',
    verification:
      'Attempt cross-tenant access using valid credentials and identifiers belonging to a different tenant.',
    weight: 3,
  },
  {
    actions: {
      action48Hours:
        'Document how a user or operator requests deletion and enumerate every live copy that the process must remove.',
      actionTwoWeeks:
        'Run and record a deletion exercise covering primary storage, indexes, caches, exports, and documented backup expiry.',
    },
    allowNotApplicable: true,
    dimension: 'data_privacy',
    id: 'DATA-DELETE-001',
    label: 'Deletion is defined and testable',
    questionId: 'identity.deletion',
    strength: 'A tested deletion path exists for retained personal or customer data.',
    verification:
      'Create a representative record, delete it through the approved process, and verify all in-scope live copies are gone.',
    weight: 2,
  },
  {
    actions: {
      action48Hours:
        'Require reviewed changes through source control for production-impacting code and configuration.',
      actionTwoWeeks:
        'Protect the release branch, record emergency exceptions, and sample recent changes for independent review evidence.',
    },
    allowNotApplicable: false,
    dimension: 'maintainability',
    id: 'DELIVERY-REVIEW-001',
    label: 'Production changes are reviewed',
    questionId: 'delivery.review',
    strength: 'Production-impacting changes have a reviewable source-control path.',
    verification:
      'Sample recent production changes and confirm commit provenance, review evidence, and protected release permissions.',
    weight: 2,
  },
  {
    actions: {
      action48Hours:
        'Automate one smoke test for each revenue-, access-, or data-critical journey and run it before release.',
      actionTwoWeeks:
        'Build a focused regression suite around authorization, migrations, recovery, and the highest-consequence failure modes.',
    },
    allowNotApplicable: false,
    dimension: 'maintainability',
    id: 'DELIVERY-TESTS-001',
    label: 'Critical paths are tested',
    questionId: 'delivery.tests',
    strength: 'Critical product and safety paths are covered by repeatable tests.',
    verification:
      'Run the critical-path suite from a clean checkout and confirm a deliberate regression blocks release.',
    weight: 3,
  },
  {
    actions: {
      action48Hours:
        'Pin direct dependencies, enable vulnerability reporting, and identify unsupported or abandoned production packages.',
      actionTwoWeeks:
        'Establish a small recurring upgrade path that tests lockfile changes, images, and transitive security fixes.',
    },
    allowNotApplicable: false,
    dimension: 'maintainability',
    id: 'DELIVERY-DEPS-001',
    label: 'Dependency changes are controlled',
    questionId: 'delivery.dependencies',
    strength: 'Dependencies are pinned, reviewed, and updated through a repeatable process.',
    verification:
      'Recreate the dependency tree from the lockfile and review current security and end-of-support findings.',
    weight: 2,
  },
  {
    actions: {
      action48Hours:
        'Write a reversible release procedure, including the safe response when a schema or data change cannot be rolled back.',
      actionTwoWeeks:
        'Exercise rollback or forward recovery from a production-like release and record the actual recovery time.',
    },
    allowNotApplicable: true,
    dimension: 'reliability',
    id: 'DELIVERY-ROLLBACK-001',
    label: 'Release recovery is proven',
    questionId: 'delivery.rollback',
    strength: 'The release process has an exercised rollback or forward-recovery path.',
    verification:
      'Deploy a reversible production-like change, invoke the documented recovery path, and confirm data compatibility.',
    weight: 3,
  },
  {
    actions: {
      action48Hours:
        'Add one end-to-end signal and an owned alert for each critical customer journey.',
      actionTwoWeeks:
        'Tune actionable alerts against a failure exercise and connect them to a named response owner and dashboard.',
    },
    allowNotApplicable: false,
    dimension: 'operability',
    id: 'OPS-MONITOR-001',
    label: 'Critical journeys are monitored and owned',
    questionId: 'operations.monitoring',
    strength: 'Critical journeys have actionable signals and named alert ownership.',
    verification:
      'Cause a safe test failure and verify the right owner receives a useful alert before a user report is required.',
    weight: 3,
  },
  {
    actions: {
      action48Hours:
        'Create a recoverable copy of irreplaceable state and record its owner, scope, encryption, and expiry.',
      actionTwoWeeks:
        'Restore into an isolated environment, verify representative records, and record achieved recovery-point and recovery-time results.',
    },
    allowNotApplicable: true,
    dimension: 'reliability',
    id: 'OPS-BACKUP-001',
    label: 'State can be restored',
    questionId: 'operations.backups',
    strength: 'Irreplaceable state has a recently exercised restore path.',
    verification:
      'Restore a current backup into an isolated environment and verify representative data and application behavior.',
    weight: 3,
  },
  {
    actions: {
      action48Hours:
        'Write a one-page incident runbook with detection, containment, escalation, communications, and recovery owners.',
      actionTwoWeeks:
        'Walk through the highest-impact incident, update the runbook from observed gaps, and assign a backup owner.',
    },
    allowNotApplicable: false,
    dimension: 'operability',
    id: 'OPS-RUNBOOK-001',
    label: 'Incidents have an owned runbook',
    questionId: 'operations.runbooks',
    strength: 'Operators have an exercised incident and recovery runbook.',
    verification:
      'Ask an operator who did not write the runbook to walk through containment and recovery using only the documented path.',
    weight: 2,
  },
  {
    actions: {
      action48Hours:
        'Remove production credentials from client bundles and source history, rotate exposed values, and disable old credentials.',
      actionTwoWeeks:
        'Enforce server-side secret injection, least privilege, secret scanning, ownership, and a tested rotation procedure.',
    },
    allowNotApplicable: true,
    dimension: 'security',
    id: 'RISK-SECRETS-001',
    label: 'Production secrets stay server-side',
    questionId: 'risk.secrets',
    strength: 'Production secrets use a server-side store with controlled access and rotation.',
    verification:
      'Inspect built browser assets, repository history, CI output, and deployment configuration for usable credentials.',
    weight: 3,
  },
  {
    actions: {
      action48Hours:
        'Require trusted authentication or an explicit public capability and add bounded rate limits to every public mutation.',
      actionTwoWeeks:
        'Exercise unauthenticated, replayed, concurrent, and oversized mutation requests and verify limits fail safely.',
    },
    allowNotApplicable: true,
    dimension: 'security',
    id: 'RISK-MUTATION-001',
    label: 'Public mutations are authenticated and bounded',
    questionId: 'risk.public_mutations',
    strength:
      'Public mutation endpoints have trusted access controls and distributed abuse limits.',
    verification:
      'Call each public mutation without credentials and above its allowed burst and rolling limits.',
    weight: 3,
  },
  {
    actions: {
      action48Hours:
        'Verify payment-provider signatures before state changes and make every retryable payment event idempotent.',
      actionTwoWeeks:
        'Test duplicate, delayed, reordered, invalid, and partially failed payment events against reconciliation records.',
    },
    allowNotApplicable: true,
    dimension: 'reliability',
    id: 'RISK-PAYMENTS-001',
    label: 'Payment events are verified and idempotent',
    questionId: 'risk.payments',
    strength: 'Payment state changes are signature-verified, idempotent, and reconcilable.',
    verification:
      'Replay a signed event, send an invalid signature, reorder related events, and confirm the authoritative state remains correct.',
    weight: 3,
  },
  {
    actions: {
      action48Hours:
        'Disable unapproved material model/tool actions or place them behind explicit human confirmation and narrow permissions.',
      actionTwoWeeks:
        'Test prompt injection, tool failure, loops, replay, cancellation, and audit evidence for each material action boundary.',
    },
    allowNotApplicable: true,
    dimension: 'security',
    id: 'RISK-AI-001',
    label: 'Material AI actions have an approval boundary',
    questionId: 'risk.ai_actions',
    strength:
      'Material model or tool actions are constrained by explicit approval and least privilege.',
    verification:
      'Attempt a material action from untrusted retrieved or user content without approval and confirm it cannot execute.',
    weight: 3,
  },
  {
    actions: {
      action48Hours:
        'Set hard request, concurrency, retry, timeout, and spend limits for the most expensive public path.',
      actionTwoWeeks:
        'Load-test the declared near-term traffic envelope and alert before capacity or provider budget is exhausted.',
    },
    allowNotApplicable: false,
    dimension: 'operability',
    id: 'RISK-TRAFFIC-001',
    label: 'Traffic and provider cost are bounded',
    questionId: 'risk.traffic_cost',
    strength: 'Traffic, retries, concurrency, and provider spend have explicit enforceable bounds.',
    verification:
      'Exceed the declared burst, concurrency, retry, and spend thresholds and confirm requests fail predictably.',
    weight: 2,
  },
] as const satisfies readonly ReadinessControl[]

function actionPriority(weight: 1 | 2 | 3): 1 | 2 | 3 {
  return weight === 3 ? 1 : weight === 2 ? 2 : 3
}

export const readinessActionCatalogV1: readonly ReadinessPlanActionDefinition[] =
  readinessControlsV1.flatMap((control) => [
    {
      controlId: control.id,
      detail: control.actions.action48Hours,
      id: `ACT-${control.id}-48H`,
      label: `${control.label}: establish the immediate boundary`,
      phase: '48_hours',
      priority: actionPriority(control.weight),
    },
    {
      controlId: control.id,
      detail: control.actions.actionTwoWeeks,
      id: `ACT-${control.id}-2W`,
      label: `${control.label}: prove the control`,
      phase: 'two_weeks',
      priority: actionPriority(control.weight),
    },
  ])

export const readinessMaintenanceActionCatalogV1 = [
  {
    controlId: 'ARCH-SCOPE-001',
    detail:
      'Recheck the declared audience, critical failure, and highest-weight evidence before treating the result as current.',
    id: 'ACT-MAINTAIN-VERIFY-48H',
    label: 'Reconfirm the assessment boundary',
    phase: '48_hours',
    priority: 3,
  },
  {
    controlId: 'OPS-MONITOR-001',
    detail:
      'Exercise one high-impact failure and use the result to refresh monitoring, recovery evidence, ownership, and the policy manifest.',
    id: 'ACT-MAINTAIN-DRILL-2W',
    label: 'Keep the strongest controls proven',
    phase: 'two_weeks',
    priority: 3,
  },
] as const satisfies readonly ReadinessPlanActionDefinition[]

export const readinessAllowedActionCatalogV1 = [
  ...readinessActionCatalogV1,
  ...readinessMaintenanceActionCatalogV1,
] as const

export const readinessControlById = Object.fromEntries(
  readinessControlsV1.map((control) => [control.id, control]),
) as Record<ControlId, (typeof readinessControlsV1)[number]>

export const readinessControlByQuestionId = Object.fromEntries(
  readinessControlsV1.map((control) => [control.questionId, control]),
) as Record<QuestionId, (typeof readinessControlsV1)[number]>
