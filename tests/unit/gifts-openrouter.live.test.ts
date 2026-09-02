import { createHash, randomUUID } from 'node:crypto'

import { config as loadEnvironment } from 'dotenv'
import type { QueryResultRow } from 'pg'
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { readinessPolicyVersion } from '@/lib/readiness/types'
import type { GiftInventoryDatabase } from '@/lib/gifts/server/inventory'
import {
  processGiftInventoryJob,
  readGiftInventoryWorkerConfig,
  type GiftInventoryJob,
} from '@/lib/gifts/server/inventory-worker'
import {
  giftBudgetById,
  giftBudgetIds,
  giftThemeIds,
  type GiftBudgetId,
  type GiftThemeId,
} from '@/lib/gifts/types'

const openRouterChatURL = 'https://openrouter.ai/api/v1/chat/completions'
const openRouterImagesURL = 'https://openrouter.ai/api/v1/images'
const pinnedModel = 'openai/gpt-4.1-mini'
const pinnedImageModel = 'google/gemini-3.1-flash-lite-image'
const liveTest = process.env.RUN_GIFT_OPENROUTER_LIVE === '1' ? it : it.skip

type StoredProduct = {
  cachedImageSha256: string
  cachedImageWebp: Buffer
  category: string
  id: string
  artworkUrl: string
  name: string
  normalizedName: string
  conceptDescription: string
  sourceUrl: string
  suggestedPriceCents: number
  themes: string[]
  whyItFits: string
}

function concreteBudget(value: string | undefined): Exclude<GiftBudgetId, 'mixed'> {
  return (
    giftBudgetIds.find(
      (budget): budget is Exclude<GiftBudgetId, 'mixed'> => budget !== 'mixed' && budget === value,
    ) ?? 'under_30'
  )
}

function concreteTheme(value: string | undefined): Exclude<GiftThemeId, 'mixed'> {
  return (
    giftThemeIds.find(
      (theme): theme is Exclude<GiftThemeId, 'mixed'> => theme !== 'mixed' && theme === value,
    ) ?? 'books_ideas'
  )
}

function liveInventoryDatabase() {
  let storedProduct: StoredProduct | null = null
  const query = vi.fn(
    async (
      text: string,
      values: readonly unknown[] = [],
    ): Promise<{ rowCount: number; rows: QueryResultRow[] }> => {
      if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') {
        return { rowCount: 0, rows: [] }
      }
      if (text.includes("pg_advisory_xact_lock(hashtext('saberistic-gift-inventory-insert'))")) {
        return { rowCount: 1, rows: [{}] }
      }
      if (text.includes('SELECT count(DISTINCT normalized_name)::integer AS count')) {
        return { rowCount: 1, rows: [{ count: 0 }] }
      }
      if (text.includes('INSERT INTO gift_inventory (')) {
        storedProduct = {
          cachedImageSha256: String(values[11]),
          cachedImageWebp: Buffer.from(values[10] as Uint8Array),
          category: String(values[3]),
          id: String(values[0]),
          artworkUrl: String(values[7]),
          name: String(values[1]),
          normalizedName: String(values[2]),
          conceptDescription: String(values[5]),
          sourceUrl: String(values[6]),
          suggestedPriceCents: Number(values[8]),
          themes: Array.isArray(values[9]) ? values[9].map(String) : [],
          whyItFits: String(values[4]),
        }
        return { rowCount: 1, rows: [] }
      }
      if (text.includes('INSERT INTO gift_inventory_jobs')) {
        return { rowCount: 1, rows: [] }
      }
      throw new Error(`unexpected_live_inventory_query:${text.slice(0, 80)}`)
    },
  )
  const release = vi.fn()
  const database = {
    connect: vi.fn(async () => ({ query, release })),
    end: vi.fn(async () => undefined),
    query: vi.fn(async () => {
      throw new Error('unexpected_live_inventory_database_query')
    }),
  } as unknown as GiftInventoryDatabase

  return {
    database,
    getStoredProduct: () => storedProduct,
    query,
    release,
  }
}

function requestURL(input: RequestInfo | URL): URL {
  if (input instanceof URL) return input
  if (typeof input === 'string') return new URL(input)
  return new URL(input.url)
}

