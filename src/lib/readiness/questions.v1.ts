import type { QuestionId, ReadinessQuestion, ReadinessSection } from './types'

export const readinessSectionsV1: readonly ReadinessSection[] = [
  {
    description: 'Current reach, consequence, environment boundaries, and critical dependencies.',
    id: 'stage_architecture',
    label: 'Stage and architecture',
    questionIds: [
      'architecture.scope',
      'architecture.failure_impact',
      'architecture.environments',
      'architecture.dependencies',
    ],
  },
  {
    description: 'Trusted access decisions, data classification, isolation, and deletion.',
    id: 'identity_data',
    label: 'Identity and data',
    questionIds: [
      'identity.authorization',
      'identity.data_classification',
      'identity.tenancy',
      'identity.deletion',
    ],
  },
  {
    description: 'Review, tests, dependency hygiene, and release recovery.',
    id: 'delivery',
    label: 'Delivery',
    questionIds: [
      'delivery.review',
      'delivery.tests',
      'delivery.dependencies',
      'delivery.rollback',
    ],
  },
  {
    description: 'Monitoring and alert ownership, recoverable state, and incident runbooks.',
    id: 'operations',
    label: 'Operations',
    questionIds: ['operations.monitoring', 'operations.backups', 'operations.runbooks'],
  },
  {
    description: 'Secrets, public mutations, payments, material AI actions, traffic, and cost.',
    id: 'risk_boundaries',
    label: 'Risk boundaries',
    questionIds: [
      'risk.secrets',
      'risk.public_mutations',
      'risk.payments',
      'risk.ai_actions',
      'risk.traffic_cost',
    ],
  },
]

