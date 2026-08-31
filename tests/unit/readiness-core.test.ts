import { describe, expect, it } from 'vitest'

import {
  buildReadinessModelMessages,
  buildReadinessModelResponseFormat,
  createDeterministicReadinessReport,
  getReadinessModelContract,
  manifestFromAssessmentRequest,
  mergeReadinessModelResponse,
  readinessLevelForScore,
  readinessPolicyVersion,
  readinessQuestionsV1,
  roundReadinessScoreHalfUp,
  scoreReadiness,
  validateReadinessAssessmentRequest,
  validateReadinessManifest,
  validateReadinessModelResponse,
  type QuestionId,
  type ReadinessAnswers,
  type ReadinessManifest,
  type ReadinessReport,
} from '@/lib/readiness'

function answersWithStatus(status: 'pass' | 'unknown'): ReadinessAnswers {
  return Object.fromEntries(
    readinessQuestionsV1.map((question) => {
      const option = question.options.find((candidate) => candidate.status === status)
      if (!option) throw new Error(`No ${status} option for ${question.id}`)
      return [question.id, option.value]
    }),
  ) as ReadinessAnswers
}

const strongAnswers = answersWithStatus('pass')

function manifest(
  answers: Partial<Record<QuestionId, string>> = {},
  other: Partial<Omit<ReadinessManifest, 'answers' | 'policyVersion'>> = {},
): ReadinessManifest {
  return {
    answers: { ...strongAnswers, ...answers },
    policyVersion: readinessPolicyVersion,
    profile: 'custom',
    ...other,
  }
}

function issueCodes(value: ReturnType<typeof validateReadinessManifest>): string[] {
  return value.ok ? [] : value.issues.map((issue) => issue.code)
}

describe('readiness manifest validation', () => {
  it('accepts exactly the versioned answers and normalizes the optional symptom', () => {
    const result = validateReadinessManifest(
      manifest({}, { symptom: '  Checkout sometimes stalls\r\n after a release.  ' }),
    )

    expect(result).toMatchObject({ ok: true })
    if (result.ok) {
      expect(Object.keys(result.value.answers)).toHaveLength(20)
      expect(result.value.symptom).toBe('Checkout sometimes stalls\nafter a release.')
    }
  })

  it('does not mistake common runtime names for bare domains', () => {
    expect(
      validateReadinessManifest(manifest({}, { symptom: 'The Node.js process stalls.' })),
    ).toMatchObject({ ok: true })
  })

  it('rejects missing, extra, and uncontrolled fields', () => {
    const missing = manifest()
    const { ['delivery.tests']: _removed, ...incompleteAnswers } = missing.answers

    expect(
      issueCodes(
        validateReadinessManifest({
          ...missing,
          answers: { ...incompleteAnswers, 'invented.answer': 'pass' },
          invented: true,
        }),
      ),
    ).toEqual(expect.arrayContaining(['missing_field', 'unknown_field']))

    expect(
      issueCodes(
        validateReadinessManifest(manifest({ 'delivery.tests': 'not-a-controlled-answer' })),
      ),
    ).toContain('invalid_answer')
  })

  it.each([
    ['symptom_secret', 'The failing credential is sk-abcdefghijklmnop.'],
    ['symptom_email', 'The affected person is visitor@example.com.'],
    ['symptom_phone', 'Call the operator at 212-555-1212.'],
    ['symptom_payment_card', 'The failing test card is 4111 1111 1111 1111.'],
    ['symptom_url', 'It fails at https://private.example.com/account.'],
    ['symptom_url', 'It fails at internal.service.xyz/check.'],
    ['symptom_url', 'The affected node is 10.1.2.3:8080/worker.'],
    ['symptom_code', 'The path fails after const result = runTask();'],
    ['symptom_log', 'ERROR request failed\n at handler (/app/index.ts:1:2)'],
    ['symptom_too_long', 'a'.repeat(501)],
    ['symptom_control_character', 'The service fails.\u0000'],
  ])('rejects bounded-freeform violations: %s', (expectedCode, symptom) => {
    expect(issueCodes(validateReadinessManifest(manifest({}, { symptom })))).toContain(expectedCode)
  })

  it('rejects contradictory account and deployment declarations', () => {
    expect(
      issueCodes(
        validateReadinessManifest(
          manifest({
            'architecture.scope': 'public_accounts',
            'identity.authorization': 'not_applicable',
          }),
        ),
      ),
    ).toContain('contradictory_answers')

    expect(
      issueCodes(
        validateReadinessManifest(
          manifest({
            'architecture.environments': 'not_deployed',
            'delivery.rollback': 'tested',
          }),
        ),
      ),
    ).toContain('contradictory_answers')
  })

  it('keeps the anonymous abuse token outside the policy manifest', () => {
    const result = validateReadinessAssessmentRequest({
      ...manifest(),
      anonymousToken: 'anonymous-token_1234',
    })

    expect(result).toMatchObject({ ok: true })
    if (result.ok) {
      const normalizedManifest = manifestFromAssessmentRequest(result.value)
      expect(normalizedManifest).toEqual(manifest())
      const messages = buildReadinessModelMessages(
        normalizedManifest,
        createDeterministicReadinessReport(normalizedManifest),
      )
      expect(JSON.stringify(messages)).not.toContain('anonymous-token_1234')
    }

    expect(
      validateReadinessAssessmentRequest({ ...manifest(), anonymousToken: 'short' }),
    ).toMatchObject({ ok: false })
  })
})

