import { config as loadEnvironment } from 'dotenv'
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  createDeterministicReadinessReport,
  readinessPolicyVersion,
  readinessQuestionsV1,
  scoreReadiness,
  type ReadinessAnswers,
  type ReadinessManifest,
} from '@/lib/readiness'
import type { OpenRouterReadinessConfig } from '@/lib/readiness/server/config'
import { enhanceReadinessReport } from '@/lib/readiness/server/openrouter'

const runLiveOpenRouterTest = process.env.RUN_OPENROUTER_LIVE === '1'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

describe.skipIf(!runLiveOpenRouterTest)('OpenRouter readiness live smoke test', () => {
  it('enhances a synthetic deterministic report through the production adapter', async () => {
    loadEnvironment({ path: '.env' })

    const apiKey = process.env.OPENROUTER_API_KEY?.trim()
    if (!apiKey) throw new Error('OPENROUTER_API_KEY is required for this opt-in test')

    const answers = Object.fromEntries(
      readinessQuestionsV1.map((question) => [question.id, question.options[0]?.value]),
    ) as ReadinessAnswers
    const manifest: ReadinessManifest = {
      answers,
      policyVersion: readinessPolicyVersion,
      profile: 'ai_saas',
      symptom: 'Release confidence is low after a controlled rollback drill.',
    }
    const policyResult = scoreReadiness(manifest)
    const deterministicReport = createDeterministicReadinessReport(manifest, policyResult)
    const config: OpenRouterReadinessConfig = {
      apiKey,
      fallbackModel: 'openai/gpt-4.1-mini',
      maxCompletionTokens: 1_800,
      primaryModel: 'google/gemini-2.5-flash-lite',
      siteURL: 'http://localhost:3000',
      timeoutMs: 25_000,
    }
    let responseEnvelope: unknown = null

    const outcome = await enhanceReadinessReport({
      config,
      deterministicReport,
      fetchImpl: async (input, init) => {
        const response = await fetch(input, init)

        try {
          const payload: unknown = await response.clone().json()
          if (isRecord(payload)) {
            const choice = Array.isArray(payload.choices) ? payload.choices[0] : undefined
            const message = isRecord(choice) && isRecord(choice.message) ? choice.message : null
            const metadata = isRecord(payload.openrouter_metadata)
              ? payload.openrouter_metadata
              : null
            const endpoints = metadata && isRecord(metadata.endpoints) ? metadata.endpoints : null
            const available =
              endpoints && Array.isArray(endpoints.available) ? endpoints.available : []

            responseEnvelope = {
              contentBytes:
                message && typeof message.content === 'string'
                  ? new TextEncoder().encode(message.content).byteLength
                  : null,
              finishReason: isRecord(choice) ? choice.finish_reason : null,
              metadata: metadata
                ? {
                    endpointKeys: endpoints ? Object.keys(endpoints).sort() : [],
                    endpoints: available.map((endpoint) =>
                      isRecord(endpoint)
                        ? {
                            keys: Object.keys(endpoint).sort(),
                            model: endpoint.model,
                            provider: endpoint.provider,
                            selected: endpoint.selected,
                          }
                        : { type: typeof endpoint },
                    ),
                    keys: Object.keys(metadata).sort(),
                    pipeline: Array.isArray(metadata.pipeline)
                      ? metadata.pipeline.map((stage) =>
                          isRecord(stage)
                            ? { keys: Object.keys(stage).sort(), type: stage.type }
                            : { type: typeof stage },
                        )
                      : metadata.pipeline,
                    requested: metadata.requested,
                    strategy: metadata.strategy,
                  }
                : null,
              model: payload.model,
              status: response.status,
              topLevelKeys: Object.keys(payload).sort(),
              usageKeys: isRecord(payload.usage) ? Object.keys(payload.usage).sort() : [],
            }
          }
        } catch {
          responseEnvelope = { status: response.status, unreadableJSON: true }
        }

        return response
      },
      manifest,
      policyResult,
    })

    if (!outcome.ok) {
      throw new Error(
        `OpenRouter readiness enhancement fell back: ${outcome.reason}; envelope=${JSON.stringify(responseEnvelope)}`,
      )
    }

    expect(outcome.model).toSatisfy((model: string) =>
      [config.primaryModel, config.fallbackModel].includes(model),
    )
    expect(outcome.provider.length).toBeGreaterThan(0)
    expect(outcome.report.explanationSource).toBe('model')
    expect(outcome.report.policyVersion).toBe(deterministicReport.policyVersion)
    expect(outcome.report.level).toBe(deterministicReport.level)
    expect(outcome.report.score).toBe(deterministicReport.score)
    expect(outcome.report.dimensionScores).toEqual(deterministicReport.dimensionScores)
    expect(outcome.report.nextStep.id).toBe(deterministicReport.nextStep.id)

    process.stdout.write(
      `${JSON.stringify({
        event: 'readiness_openrouter_live_smoke_succeeded',
        model: outcome.model,
        provider: outcome.provider,
        routingStrategy: outcome.routingStrategy,
        usage: outcome.usage,
      })}\n`,
    )
  }, 35_000)
})
