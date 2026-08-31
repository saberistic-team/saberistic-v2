import { describe, expect, it } from 'vitest'

import {
  readinessPolicyVersion,
  readinessQuestionsV1,
  validateReadinessManifest,
  type QuestionId,
  type ReadinessAnswers,
  type ReadinessManifest,
} from '@/lib/readiness'

function answersWithStatus(status: 'pass'): ReadinessAnswers {
  return Object.fromEntries(
    readinessQuestionsV1.map((question) => {
      const option = question.options.find((candidate) => candidate.status === status)
      if (!option) throw new Error(`No ${status} option for ${question.id}`)
      return [question.id, option.value]
    }),
  ) as ReadinessAnswers
}

const strongAnswers = answersWithStatus('pass')

function manifest(answers: Partial<Record<QuestionId, string>>): ReadinessManifest {
  return {
    answers: { ...strongAnswers, ...answers },
    policyVersion: readinessPolicyVersion,
    profile: 'custom',
  }
}

const retainedDataClassifications = [
  'classified_non_sensitive',
  'classified_sensitive',
  'sensitive_unclassified',
] as const

const guardedNotApplicableAnswers = [
  ['identity.deletion', 'answers.identity.deletion'],
  ['operations.backups', 'answers.operations.backups'],
] as const

describe('readiness not-applicable consistency', () => {
  it.each(
    retainedDataClassifications.flatMap((dataClassification) =>
      guardedNotApplicableAnswers.map(
        ([questionId, issuePath]) => [dataClassification, questionId, issuePath] as const,
      ),
    ),
  )('rejects %s with %s marked not applicable', (dataClassification, questionId, issuePath) => {
    const result = validateReadinessManifest(
      manifest({
        'identity.data_classification': dataClassification,
        [questionId]: 'not_applicable',
      }),
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: 'contradictory_answers',
          path: issuePath,
        }),
      )
    }
  })

  it('reports both bypassed controls when both are marked not applicable', () => {
    const result = validateReadinessManifest(
      manifest({
        'identity.data_classification': 'classified_sensitive',
        'identity.deletion': 'not_applicable',
        'operations.backups': 'not_applicable',
      }),
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'contradictory_answers',
            path: 'answers.identity.deletion',
          }),
          expect.objectContaining({
            code: 'contradictory_answers',
            path: 'answers.operations.backups',
          }),
        ]),
      )
    }
  })

  it.each(retainedDataClassifications)(
    'accepts concrete deletion and recovery answers for %s',
    (dataClassification) => {
      expect(
        validateReadinessManifest(manifest({ 'identity.data_classification': dataClassification })),
      ).toMatchObject({ ok: true })
    },
  )

  it('allows the controls to be not applicable when no retained private data is declared', () => {
    expect(
      validateReadinessManifest(
        manifest({
          'identity.data_classification': 'none_or_public',
          'identity.deletion': 'not_applicable',
          'operations.backups': 'not_applicable',
        }),
      ),
    ).toMatchObject({ ok: true })
  })
})