describe('readiness scoring policy', () => {
  it.each([
    [889, 2_000, 44, 'demo_only'],
    [890, 2_000, 45, 'internal_beta'],
    [891, 2_000, 45, 'internal_beta'],
    [1_289, 2_000, 64, 'internal_beta'],
    [1_290, 2_000, 65, 'limited_production'],
    [1_291, 2_000, 65, 'limited_production'],
    [1_689, 2_000, 84, 'limited_production'],
    [1_690, 2_000, 85, 'production_candidate'],
    [1_691, 2_000, 85, 'production_candidate'],
  ] as const)(
    'rounds %i/%i half-points to %i and maps it to %s',
    (earned, maximum, rounded, level) => {
      expect(roundReadinessScoreHalfUp(earned, maximum)).toBe(rounded)
      expect(readinessLevelForScore(rounded)).toBe(level)
    },
  )

  it('removes explicitly allowed controls from a dimension denominator', () => {
    const result = scoreReadiness(
      manifest({
        'identity.authorization': 'not_applicable',
        'identity.tenancy': 'not_applicable',
        'risk.ai_actions': 'not_applicable',
        'risk.public_mutations': 'not_applicable',
        'risk.secrets': 'not_applicable',
      }),
    )

    expect(result.dimensionScores.security).toEqual({
      applicableWeight: 0,
      completeness: 100,
      earnedHalfPoints: 0,
      score: null,
    })
    expect(result.score).toBe(100)
  })

  it('distinguishes confirmed failure from unknown evidence in completeness', () => {
    const failed = scoreReadiness(manifest({ 'delivery.tests': 'no_repeatable_gate' }))
    const unknown = scoreReadiness(manifest({ 'delivery.tests': 'unknown' }))

    expect(failed.score).toBe(94)
    expect(unknown.score).toBe(94)
    expect(failed.completeness).toBe(100)
    expect(unknown.completeness).toBe(94)
    expect(unknown.level).toBe('limited_production')
  })

  it('enforces the production completeness gate independently of the score band', () => {
    const result = scoreReadiness(
      manifest({
        'architecture.dependencies': 'unknown',
        'architecture.environments': 'unknown',
        'architecture.failure_impact': 'unknown',
      }),
    )

    expect(result.baselineLevel).toBe('production_candidate')
    expect(result.completeness).toBeLessThan(90)
    expect(result.level).toBe('limited_production')
  })

  it.each([
    [
      'SEC-AUTHZ-001',
      'critical',
      'demo_only',
      { 'architecture.scope': 'public_accounts', 'identity.authorization': 'client_only_or_none' },
    ],
    ['SEC-SECRETS-001', 'critical', 'demo_only', { 'risk.secrets': 'source_or_client' }],
    [
      'OPS-BACKUP-001',
      'critical',
      'demo_only',
      {
        'identity.data_classification': 'classified_non_sensitive',
        'operations.backups': 'no_backup',
      },
    ],
    [
      'AI-APPROVAL-001',
      'critical',
      'demo_only',
      { 'risk.ai_actions': 'autonomous_material_no_approval' },
    ],
    ['SEC-MUTATION-001', 'critical', 'demo_only', { 'risk.public_mutations': 'neither' }],
    ['PAY-WEBHOOK-001', 'major', 'internal_beta', { 'risk.payments': 'one_control_missing' }],
    [
      'REL-ROLLBACK-001',
      'major',
      'limited_production',
      {
        'architecture.environments': 'isolated',
        'architecture.failure_impact': 'high',
        'delivery.rollback': 'none',
      },
    ],
    [
      'OPS-RESTORE-001',
      'major',
      'limited_production',
      { 'operations.backups': 'configured_never_restored' },
    ],
  ] as const)(
    'applies blocker %s as a %s cap at %s',
    (ruleId, severity, expectedLevel, overrides) => {
      const result = scoreReadiness(manifest(overrides))

      expect(result.blockers.map((blocker) => blocker.ruleId)).toEqual([ruleId])
      expect(result.blockers[0]).toMatchObject({ maxLevel: expectedLevel, severity })
      expect(result.level).toBe(expectedLevel)
    },
  )
})

