import type {
  BlockerRuleId,
  ControlId,
  JsonSchemaResponseFormat,
  ModelActionExplanation,
  ModelBlockerExplanation,
  ModelControlExplanation,
  ModelMergeResult,
  ModelResponseValidationResult,
  ModelValidationIssue,
  ReadinessReport,
} from './types'
import { containsDisallowedReadinessURL } from './validate.v1'

const maximumModelUnknowns = 8
const stringBounds = {
  explanation: { max: 360, min: 8 },
  nextStepReason: { max: 400, min: 8 },
  summary: { max: 600, min: 12 },
} as const
const unsafeNarrativePatterns = [
  /```|~~~|\bhttps?:\/\/|\bwww\./i,
  /\b(?:rm\s+-rf|DROP\s+(?:TABLE|DATABASE)|DELETE\s+FROM|format\s+[A-Z]:|shutdown\s+-h)\b/i,
  /\b(?:I|we)\s+(?:have\s+)?(?:inspected|audited|reviewed|scanned|tested|verified|examined)\b/i,
  /\b(?:certified|compliance-certified|guaranteed secure|production-safe|(?:SOC\s?2|HIPAA|GDPR|PCI(?:\s+DSS)?)\s+compliant)\b/i,
] as const

export interface ReadinessModelContract {
  blockerRuleIds: readonly BlockerRuleId[]
  doNotOptimizeActionIds: readonly string[]
  plan48HourActionIds: readonly string[]
  planTwoWeekActionIds: readonly string[]
  strengthControlIds: readonly ControlId[]
  unknownControlIds: readonly ControlId[]
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)]
}

export function getReadinessModelContract(report: ReadinessReport): ReadinessModelContract {
  return {
    blockerRuleIds: unique(report.blockers.map((blocker) => blocker.ruleId)),
    doNotOptimizeActionIds: unique(report.doNotOptimizeYet.map((action) => action.actionId)),
    plan48HourActionIds: unique(report.plan48Hours.map((action) => action.actionId)),
    planTwoWeekActionIds: unique(report.planTwoWeeks.map((action) => action.actionId)),
    strengthControlIds: unique(report.strengths.map((strength) => strength.controlId)),
    unknownControlIds: unique(
      report.unknowns.slice(0, maximumModelUnknowns).map((unknown) => unknown.controlId),
    ),
  }
}

function schemaEnum(values: readonly string[]): readonly string[] {
  return values.length > 0 ? values : ['__no_items_allowed__']
}

function boundedStringSchema(bounds: { min: number; max: number }) {
  return {
    maxLength: bounds.max,
    minLength: bounds.min,
    type: 'string',
  }
}

function explanationArraySchema(
  idKey: 'actionId' | 'controlId' | 'ruleId',
  allowedIds: readonly string[],
) {
  return {
    items: {
      additionalProperties: false,
      properties: {
        [idKey]: { enum: schemaEnum(allowedIds), type: 'string' },
        explanation: boundedStringSchema(stringBounds.explanation),
      },
      required: [idKey, 'explanation'],
      type: 'object',
    },
    maxItems: allowedIds.length,
    minItems: allowedIds.length,
    type: 'array',
  }
}

export function buildReadinessModelResponseFormat(
  report: ReadinessReport,
): JsonSchemaResponseFormat {
  const contract = getReadinessModelContract(report)

  return {
    json_schema: {
      name: 'saberistic_readiness_explanation_2026_09_01_1',
      schema: {
        additionalProperties: false,
        properties: {
          blockerExplanations: explanationArraySchema('ruleId', contract.blockerRuleIds),
          doNotOptimizeYet: explanationArraySchema('actionId', contract.doNotOptimizeActionIds),
          nextStepReason: boundedStringSchema(stringBounds.nextStepReason),
          plan48Hours: explanationArraySchema('actionId', contract.plan48HourActionIds),
          planTwoWeeks: explanationArraySchema('actionId', contract.planTwoWeekActionIds),
          strengths: explanationArraySchema('controlId', contract.strengthControlIds),
          summary: boundedStringSchema(stringBounds.summary),
          unknownExplanations: explanationArraySchema('controlId', contract.unknownControlIds),
        },
        required: [
          'summary',
          'blockerExplanations',
          'unknownExplanations',
          'strengths',
          'plan48Hours',
          'planTwoWeeks',
          'doNotOptimizeYet',
          'nextStepReason',
        ],
        type: 'object',
      },
      strict: true,
    },
    type: 'json_schema',
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
}

function safeNarrative(
  value: unknown,
  path: string,
  bounds: { min: number; max: number },
  issues: ModelValidationIssue[],
): string | null {
  if (typeof value !== 'string') {
    issues.push({ message: 'Expected bounded explanatory text.', path })
    return null
  }

  const normalized = value
    .normalize('NFKC')
    .replace(/\r\n?/g, '\n')
    .replace(/[\t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim()

  if (
    normalized.length < bounds.min ||
    normalized.length > bounds.max ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(normalized) ||
    containsDisallowedReadinessURL(normalized) ||
    unsafeNarrativePatterns.some((pattern) => pattern.test(normalized))
  ) {
    issues.push({ message: 'Explanatory text violates the bounded narrative contract.', path })
    return null
  }

  return normalized
}

function validateExplanationArray<Id extends string>(
  value: unknown,
  path: string,
  idKey: 'actionId' | 'controlId' | 'ruleId',
  expectedIds: readonly Id[],
  issues: ModelValidationIssue[],
): Array<{ id: Id; explanation: string }> {
  if (!Array.isArray(value)) {
    issues.push({ message: 'Expected a bounded explanation array.', path })
    return []
  }
  if (value.length !== expectedIds.length) {
    issues.push({ message: 'The explanation array does not cover the exact allowed IDs.', path })
  }

  const expected = new Set<string>(expectedIds)
  const seen = new Set<string>()
  const normalized: Array<{ id: Id; explanation: string }> = []

  value.forEach((item, index) => {
    const itemPath = `${path}[${index}]`
    if (!isRecord(item) || !hasExactKeys(item, [idKey, 'explanation'])) {
      issues.push({
        message: 'Each explanation must contain exactly its ID and explanation.',
        path: itemPath,
      })
      return
    }

    const id = item[idKey]
    if (typeof id !== 'string' || !expected.has(id) || seen.has(id)) {
      issues.push({
        message: 'The explanation contains an invented or duplicate ID.',
        path: `${itemPath}.${idKey}`,
      })
      return
    }

    const explanation = safeNarrative(
      item.explanation,
      `${itemPath}.explanation`,
      stringBounds.explanation,
      issues,
    )
    seen.add(id)
    if (explanation) normalized.push({ explanation, id: id as Id })
  })

  for (const id of expectedIds) {
    if (!seen.has(id)) {
      issues.push({ message: 'A required deterministic ID is missing.', path: `${path}.${id}` })
    }
  }

  return normalized
}

export function validateReadinessModelResponse(
  value: unknown,
  report: ReadinessReport,
): ModelResponseValidationResult {
  const issues: ModelValidationIssue[] = []
  const rootKeys = [
    'summary',
    'blockerExplanations',
    'unknownExplanations',
    'strengths',
    'plan48Hours',
    'planTwoWeeks',
    'doNotOptimizeYet',
    'nextStepReason',
  ] as const

  if (!isRecord(value) || !hasExactKeys(value, rootKeys)) {
    return {
      issues: [
        { message: 'The model response must contain exactly the contracted fields.', path: '' },
      ],
      ok: false,
    }
  }

  const contract = getReadinessModelContract(report)
  const summary = safeNarrative(value.summary, 'summary', stringBounds.summary, issues)
  const nextStepReason = safeNarrative(
    value.nextStepReason,
    'nextStepReason',
    stringBounds.nextStepReason,
    issues,
  )
  const blockerExplanations = validateExplanationArray(
    value.blockerExplanations,
    'blockerExplanations',
    'ruleId',
    contract.blockerRuleIds,
    issues,
  )
  const unknownExplanations = validateExplanationArray(
    value.unknownExplanations,
    'unknownExplanations',
    'controlId',
    contract.unknownControlIds,
    issues,
  )
  const strengths = validateExplanationArray(
    value.strengths,
    'strengths',
    'controlId',
    contract.strengthControlIds,
    issues,
  )
  const plan48Hours = validateExplanationArray(
    value.plan48Hours,
    'plan48Hours',
    'actionId',
    contract.plan48HourActionIds,
    issues,
  )
  const planTwoWeeks = validateExplanationArray(
    value.planTwoWeeks,
    'planTwoWeeks',
    'actionId',
    contract.planTwoWeekActionIds,
    issues,
  )
  const doNotOptimizeYet = validateExplanationArray(
    value.doNotOptimizeYet,
    'doNotOptimizeYet',
    'actionId',
    contract.doNotOptimizeActionIds,
    issues,
  )

  if (!summary || !nextStepReason || issues.length > 0) return { issues, ok: false }

  return {
    issues: [],
    ok: true,
    value: {
      blockerExplanations: blockerExplanations.map(
        ({ id, explanation }): ModelBlockerExplanation => ({ explanation, ruleId: id }),
      ),
      doNotOptimizeYet: doNotOptimizeYet.map(({ id, explanation }): ModelActionExplanation => ({
        actionId: id,
        explanation,
      })),
      nextStepReason,
      plan48Hours: plan48Hours.map(({ id, explanation }): ModelActionExplanation => ({
        actionId: id,
        explanation,
      })),
      planTwoWeeks: planTwoWeeks.map(({ id, explanation }): ModelActionExplanation => ({
        actionId: id,
        explanation,
      })),
      strengths: strengths.map(({ id, explanation }): ModelControlExplanation => ({
        controlId: id,
        explanation,
      })),
      summary,
      unknownExplanations: unknownExplanations.map(
        ({ id, explanation }): ModelControlExplanation => ({ controlId: id, explanation }),
      ),
    },
  }
}

function byId<T extends { explanation: string }, Key extends string>(
  values: readonly T[],
  key: (value: T) => Key,
): Map<Key, string> {
  return new Map(values.map((value) => [key(value), value.explanation]))
}

export function mergeReadinessModelResponse(
  report: ReadinessReport,
  value: unknown,
): ModelMergeResult {
  const validation = validateReadinessModelResponse(value, report)
  if (!validation.ok) return { issues: validation.issues, ok: false, report }

  const model = validation.value
  const blockerText = byId(model.blockerExplanations, (item) => item.ruleId)
  const unknownText = byId(model.unknownExplanations, (item) => item.controlId)
  const strengthText = byId(model.strengths, (item) => item.controlId)
  const plan48Text = byId(model.plan48Hours, (item) => item.actionId)
  const planTwoWeekText = byId(model.planTwoWeeks, (item) => item.actionId)
  const doNotText = byId(model.doNotOptimizeYet, (item) => item.actionId)
  const unknownByControl = new Map(report.unknowns.map((item) => [item.controlId, item]))
  const strengthByControl = new Map(report.strengths.map((item) => [item.controlId, item]))
  const plan48ByAction = new Map(report.plan48Hours.map((item) => [item.actionId, item]))
  const planTwoWeekByAction = new Map(report.planTwoWeeks.map((item) => [item.actionId, item]))
  const doNotByAction = new Map(report.doNotOptimizeYet.map((item) => [item.actionId, item]))
  const explainedUnknownIds = new Set(model.unknownExplanations.map((item) => item.controlId))

  const merged: ReadinessReport = {
    ...report,
    blockers: report.blockers.map((blocker) => ({
      ...blocker,
      explanation: blockerText.get(blocker.ruleId) ?? blocker.explanation,
    })),
    doNotOptimizeYet: model.doNotOptimizeYet.map((modelItem) => {
      const deterministic = doNotByAction.get(modelItem.actionId)
      if (!deterministic) throw new Error('Validated model action is missing from the report.')
      return { ...deterministic, detail: doNotText.get(modelItem.actionId) ?? deterministic.detail }
    }),
    explanationSource: 'model',
    nextStep: { ...report.nextStep, reason: model.nextStepReason },
    plan48Hours: model.plan48Hours.map((modelItem) => {
      const deterministic = plan48ByAction.get(modelItem.actionId)
      if (!deterministic) throw new Error('Validated model action is missing from the report.')
      return {
        ...deterministic,
        detail: plan48Text.get(modelItem.actionId) ?? deterministic.detail,
      }
    }),
    planTwoWeeks: model.planTwoWeeks.map((modelItem) => {
      const deterministic = planTwoWeekByAction.get(modelItem.actionId)
      if (!deterministic) throw new Error('Validated model action is missing from the report.')
      return {
        ...deterministic,
        detail: planTwoWeekText.get(modelItem.actionId) ?? deterministic.detail,
      }
    }),
    strengths: model.strengths.map((modelItem) => {
      const deterministic = strengthByControl.get(modelItem.controlId)
      if (!deterministic) throw new Error('Validated model strength is missing from the report.')
      return {
        ...deterministic,
        explanation: strengthText.get(modelItem.controlId) ?? deterministic.explanation,
      }
    }),
    summary: model.summary,
    unknowns: [
      ...model.unknownExplanations.map((modelItem) => {
        const deterministic = unknownByControl.get(modelItem.controlId)
        if (!deterministic) throw new Error('Validated model unknown is missing from the report.')
        return {
          ...deterministic,
          explanation: unknownText.get(modelItem.controlId) ?? deterministic.explanation,
        }
      }),
      ...report.unknowns.filter((item) => !explainedUnknownIds.has(item.controlId)),
    ],
  }

  return { issues: [], ok: true, report: merged }
}
