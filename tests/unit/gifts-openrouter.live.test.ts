import { randomUUID } from 'node:crypto'

import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { resolveOpenRouterGiftConfig } from '@/lib/gifts/server/config'
import { GiftSearchError, searchGiftIdeas } from '@/lib/gifts/server/openrouter'
import { giftBudgetIds } from '@/lib/gifts/types'
import { safeGiftSourceURL } from '@/lib/gifts/validation'

const liveTest = process.env.RUN_GIFT_OPENROUTER_LIVE === '1' ? it : it.skip

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function modelOutputSummary(message: Record<string, unknown> | null) {
  if (!message || typeof message.content !== 'string') return null

  try {
    const parsed: unknown = JSON.parse(message.content)
    const containerKey = isRecord(parsed)
      ? ['candidates', 'gifts', 'ideas', 'recommendations', 'results'].find((key) =>
          Array.isArray(parsed[key]),
        )
      : undefined
    const ideas = containerKey && isRecord(parsed) ? (parsed[containerKey] as unknown[]) : []
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
    const sourceAliases = new Set([
      'sourceurl',
      'source_url',
      'producturl',
      'product_url',
      'address',
      '[address]',
    ])
    const normalizedURLs = records.map((idea) => {
      const sourceEntry = Object.entries(idea).find(([key]) => sourceAliases.has(key.toLowerCase()))
      return safeGiftSourceURL(sourceEntry?.[1])
    })
    const sourceEntries = records.map((idea) =>
      Object.entries(idea).find(([key]) => sourceAliases.has(key.toLowerCase())),
    )
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

    const observedPrices = records.map(
      (idea) =>
        idea.observedPriceCents ?? idea.observed_price_cents ?? idea.priceCents ?? idea.price_cents,
    )
    const names = records.map((idea) => idea.name ?? idea.productName ?? idea.product_name)

    return {
      aboveMaximumPriceCount: observedPrices.filter(
        (price) => Number.isSafeInteger(price) && Number(price) > 3_000,
      ).length,
      belowMinimumPriceCount: observedPrices.filter(
        (price) => Number.isSafeInteger(price) && Number(price) < 1_000,
      ).length,
      citedIdeaURLs: normalizedURLs.filter((url) => url && citations.has(url)).length,
      containerKey: containerKey ?? null,
      currencyLowercaseUSDCount: records.filter((idea) => idea.currency === 'usd').length,
      currencyUppercaseUSDCount: records.filter((idea) => idea.currency === 'USD').length,
      distinctItemKeyShapes: new Set(
        records.map((idea) => JSON.stringify(Object.keys(idea).sort())),
      ).size,
      ideaCount: ideas.length,
      ideaRecordCount: records.length,
      invalidKeyShapeCount: records.filter(
        (idea) => JSON.stringify(Object.keys(idea).sort()) !== JSON.stringify(expectedKeys),
      ).length,
      invalidPriceCount: observedPrices.filter(
        (price) => !Number.isSafeInteger(price) || Number(price) < 1_000 || Number(price) > 3_000,
      ).length,
      invalidTextCount: records.filter(
        (idea) =>
          !bounded(idea.name, 3, 120) ||
          !bounded(idea.category, 2, 50) ||
          !bounded(idea.whyItFits, 20, 280) ||
          !bounded(idea.retailer, 2, 80),
      ).length,
      safeURLCount: normalizedURLs.filter(Boolean).length,
      sourceAddressPlaceholderCount: sourceEntries.filter((entry) =>
        typeof entry?.[1] === 'string' ? /^\[?address\]?$/i.test(entry[1].trim()) : false,
      ).length,
      sourceFieldNames: [...new Set(sourceEntries.map((entry) => entry?.[0] ?? null))],
      sourceValueStringCount: sourceEntries.filter((entry) => typeof entry?.[1] === 'string')
        .length,
      uniqueNameCount: new Set(names).size,
      uniqueURLCount: new Set(normalizedURLs).size,
    }
  } catch {
    return { validJSON: false }
  }
}

function usageSummary(value: unknown) {
  if (!isRecord(value)) return null
  const details = isRecord(value.server_tool_use_details) ? value.server_tool_use_details : null
  const legacy = isRecord(value.server_tool_use) ? value.server_tool_use : null
  const integer = (candidate: unknown) =>
    typeof candidate === 'number' && Number.isSafeInteger(candidate) && candidate >= 0
      ? candidate
      : null

  return {
    legacyWebSearchRequests: integer(legacy?.web_search_requests),
    toolCallsExecuted: integer(details?.tool_calls_executed),
    toolCallsRequested: integer(details?.tool_calls_requested),
    webSearch: integer(details?.web_search),
    webSearchRequests: integer(details?.web_search_requests),
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
      const requestedBudget = giftBudgetIds.find(
        (budget) => budget === process.env.GIFT_OPENROUTER_LIVE_BUDGET,
      ) ?? 'under_30'
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
              const usage = isRecord(payload) ? payload.usage : null
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
                usage: usageSummary(usage),
                usageKeys: isRecord(usage) ? Object.keys(usage).sort() : [],
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
            budget: requestedBudget,
            theme: 'build_fuel',
            variationSeed: `live_seed_${randomUUID().replaceAll('-', '')}`,
          },
          runId,
          searchedAt: new Date().toISOString(),
        })
      } catch (error) {
        if (error instanceof GiftSearchError) {
          throw new Error(
            `Gift Draft OpenRouter smoke failed: reason=${error.reason}; status=${error.upstream.status ?? 'unknown'}; retryAfter=${error.upstream.retryAfter ?? 'none'}; listingChecks=${error.verification?.checked ?? 'unknown'}; verifiedCandidates=${error.verification?.verified ?? 'unknown'}; sourcePricesChanged=${error.verification?.sourcePricesChanged ?? 'unknown'}; priceBands=${JSON.stringify(error.verification?.priceBands ?? {})}; listingRejections=${JSON.stringify(error.verification?.rejections ?? {})}; upstream=${JSON.stringify(upstreamDiagnostic)}; envelopes=${JSON.stringify(responseEnvelopes)}`,
          )
        }
        throw error
      }

      expect(result.ideas).toHaveLength(9)
      expect(result.citations).toBeGreaterThanOrEqual(9)
      expect(result.usage.searchRequests + result.usage.serverToolCalls).toBeGreaterThan(0)
      expect([config.primaryModel, config.fallbackModel]).toContain(result.model)
      expect(
        result.searchModel
          .split('+')
          .every((model) => [config.primaryModel, config.fallbackModel].includes(model)),
      ).toBe(true)

      process.stdout.write(
        `${JSON.stringify({
          attempts: responseEnvelopes,
          citations: result.citations,
          budget: requestedBudget,
          event: 'gift_openrouter_live_smoke_succeeded',
          ideas: result.ideas,
          listingChecks: result.listingChecks,
          model: result.model,
          searchModel: result.searchModel,
          sourcePricesChanged: result.sourcePricesChanged,
          usage: result.usage,
          verifiedCandidates: result.verifiedCandidates,
        })}\n`,
      )
    },
    75_000,
  )
})