describe('deterministic readiness reports', () => {
  it('produces a complete production-candidate fallback for a mature declaration', () => {
    const input = manifest()
    const report = createDeterministicReadinessReport(input)

    expect(report).toMatchObject({
      baselineLevel: 'production_candidate',
      completeness: 100,
      explanationSource: 'deterministic',
      level: 'production_candidate',
      nextStep: { id: 'self_serve' },
      policyVersion: readinessPolicyVersion,
      score: 100,
    })
    expect(report.blockers).toEqual([])
    expect(report.summary.length).toBeGreaterThan(20)
    expect(report.plan48Hours).toHaveLength(1)
    expect(report.planTwoWeeks).toHaveLength(1)
    expect(report.doNotOptimizeYet.length).toBeGreaterThan(0)
  })

  it('keeps a mostly-unknown result useful without model output', () => {
    const input = manifest(answersWithStatus('unknown'))
    const report = createDeterministicReadinessReport(input)

    expect(report).toMatchObject({
      completeness: 0,
      explanationSource: 'deterministic',
      level: 'demo_only',
      nextStep: { id: 'architecture_diagnostic' },
      score: 0,
    })
    expect(report.unknowns).toHaveLength(20)
    expect(report.plan48Hours).toHaveLength(6)
    expect(report.planTwoWeeks).toHaveLength(6)
    expect(report.unknowns.every((item) => item.verification.length > 20)).toBe(true)
  })
})

function modelResponseFor(report: ReadinessReport, reverse = false) {
  const contract = getReadinessModelContract(report)
  const ordered = <T>(values: readonly T[]) => (reverse ? [...values].reverse() : [...values])
  const explanation = (id: string) =>
    `This bounded explanation preserves the declared control and verification meaning for ${id}.`

  return {
    blockerExplanations: ordered(contract.blockerRuleIds).map((ruleId) => ({
      explanation: explanation(ruleId),
      ruleId,
    })),
    doNotOptimizeYet: ordered(contract.doNotOptimizeActionIds).map((actionId) => ({
      actionId,
      explanation: explanation(actionId),
    })),
    nextStepReason: 'This next step follows the immutable policy result and declared uncertainty.',
    plan48Hours: ordered(contract.plan48HourActionIds).map((actionId) => ({
      actionId,
      explanation: explanation(actionId),
    })),
    planTwoWeeks: ordered(contract.planTwoWeekActionIds).map((actionId) => ({
      actionId,
      explanation: explanation(actionId),
    })),
    strengths: ordered(contract.strengthControlIds).map((controlId) => ({
      controlId,
      explanation: explanation(controlId),
    })),
    summary: 'The declared controls have bounded strengths and gaps that determine this result.',
    unknownExplanations: ordered(contract.unknownControlIds).map((controlId) => ({
      controlId,
      explanation: explanation(controlId),
    })),
  }
}