export const readinessQuestionsV1: readonly ReadinessQuestion[] = [
  {
    controlId: 'ARCH-SCOPE-001',
    description: 'Choose the boundary that is reachable now, not the audience planned later.',
    id: 'architecture.scope',
    label: 'Who can reach the system today?',
    options: [
      {
        description: 'Only a known internal group can reach it, and it has no user accounts.',
        label: 'Internal, without accounts',
        status: 'pass',
        value: 'internal_no_accounts',
      },
      {
        description: 'Only a known internal group can reach it, and users sign in.',
        label: 'Internal, with accounts',
        status: 'pass',
        value: 'internal_accounts',
      },
      {
        description: 'Anyone can reach it, but it does not expose user accounts.',
        label: 'Public, without accounts',
        status: 'pass',
        value: 'public_no_accounts',
      },
      {
        description: 'Anyone can reach it and it exposes user or operator accounts.',
        label: 'Public, with accounts',
        status: 'pass',
        value: 'public_accounts',
      },
      {
        description: 'The deployed reachability or account boundary has not been verified.',
        label: 'Unknown',
        status: 'unknown',
        value: 'unknown',
      },
    ],
    sectionId: 'stage_architecture',
  },
  {
    controlId: 'ARCH-IMPACT-001',
    description: 'Classify the highest credible consequence, even if it is unlikely.',
    id: 'architecture.failure_impact',
    label: 'What happens if the most important journey fails or returns a wrong result?',
    options: [
      {
        description:
          'The impact is limited to an easily repeated demo or informational experience.',
        label: 'Low and reversible',
        status: 'pass',
        value: 'low',
      },
      {
        description:
          'A bounded group is inconvenienced, with no material data or financial consequence.',
        label: 'Contained customer impact',
        status: 'pass',
        value: 'contained',
      },
      {
        description:
          'Customers, operations, revenue, or important data can be materially affected.',
        label: 'High business or data impact',
        status: 'pass',
        value: 'high',
      },
      {
        description:
          'A failure can create safety, legal, irreversible financial, or severe confidentiality harm.',
        label: 'Critical or irreversible impact',
        status: 'pass',
        value: 'critical',
      },
      {
        description: 'No one has classified the consequence of a wrong result or outage.',
        label: 'Unknown',
        status: 'unknown',
        value: 'unknown',
      },
    ],
    sectionId: 'stage_architecture',
  },
  {
    controlId: 'ARCH-ENV-001',
    description:
      'Consider credentials, data stores, deployment permissions, and configuration together.',
    id: 'architecture.environments',
    label: 'How is the current release separated from development and testing?',
    options: [
      {
        description: 'There is no production deployment yet.',
        label: 'Not deployed',
        status: 'partial',
        value: 'not_deployed',
      },
      {
        description:
          'Production has separate credentials, data, configuration, and deployment permissions.',
        label: 'Fully isolated production',
        status: 'pass',
        value: 'isolated',
      },
      {
        description:
          'Some production boundaries are separate, but at least one material resource is shared.',
        label: 'Partially separated',
        status: 'partial',
        value: 'partially_separated',
      },
      {
        description: 'Development or tests can touch live credentials, data, or deployment state.',
        label: 'Material production state is shared',
        status: 'fail',
        value: 'shared_production_state',
      },
      {
        description: 'The environment boundary has not been reviewed.',
        label: 'Unknown',
        status: 'unknown',
        value: 'unknown',
      },
    ],
    sectionId: 'stage_architecture',
  },
  {
    controlId: 'ARCH-DEPS-001',
    description:
      'Include databases, identity, payment, model, queue, storage, email, and external API providers.',
    id: 'architecture.dependencies',
    label: 'How are critical dependency failures bounded?',
    options: [
      {
        description:
          'Critical dependencies are inventoried with timeouts, bounded retries, and safe failure behavior.',
        label: 'Inventoried and bounded',
        status: 'pass',
        value: 'inventoried_bounded',
      },
      {
        description:
          'The dependencies are known, but some timeouts, retry limits, or degradation paths are missing.',
        label: 'Known but partly bounded',
        status: 'partial',
        value: 'known_partly_bounded',
      },
      {
        description:
          'Critical calls can wait, retry, cascade, or fail without an explicit boundary.',
        label: 'Unbounded or unmanaged',
        status: 'fail',
        value: 'unbounded',
      },
      {
        description: 'Critical dependencies or their failure behavior have not been identified.',
        label: 'Unknown',
        status: 'unknown',
        value: 'unknown',
      },
    ],
    sectionId: 'stage_architecture',
  },
  {
    controlId: 'IDENT-AUTHZ-001',
    description:
      'Interface visibility is not authorization; consider direct API and object access.',
    id: 'identity.authorization',
    label: 'Where are account and resource permissions enforced?',
    options: [
      {
        description:
          'The system exposes neither accounts nor protected user or operator resources.',
        label: 'No account authorization boundary',
        status: 'not_applicable',
        value: 'not_applicable',
      },
      {
        description:
          'Every protected read and mutation checks role and resource ownership at a trusted server boundary.',
        label: 'Server-enforced and tested',
        status: 'pass',
        value: 'server_enforced',
      },
      {
        description:
          'Server checks exist, but a role, ownership, or direct-object path is incomplete or untested.',
        label: 'Partial server enforcement',
        status: 'partial',
        value: 'partial_server_checks',
      },
      {
        description:
          'The interface, client state, or presence of a login is the primary permission boundary.',
        label: 'Client-only or absent',
        status: 'fail',
        value: 'client_only_or_none',
      },
      {
        description: 'Direct protected API behavior has not been verified.',
        label: 'Unknown',
        status: 'unknown',
        value: 'unknown',
      },
    ],
    sectionId: 'identity_data',
  },
  {
    controlId: 'DATA-CLASS-001',
    description:
      'Choose based on stored, logged, exported, analyzed, or provider-transmitted data.',
    id: 'identity.data_classification',
    label: 'What data does the deployed system handle, and is it classified?',
    options: [
      {
        description: 'It retains no user/customer data, or only deliberately public content.',
        label: 'No retained private data',
        status: 'pass',
        value: 'none_or_public',
      },
      {
        description:
          'Retained user data is classified as non-sensitive and its flows are documented.',
        label: 'Classified non-sensitive data',
        status: 'pass',
        value: 'classified_non_sensitive',
      },
      {
        description:
          'Customer, confidential, regulated, or otherwise sensitive data is explicitly classified.',
        label: 'Classified sensitive or customer data',
        status: 'pass',
        value: 'classified_sensitive',
      },
      {
        description:
          'Sensitive or customer data is present without an approved inventory and classification.',
        label: 'Sensitive data is not classified',
        status: 'fail',
        value: 'sensitive_unclassified',
      },
      {
        description: 'Data flows and sensitivity have not been reviewed.',
        label: 'Unknown',
        status: 'unknown',
        value: 'unknown',
      },
    ],
    sectionId: 'identity_data',
  },
  {
    controlId: 'IDENT-TENANCY-001',
    description: 'A tenant selector in the interface is not a trusted isolation control.',
    id: 'identity.tenancy',
    label: 'How is one customer or workspace isolated from another?',
    options: [
      {
        description: 'The system has no multi-tenant customer or workspace boundary.',
        label: 'Not multi-tenant',
        status: 'not_applicable',
        value: 'not_applicable',
      },
      {
        description:
          'Tenant scope is server-derived and cross-tenant negative tests cover data and jobs.',
        label: 'Server-enforced and tested',
        status: 'pass',
        value: 'server_enforced_tested',
      },
      {
        description:
          'Server-side scoping exists but cross-tenant paths are not comprehensively tested.',
        label: 'Server-scoped but unproven',
        status: 'partial',
        value: 'server_scoped_untested',
      },
      {
        description:
          'Tenant identifiers are trusted from the client or records share an unscoped access path.',
        label: 'Client-trusted or unscoped',
        status: 'fail',
        value: 'client_or_unscoped',
      },
      {
        description: 'Tenant isolation behavior has not been verified.',
        label: 'Unknown',
        status: 'unknown',
        value: 'unknown',
      },
    ],
    sectionId: 'identity_data',
  },
  {
    controlId: 'DATA-DELETE-001',
    description:
      'Consider primary records, indexes, caches, exports, provider copies, and documented backup expiry.',
    id: 'identity.deletion',
    label: 'Can retained personal or customer data be deleted as promised?',
    options: [
      {
        description:
          'The system does not retain personal or customer data that requires a deletion path.',
        label: 'No retained personal data',
        status: 'not_applicable',
        value: 'not_applicable',
      },
      {
        description:
          'Deletion has been exercised across all documented live copies and backup expiry is defined.',
        label: 'Tested deletion path',
        status: 'pass',
        value: 'tested',
      },
      {
        description: 'A deletion process is documented but has not been verified end to end.',
        label: 'Documented but untested',
        status: 'partial',
        value: 'documented_untested',
      },
      {
        description: 'No reliable deletion path exists for retained personal or customer data.',
        label: 'No deletion path',
        status: 'fail',
        value: 'none',
      },
      {
        description: 'Deletion behavior or retained copies are not known.',
        label: 'Unknown',
        status: 'unknown',
        value: 'unknown',
      },
    ],
    sectionId: 'identity_data',
  },
  {
    controlId: 'DELIVERY-REVIEW-001',
    description:
      'Include application code, infrastructure, migrations, prompts, and production configuration.',
    id: 'delivery.review',
    label: 'How are production-impacting changes reviewed?',
    options: [
      {
        description:
          'Changes use protected source control with independent review and traceable exceptions.',
        label: 'Protected and independently reviewed',
        status: 'pass',
        value: 'protected_reviewed',
      },
      {
        description: 'Source control is used, but review or branch protection is inconsistent.',
        label: 'Review is inconsistent',
        status: 'partial',
        value: 'inconsistent_review',
      },
      {
        description:
          'Material changes can reach production through direct edits or unreviewed pushes.',
        label: 'Direct or unreviewed changes',
        status: 'fail',
        value: 'direct_unreviewed',
      },
      {
        description: 'The release provenance and review path have not been checked.',
        label: 'Unknown',
        status: 'unknown',
        value: 'unknown',
      },
    ],
    sectionId: 'delivery',
  },
  {
    controlId: 'DELIVERY-TESTS-001',
    description: 'Prioritize access, money, data, migrations, and recovery over raw test count.',
    id: 'delivery.tests',
    label: 'Which critical journeys block a broken release?',
    options: [
      {
        description:
          'Repeatable tests cover the critical journeys and fail the release when broken.',
        label: 'Critical paths gate release',
        status: 'pass',
        value: 'critical_paths_gate',
      },
      {
        description: 'Some important paths are automated, with material manual or untested gaps.',
        label: 'Partial critical-path coverage',
        status: 'partial',
        value: 'partial_coverage',
      },
      {
        description:
          'Release depends on ad hoc manual checks or has no meaningful critical-path tests.',
        label: 'No repeatable critical-path gate',
        status: 'fail',
        value: 'no_repeatable_gate',
      },
      {
        description: 'Current test coverage and release behavior are not known.',
        label: 'Unknown',
        status: 'unknown',
        value: 'unknown',
      },
    ],
    sectionId: 'delivery',
  },
  {
    controlId: 'DELIVERY-DEPS-001',
    description:
      'Consider lockfiles, container images, runtime versions, transitive alerts, and update ownership.',
    id: 'delivery.dependencies',
    label: 'How are dependency and supply-chain changes controlled?',
    options: [
      {
        description:
          'Dependencies are pinned, scanned, reviewed, and updated through a tested recurring process.',
        label: 'Pinned, scanned, and maintained',
        status: 'pass',
        value: 'pinned_scanned_maintained',
      },
      {
        description:
          'A lockfile or scanner exists, but updates and findings are handled inconsistently.',
        label: 'Partially controlled',
        status: 'partial',
        value: 'partially_controlled',
      },
      {
        description:
          'Production versions float, alerts are absent, or unsupported packages have no response owner.',
        label: 'Unmanaged dependencies',
        status: 'fail',
        value: 'unmanaged',
      },
      {
        description: 'The resolved production dependency tree has not been reviewed.',
        label: 'Unknown',
        status: 'unknown',
        value: 'unknown',
      },
    ],
    sectionId: 'delivery',
  },
  {
    controlId: 'DELIVERY-ROLLBACK-001',
    description: 'Include migrations and forward recovery when a literal rollback is unsafe.',
    id: 'delivery.rollback',
    label: 'How does a failed production release recover?',
    options: [
      {
        description: 'There is no production deployment to recover yet.',
        label: 'Not deployed',
        status: 'not_applicable',
        value: 'not_deployed',
      },
      {
        description: 'Rollback or forward recovery has been exercised with production-like state.',
        label: 'Tested recovery path',
        status: 'pass',
        value: 'tested',
      },
      {
        description: 'A recovery procedure exists but has not been exercised.',
        label: 'Documented but untested',
        status: 'partial',
        value: 'documented_untested',
      },
      {
        description: 'Recovery means trying another deploy without a proven data or schema path.',
        label: 'Redeploy only',
        status: 'fail',
        value: 'redeploy_only',
      },
      {
        description: 'No rollback or forward-recovery path exists.',
        label: 'No recovery path',
        status: 'fail',
        value: 'none',
      },
      {
        description: 'Release recovery has not been reviewed.',
        label: 'Unknown',
        status: 'unknown',
        value: 'unknown',
      },
    ],
    sectionId: 'delivery',
  },
  {
    controlId: 'OPS-MONITOR-001',
    description:
      'A signal is useful only if it reaches someone who can act before prolonged customer harm.',
    id: 'operations.monitoring',
    label: 'How are critical customer journeys monitored and alerted?',
    options: [
      {
        description:
          'End-to-end signals have actionable thresholds, named owners, and a tested alert path.',
        label: 'End-to-end and owned',
        status: 'pass',
        value: 'end_to_end_owned',
      },
      {
        description:
          'Technical metrics exist, but customer-journey coverage or alert ownership is incomplete.',
        label: 'Technical signals only',
        status: 'partial',
        value: 'technical_only',
      },
      {
        description:
          'Logs can be inspected after a report, but no actionable critical-journey alert exists.',
        label: 'Logs without actionable alerts',
        status: 'partial',
        value: 'logs_only',
      },
      {
        description: 'Critical failures are normally discovered through users or manual checking.',
        label: 'No effective monitoring',
        status: 'fail',
        value: 'none',
      },
      {
        description: 'Current monitoring and ownership have not been verified.',
        label: 'Unknown',
        status: 'unknown',
        value: 'unknown',
      },
    ],
    sectionId: 'operations',
  },
  {
    controlId: 'OPS-BACKUP-001',
    description:
      'A configured backup is not recovery evidence until representative state has been restored.',
    id: 'operations.backups',
    label: 'How is irreplaceable state backed up and restored?',
    options: [
      {
        description: 'The application has no irreplaceable or retained state.',
        label: 'No irreplaceable state',
        status: 'not_applicable',
        value: 'not_applicable',
      },
      {
        description:
          'A recent isolated restore verified representative data and application behavior.',
        label: 'Restore tested',
        status: 'pass',
        value: 'restored_recently',
      },
      {
        description: 'Backups are configured, but no representative restore has been completed.',
        label: 'Backup never restored',
        status: 'partial',
        value: 'configured_never_restored',
      },
      {
        description: 'Irreplaceable or customer state has no usable backup and restore path.',
        label: 'No backup path',
        status: 'fail',
        value: 'no_backup',
      },
      {
        description: 'Backup scope, success, ownership, or restore behavior is not known.',
        label: 'Unknown',
        status: 'unknown',
        value: 'unknown',
      },
    ],
    sectionId: 'operations',
  },
  {
    controlId: 'OPS-RUNBOOK-001',
    description:
      'Cover detection, containment, escalation, communications, recovery, and backup ownership.',
    id: 'operations.runbooks',
    label: 'Can an operator respond to the highest-impact incident?',
    options: [
      {
        description:
          'A named primary and backup owner have exercised the current incident runbook.',
        label: 'Owned and exercised',
        status: 'pass',
        value: 'owned_exercised',
      },
      {
        description: 'A current runbook and owner exist, but the response has not been exercised.',
        label: 'Documented but untested',
        status: 'partial',
        value: 'documented_untested',
      },
      {
        description: 'Response depends on one person remembering undocumented steps.',
        label: 'Tribal knowledge',
        status: 'fail',
        value: 'tribal_knowledge',
      },
      {
        description: 'No incident or recovery runbook exists.',
        label: 'No runbook',
        status: 'fail',
        value: 'none',
      },
      {
        description: 'Incident ownership and procedure have not been reviewed.',
        label: 'Unknown',
        status: 'unknown',
        value: 'unknown',
      },
    ],
    sectionId: 'operations',
  },
  {
    controlId: 'RISK-SECRETS-001',
    description:
      'Include browser bundles, mobile clients, repository history, CI output, and deployment configuration.',
    id: 'risk.secrets',
    label: 'Where do production credentials live?',
    options: [
      {
        description: 'The deployed system requires no production credentials or privileged tokens.',
        label: 'No production secrets',
        status: 'not_applicable',
        value: 'not_applicable',
      },
      {
        description:
          'Secrets are server-injected, least-privilege, scanned, and have a tested rotation path.',
        label: 'Server-side and rotatable',
        status: 'pass',
        value: 'server_store_rotatable',
      },
      {
        description:
          'Secrets are server-side but scanning, least privilege, or rotation is incomplete.',
        label: 'Server-side but partly controlled',
        status: 'partial',
        value: 'server_store_partial',
      },
      {
        description:
          'A usable production credential exists in client code, a public bundle, or source control.',
        label: 'Client-side or committed',
        status: 'fail',
        value: 'source_or_client',
      },
      {
        description: 'Built assets, history, and deployment secret handling have not been checked.',
        label: 'Unknown',
        status: 'unknown',
        value: 'unknown',
      },
    ],
    sectionId: 'risk_boundaries',
  },
  {
    controlId: 'RISK-MUTATION-001',
    description:
      'A public mutation changes state, sends a message, spends money, or starts costly work.',
    id: 'risk.public_mutations',
    label: 'How are public mutation endpoints protected?',
    options: [
      {
        description: 'The public application exposes no mutation endpoint.',
        label: 'No public mutations',
        status: 'not_applicable',
        value: 'not_applicable',
      },
      {
        description:
          'Mutations have trusted access controls and distributed burst and rolling limits.',
        label: 'Authenticated and rate-limited',
        status: 'pass',
        value: 'authenticated_rate_limited',
      },
      {
        description:
          'Trusted authentication exists, but abuse or concurrency limits are incomplete.',
        label: 'Authenticated without complete limits',
        status: 'partial',
        value: 'authentication_only',
      },
      {
        description:
          'Limits exist, but callers can mutate material state without a trusted authorization boundary.',
        label: 'Rate-limited without trusted access',
        status: 'partial',
        value: 'rate_limit_only',
      },
      {
        description:
          'Public mutations have neither trusted access control nor effective rate limiting.',
        label: 'Neither authenticated nor rate-limited',
        status: 'fail',
        value: 'neither',
      },
      {
        description: 'Public mutations or their abuse controls have not been inventoried.',
        label: 'Unknown',
        status: 'unknown',
        value: 'unknown',
      },
    ],
    sectionId: 'risk_boundaries',
  },
  {
    controlId: 'RISK-PAYMENTS-001',
    description:
      'Consider webhook signatures, retries, duplicate delivery, ordering, and reconciliation.',
    id: 'risk.payments',
    label: 'How do payment events change authoritative state?',
    options: [
      {
        description: 'The deployed system does not accept or act on payment events.',
        label: 'No payment processing',
        status: 'not_applicable',
        value: 'not_applicable',
      },
      {
        description:
          'Events are signature-verified, idempotent, and reconcile to an authoritative provider record.',
        label: 'Verified and idempotent',
        status: 'pass',
        value: 'verified_idempotent',
      },
      {
        description: 'Signature verification or idempotency/reconciliation is incomplete.',
        label: 'One material control is missing',
        status: 'partial',
        value: 'one_control_missing',
      },
      {
        description:
          'Payment state changes lack both verified delivery and an idempotent processing boundary.',
        label: 'Unverified and non-idempotent',
        status: 'fail',
        value: 'neither',
      },
      {
        description: 'Payment event verification and replay behavior have not been tested.',
        label: 'Unknown',
        status: 'unknown',
        value: 'unknown',
      },
    ],
    sectionId: 'risk_boundaries',
  },
  {
    controlId: 'RISK-AI-001',
    description:
      'Material actions spend money, publish, delete, message, change permissions, or alter external state.',
    id: 'risk.ai_actions',
    label: 'What approval boundary controls model or tool actions?',
    options: [
      {
        description: 'Models produce suggestions only and cannot take a material external action.',
        label: 'No material model/tool actions',
        status: 'not_applicable',
        value: 'not_applicable',
      },
      {
        description:
          'Material actions require explicit approval and use narrow, audited permissions.',
        label: 'Human-approved and least-privilege',
        status: 'pass',
        value: 'approval_least_privilege',
      },
      {
        description:
          'Actions are narrow and reversible, but an explicit approval or audit boundary is incomplete.',
        label: 'Bounded but incompletely approved',
        status: 'partial',
        value: 'bounded_reversible',
      },
      {
        description: 'A model can autonomously take a material action without explicit approval.',
        label: 'Autonomous material action',
        status: 'fail',
        value: 'autonomous_material_no_approval',
      },
      {
        description: 'Tool permissions and approval behavior have not been inventoried.',
        label: 'Unknown',
        status: 'unknown',
        value: 'unknown',
      },
    ],
    sectionId: 'risk_boundaries',
  },
  {
    controlId: 'RISK-TRAFFIC-001',
    description:
      'Include request size, burst, concurrency, retries, timeouts, provider quotas, and spend.',
    id: 'risk.traffic_cost',
    label: 'How are near-term traffic and provider cost bounded?',
    options: [
      {
        description:
          'Hard limits exist and a production-like load test stayed inside capacity and budget thresholds.',
        label: 'Enforced and load-tested',
        status: 'pass',
        value: 'limits_load_tested',
      },
      {
        description:
          'Hard limits and budgets exist but have not been exercised under expected load.',
        label: 'Enforced but untested',
        status: 'partial',
        value: 'limits_untested',
      },
      {
        description:
          'Some request or provider limits exist, with material concurrency, retry, or spend gaps.',
        label: 'Partially bounded',
        status: 'partial',
        value: 'partially_bounded',
      },
      {
        description:
          'Traffic, retries, concurrency, or provider spend can grow without an enforced ceiling.',
        label: 'Unbounded',
        status: 'fail',
        value: 'unbounded',
      },
      {
        description: 'Expected load, provider cost, or effective limits have not been reviewed.',
        label: 'Unknown',
        status: 'unknown',
        value: 'unknown',
      },
    ],
    sectionId: 'risk_boundaries',
  },
]

export const readinessQuestionById = Object.fromEntries(
  readinessQuestionsV1.map((question) => [question.id, question]),
) as Record<QuestionId, (typeof readinessQuestionsV1)[number]>
