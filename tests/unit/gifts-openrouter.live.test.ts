import { randomUUID } from 'node:crypto'

import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { resolveOpenRouterGiftConfig } from '@/lib/gifts/server/config'
import { GiftSearchError, searchGiftIdeas } from '@/lib/gifts/server/openrouter'
import { safeGiftSourceURL } from '@/lib/gifts/validation'

const liveTest = process.env.RUN_GIFT_OPENROUTER_LIVE === '1' ? it : it.skip

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function modelOutputSummary(message: Record<string, unknown> | null) {
  if (!message || typeof message.content !== 'string') return null

  try {
    const parsed: unknown = JSON.parse(message.content)
    const ideas = isRecord(parsed) && Array.isArray(parsed.ideas) ? parsed.ideas : []
    const citations = new Set(
      (Array.isArray(message.annotations) ? message.annotations : [])
        .map((annotation) =>
          isRecord(annotation) && isRecord(annotation.url_citation)
            ? safeGiftSourceURL(annotation.url_citation.url)
            : null,
        )
        .filter((url): url is string => Boolean(url)),
    )
    const records = ideas.filter(isRecord)
    const normalizedURLs = records.map((idea) => safeGiftSourceURL(idea.sourceUrl))
    const expectedKeys = [
      'category',
      'currency',
      'name',
      'observedPriceCents',
      'retailer',
      'sourceUrl',
      'whyItFits',
    ].sort()
    const bounded = (value: unknown, minimum: number, maximum: number) =>
      typeof value === 'string' &&
      value.length >= minimum &&
      value.length <= maximum &&
      value.trim() === value

    return {
      citedIdeaURLs: normalizedURLs.filter((url) => url && citations.has(url)).length,
      currenciesUSD: records.filter((idea) => idea.currency === 'usd').length,
      ideaCount: ideas.length,
      ideaRecordCount: records.length,
      invalidKeyShapeCount: records.filter(
        (idea) => JSON.stringify(Object.keys(idea).sort()) !== JSON.stringify(expectedKeys),
      ).length,
      invalidPriceCount: records.filter(
        (idea) =>
          !Number.isSafeInteger(idea.observedPriceCents) ||
          Number(idea.observedPriceCents) < 1_000 ||
          Number(idea.observedPriceCents) > 3_000,
      ).length,
      invalidTextCount: records.filter(
        (idea) =>
          !bounded(idea.name, 3, 120) ||
          !bounded(idea.category, 2, 50) ||
          !bounded(idea.whyItFits, 20, 280) ||
          !bounded(idea.retailer, 2, 80),
      ).length,
      safeURLCount: normalizedURLs.filter(Boolean).length,
      topLevelKeys: isRecord(parsed) ? Object.keys(parsed).sort() : [],
      uniqueNameCount: new Set(records.map((idea) => idea.name)).size,
      uniqueURLCount: new Set(normalizedURLs).size,
    }
  } catch {
    return { validJSON: false }
  }
}

describe('OpenRouter Gift Draft live smoke', () => {
  liveTest(
    'searches and validates one current nine-item deck',
    async () => {
      const config = resolveOpenRouterGiftConfig(process.env)
      expect(
        config,
        'Configure the documented Gift Draft OpenRouter environment first.',
      ).not.toBeNull()
      if (!config) return

      const runId = randomUUID()
      let upstreamDiagnostic: unknown = null
      const responseEnvelopes: unknown[] = []
      let result
      try {
        result = await searchGiftIdeas({
          config,
          fetchImpl: async (input, init) => {
            const response = await fetch(input, init)
            try {
              const payload: unknown = await response.clone().json()
              const error = isRecord(payload) && isRecord(payload.error) ? payload.error : null
              const choice =
                isRecord(payload) && Array.isArray(payload.choices) ? payload.choices[0] : null
              const message = isRecord(choice) && isRecord(choice.message) ? choice.message : null
              responseEnvelopes.push({
                annotations:
                  message && Array.isArray(message.annotations) ? message.annotations.length : 0,
                choiceKeys: isRecord(choice) ? Object.keys(choice).sort() : [],
                contentBytes:
                  message && typeof message.content === 'string'
                    ? new TextEncoder().encode(message.content).byteLength
                    : null,
                finishReason: isRecord(choice) ? choice.finish_reason : null,
                messageKeys: message ? Object.keys(message).sort() : [],
                model: isRecord(payload) ? payload.model : null,
                modelOutput: modelOutputSummary(message),
                status: response.status,
                topLevelKeys: isRecord(payload) ? Object.keys(payload).sort() : [],
                usageKeys:
                  isRecord(payload) && isRecord(payload.usage)
                    ? Object.keys(payload.usage).sort()
                    : [],
              })
              if (!response.ok) {
                upstreamDiagnostic = {
                  code: error?.code,
                  message:
                    typeof error?.message === 'string' ? error.message.slice(0, 500) : undefined,
                  status: response.status,
                }
              }
            } catch {
              upstreamDiagnostic = { status: response.status, unreadableJSON: true }
            }
            return response
          },
          request: {
            anonymousToken: `live_smoke_${randomUUID().replaceAll('-', '')}`,
            budget: 'under_30',
            theme: 'build_fuel',
            variationSeed: `live_seed_${randomUUID().replaceAll('-', '')}`,
          },
          runId,
          searchedAt: new Date().toISOString(),
        })
      } catch (error) {
        if (error instanceof GiftSearchError) {
          throw new Error(
            `Gift Draft OpenRouter smoke failed: reason=${error.reason}; status=${error.upstream.status ?? 'unknown'}; retryAfter=${error.upstream.retryAfter ?? 'none'}; upstream=${JSON.stringify(upstreamDiagnostic)}; envelopes=${JSON.stringify(responseEnvelopes)}`,
          )
        }
        throw error
      }

      expect(result.ideas).toHaveLength(9)
      expect(result.citations).toBeGreaterThanOrEqual(9)
      expect(result.usage.searchRequests).toBeGreaterThan(0)
      expect([config.primaryModel, config.fallbackModel]).toContain(result.model)

      process.stdout.write(
        `${JSON.stringify({
          citations: result.citations,
          event: 'gift_openrouter_live_smoke_succeeded',
          model: result.model,
          usage: result.usage,
        })}\n`,
      )
    },
    60_000,
  )
})