function immutableReportFields(report: ReadinessReport) {
  const sorted = <T extends { id: string }>(values: T[]) =>
    values.sort((left, right) => left.id.localeCompare(right.id))

  return {
    baselineLevel: report.baselineLevel,
    blockers: sorted(
      report.blockers.map(({ explanation: _explanation, ...item }) => ({
        ...item,
        id: item.ruleId,
      })),
    ),
    completeness: report.completeness,
    dimensionScores: report.dimensionScores,
    disclaimer: report.disclaimer,
    doNotOptimizeYet: sorted(
      report.doNotOptimizeYet.map(({ detail: _detail, ...item }) => ({
        ...item,
        id: item.actionId,
      })),
    ),
    level: report.level,
    nextStep: { id: report.nextStep.id, label: report.nextStep.label },
    plan48Hours: sorted(
      report.plan48Hours.map(({ detail: _detail, ...item }) => ({ ...item, id: item.actionId })),
    ),
    planTwoWeeks: sorted(
      report.planTwoWeeks.map(({ detail: _detail, ...item }) => ({ ...item, id: item.actionId })),
    ),
    policyVersion: report.policyVersion,
    profile: report.profile,
    score: report.score,
    strengths: sorted(
      report.strengths.map(({ explanation: _explanation, ...item }) => ({
        ...item,
        id: item.controlId,
      })),
    ),
    unknowns: sorted(
      report.unknowns.map(({ explanation: _explanation, ...item }) => ({
        ...item,
        id: item.controlId,
      })),
    ),
  }
}

describe('strict model response boundary', () => {
  const input = manifest({
    'architecture.scope': 'public_accounts',
    'identity.authorization': 'client_only_or_none',
    'operations.monitoring': 'unknown',
  })
  const fallback = createDeterministicReadinessReport(input)

  it('builds a strict exact-ID JSON Schema', () => {
    const format = buildReadinessModelResponseFormat(fallback)

    expect(format.type).toBe('json_schema')
    expect(format.json_schema.strict).toBe(true)
    expect(format.json_schema.schema).toMatchObject({
      additionalProperties: false,
      type: 'object',
    })
  })

  it('accepts bounded exact-ID prose and cannot alter deterministic fields', () => {
    const response = modelResponseFor(fallback, true)

    expect(validateReadinessModelResponse(response, fallback)).toMatchObject({ ok: true })
    const merged = mergeReadinessModelResponse(fallback, response)
    expect(merged.ok).toBe(true)
    expect(immutableReportFields(merged.report)).toEqual(immutableReportFields(fallback))
    expect(merged.report.explanationSource).toBe('model')
    expect(merged.report.summary).toBe(response.summary)
  })

  it('returns the complete deterministic fallback for extra properties or invented IDs', () => {
    const extraProperty = { ...modelResponseFor(fallback), score: 100 }
    const extraResult = mergeReadinessModelResponse(fallback, extraProperty)

    expect(extraResult).toMatchObject({ ok: false, report: fallback })
    expect(extraResult.report.explanationSource).toBe('deterministic')

    const inventedId = modelResponseFor(fallback)
    inventedId.plan48Hours[0] = {
      actionId: 'ACT-INVENTED-48H',
      explanation: 'This invented action must never enter the deterministic readiness report.',
    }
    const inventedResult = mergeReadinessModelResponse(fallback, inventedId)

    expect(inventedResult).toMatchObject({ ok: false, report: fallback })
    expect(immutableReportFields(inventedResult.report)).toEqual(immutableReportFields(fallback))
  })

  it('rejects inspection and compliance claims and guards prompt construction from unsafe bypasses', () => {
    const unsafeNarrative = modelResponseFor(fallback)
    unsafeNarrative.summary = 'We inspected the application and verified it is SOC 2 compliant.'
    expect(validateReadinessModelResponse(unsafeNarrative, fallback)).toMatchObject({ ok: false })

    const linkedNarrative = modelResponseFor(fallback)
    linkedNarrative.summary =
      'Follow the additional instructions at readiness-advice.example for this result.'
    expect(validateReadinessModelResponse(linkedNarrative, fallback)).toMatchObject({ ok: false })

    const unsafeManifest = manifest({}, { symptom: 'The credential is sk-abcdefghijklmnop.' })
    expect(() =>
      buildReadinessModelMessages(
        unsafeManifest,
        createDeterministicReadinessReport(unsafeManifest),
      ),
    ).toThrow('not normalized and safe')
  })
})