describe('OpenRouter Gift Inventory live smoke', () => {
  liveTest(
    'generates, normalizes, and stores one concept without contacting a retailer',
    async () => {
      loadEnvironment({ path: '.env' })
      const apiKey = process.env.OPENROUTER_API_KEY?.trim()
      if (!apiKey) throw new Error('OPENROUTER_API_KEY is required for this opt-in test')

      const budget = concreteBudget(process.env.GIFT_OPENROUTER_LIVE_BUDGET)
      const theme = concreteTheme(process.env.GIFT_OPENROUTER_LIVE_THEME)
      const config = readGiftInventoryWorkerConfig({
        ...process.env,
        DATABASE_URL: 'postgresql://live-test.invalid/gift-inventory-mock',
        GIFTING_AI_ENABLED: '1',
        OPENROUTER_ACCOUNT_GATES_CONFIRMED: readinessPolicyVersion,
        OPENROUTER_API_KEY: apiKey,
        OPENROUTER_GIFT_IMAGE_MODEL: pinnedImageModel,
        OPENROUTER_GIFT_IMAGE_PROVIDER: 'google-vertex/global',
        OPENROUTER_GIFT_IMAGE_TIMEOUT_MS: '120000',
        OPENROUTER_GIFT_INVENTORY_MODEL: pinnedModel,
        OPENROUTER_GIFT_PRIMARY_MODEL: pinnedModel,
        OPENROUTER_GIFT_TIMEOUT_MS: '120000',
        PUBLIC_SITE_URL: 'https://saberistic.com',
        SITE_URL: 'https://saberistic-web-staging.onrender.com',
      })
      const job: GiftInventoryJob = {
        attempts: 1,
        budget,
        id: `live-${randomUUID()}`,
        jobKey: `gift-discover-live-${randomUUID()}`,
        kind: 'discover',
        maxAttempts: 4,
        productId: null,
        theme,
      }
      const { database, getStoredProduct, query, release } = liveInventoryDatabase()
      const openRouterCostsUsd: number[] = []
      const openRouterModels: string[] = []
      const openRouterDiagnostics: unknown[] = []
      const outboundURLs: string[] = []

      let result
      try {
        result = await processGiftInventoryJob(database, config, job, async (input, init) => {
          const url = requestURL(input)
          outboundURLs.push(url.toString())
          const response = await fetch(input, init)
          if (url.toString() === openRouterChatURL || url.toString() === openRouterImagesURL) {
            const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : null
            if (
              typeof body !== 'object' ||
              body === null ||
              !('model' in body) ||
              typeof body.model !== 'string'
            ) {
              throw new Error('live_openrouter_request_body_invalid')
            }
            openRouterModels.push(body.model)
            const errorPayload = !response.ok
              ? ((await response
                  .clone()
                  .json()
                  .catch(() => null)) as Record<string, unknown> | null)
              : null
            const providerError =
              errorPayload?.error && typeof errorPayload.error === 'object'
                ? (errorPayload.error as Record<string, unknown>)
                : null
            const successPayload = response.ok
              ? ((await response
                  .clone()
                  .json()
                  .catch(() => null)) as Record<string, unknown> | null)
              : null
            const usage =
              successPayload?.usage && typeof successPayload.usage === 'object'
                ? (successPayload.usage as Record<string, unknown>)
                : null
            const costUsd =
              typeof usage?.cost === 'number' &&
              Number.isFinite(usage.cost) &&
              usage.cost >= 0 &&
              usage.cost <= 10
                ? usage.cost
                : null
            if (costUsd !== null) openRouterCostsUsd.push(costUsd)
            openRouterDiagnostics.push({
              costUsd,
              endpoint: url.pathname,
              errorCode:
                typeof providerError?.code === 'number' || typeof providerError?.code === 'string'
                  ? providerError.code
                  : null,
              model: body.model,
              status: response.status,
            })
          }
          return response
        })
      } catch (error) {
        throw new Error(
          `gift_inventory_live_canary_failed:${error instanceof Error ? error.message : 'unknown'}:${JSON.stringify(openRouterDiagnostics)}`,
        )
      }

      const stored = getStoredProduct()
      expect(result).toEqual({ inserted: true, outcome: 'discovered' })
      expect(stored).not.toBeNull()
      if (!stored) throw new Error('live_inventory_product_was_not_recorded')

      expect(stored).toMatchObject({
        category: expect.stringMatching(/^.{2,50}$/),
        id: expect.stringMatching(/^gift-[a-f0-9]{32}$/),
        name: expect.stringMatching(/^.{3,120}$/),
        suggestedPriceCents: expect.any(Number),
        conceptDescription: expect.stringMatching(/^.{20,800}$/),
        sourceUrl: expect.stringMatching(
          /^https:\/\/saberistic\.com\/gifts\/\?concept=gift-[a-f0-9]{32}$/,
        ),
        themes: expect.arrayContaining([theme]),
        whyItFits: expect.stringMatching(/^.{20,280}$/),
      })
      expect(stored.suggestedPriceCents).toBeGreaterThanOrEqual(giftBudgetById(budget).minimumCents)
      expect(stored.suggestedPriceCents).toBeLessThanOrEqual(giftBudgetById(budget).maximumCents)
      expect(stored.artworkUrl).toBe(`https://saberistic.com/api/gifts/artwork/${stored.id}`)
      expect(stored.cachedImageWebp.byteLength).toBeGreaterThan(0)
      expect(stored.cachedImageWebp.subarray(0, 4).toString('ascii')).toBe('RIFF')
      expect(stored.cachedImageWebp.subarray(8, 12).toString('ascii')).toBe('WEBP')
      expect(stored.cachedImageSha256).toBe(
        createHash('sha256').update(stored.cachedImageWebp).digest('hex'),
      )
      expect(openRouterModels).toEqual([pinnedModel, pinnedImageModel])
      expect(outboundURLs).toEqual([openRouterChatURL, openRouterImagesURL])
      expect(query).toHaveBeenCalledWith('COMMIT')
      expect(release).toHaveBeenCalledOnce()

      process.stdout.write(
        `${JSON.stringify({
          budget,
          cachedImageBytes: stored.cachedImageWebp.byteLength,
          event: 'gift_inventory_openrouter_live_smoke_succeeded',
          openRouterCalls: openRouterModels.length,
          providerCostUsd: Number(
            openRouterCostsUsd.reduce((sum, cost) => sum + cost, 0).toFixed(6),
          ),
          suggestedPriceCents: stored.suggestedPriceCents,
          theme,
        })}\n`,
      )
    },
    240_000,
  )
})
