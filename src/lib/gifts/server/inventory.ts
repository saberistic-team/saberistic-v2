import 'server-only'

import { createHash, randomUUID } from 'node:crypto'

import { Pool, type PoolClient, type QueryResultRow } from 'pg'

import {
  giftBudgetById,
  giftThemeIds,
  type GiftBudgetId,
  type GiftThemeId,
  type GiftPaymentStatus,
} from '../types'
import { giftSourceIdentityURL, normalizeGiftProductName } from '../validation'

const maximumArtworkBytes = 1_500_000
const maximumDealSize = 9
const maximumAvailableInventory = 54
const minimumAvailableInventory = 18
const maximumReplenishJobsPerPass = 18
const maximumDiscoveryJobsPerDay = 48
const maximumDiscoveryJobsPerTargetPerDay = 18
const generatedDiscoveryJobPrefix = 'gift-concept-'
const minimumReservationTtlSeconds = 60
const maximumReservationTtlSeconds = 7_200
const pendingPaymentReservationTtlSeconds = 7 * 24 * 60 * 60
const staleInventoryGraceDays = 30

const inventoryIdPattern = /^[a-z0-9][a-z0-9_-]{7,119}$/
const reservationIdPattern = /^[A-Za-z0-9_-]{16,96}$/
const stripeSessionIdPattern = /^cs_(?:test_|live_)?[A-Za-z0-9]{10,255}$/

export type GiftInventoryStatus = 'available' | 'reserved' | 'sold'
export type GiftInventoryValidationStatus = 'invalid' | 'pending' | 'stale' | 'valid'
export type GiftInventoryTheme = Exclude<GiftThemeId, 'mixed'>

export type GiftInventoryItem = {
  artworkUrl: string
  category: string
  checkedAt: string
  contributionAmountCents: number
  createdAt: string
  currency: 'usd'
  id: string
  name: string
  observedPriceCents: number
  originalImageUrl: string
  productDescription: string
  retailer: string
  sourceUrl: string
  status: GiftInventoryStatus
  themes: GiftInventoryTheme[]
  validationStatus: GiftInventoryValidationStatus
  whyItFits: string
}

export type GiftInventoryImmutableFields = {
  category: string
  currency: 'usd'
  name: string
  observedPriceCents: number
  retailer: string
  sourceUrl: string
}

export type GiftInventoryArtwork = { bytes: Uint8Array; sha256: string }

export type GiftInventorySqlResult<Row extends QueryResultRow = QueryResultRow> = {
  rowCount: number | null
  rows: Row[]
}

export type GiftInventoryConnection = {
  query: <Row extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: readonly unknown[],
  ) => Promise<GiftInventorySqlResult<Row>>
  release: () => void
}

export type GiftInventoryDatabase = {
  connect: () => Promise<GiftInventoryConnection>
  end: () => Promise<void>
  query: <Row extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: readonly unknown[],
  ) => Promise<GiftInventorySqlResult<Row>>
}

type InventoryRow = QueryResultRow & {
  category: string
  checked_at: Date | string
  created_at: Date | string
  currency: string
  id: string
  name: string
  observed_price_cents: number | string
  original_image_url: string
  product_description: string
  retailer: string
  source_url: string
  status: string
  theme_ids: string[]
  validation_status: string
  why_it_fits: string
}

type CountRow = QueryResultRow & { count: number | string }
type DiscoveryWindowRow = QueryResultRow & {
  global_count: number | string
  target_count: number | string
}

function wrapClient(client: PoolClient): GiftInventoryConnection {
  return {
    query: async <Row extends QueryResultRow = QueryResultRow>(
      text: string,
      values: readonly unknown[] = [],
    ) => client.query<Row>(text, [...values]),
    release: () => client.release(),
  }
}

export function createGiftInventoryDatabase(
  connectionString: string,
  options: { applicationName?: string; maximumConnections?: number } = {},
): GiftInventoryDatabase {
  const configuredURL = connectionString.trim()
  if (!configuredURL || !/^postgres(?:ql)?:\/\//i.test(configuredURL)) {
    throw new Error('gift_inventory_database_url_invalid')
  }

  const pool = new Pool({
    application_name: options.applicationName ?? 'saberistic-gift-inventory',
    connectionTimeoutMillis: 5_000,
    connectionString: configuredURL,
    idleTimeoutMillis: 30_000,
    max: Math.max(1, Math.min(options.maximumConnections ?? 4, 10)),
    query_timeout: 6_000,
    statement_timeout: 5_000,
  })

  return {
    connect: async () => wrapClient(await pool.connect()),
    end: () => pool.end(),
    query: async <Row extends QueryResultRow = QueryResultRow>(
      text: string,
      values: readonly unknown[] = [],
    ) => pool.query<Row>(text, [...values]),
  }
}

const globalInventory = globalThis as typeof globalThis & {
  saberisticGiftInventoryDatabase?: GiftInventoryDatabase
}

export function getGiftInventoryDatabase(): GiftInventoryDatabase {
  if (globalInventory.saberisticGiftInventoryDatabase) {
    return globalInventory.saberisticGiftInventoryDatabase
  }
  const database = createGiftInventoryDatabase(process.env.DATABASE_URL ?? '')
  globalInventory.saberisticGiftInventoryDatabase = database
  return database
}

async function inTransaction<T>(
  database: GiftInventoryDatabase,
  operation: (connection: GiftInventoryConnection) => Promise<T>,
): Promise<T> {
  const connection = await database.connect()
  try {
    await connection.query('BEGIN')
    const result = await operation(connection)
    await connection.query('COMMIT')
    return result
  } catch (error) {
    try {
      await connection.query('ROLLBACK')
    } catch {
      // Preserve the original database error.
    }
    throw error
  } finally {
    connection.release()
  }
}

function safeCount(value: number | string | undefined): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0
}

function isoTimestamp(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error('gift_inventory_row_invalid')
  return date.toISOString()
}

function isTheme(value: string): value is GiftInventoryTheme {
  return value !== 'mixed' && giftThemeIds.some((theme) => theme === value)
}

function mapInventoryRow(row: InventoryRow): GiftInventoryItem {
  const price = Number(row.observed_price_cents)
  const themes = Array.isArray(row.theme_ids) ? row.theme_ids.filter(isTheme) : []
  if (
    !inventoryIdPattern.test(row.id) ||
    !['available', 'reserved', 'sold'].includes(row.status) ||
    !['invalid', 'pending', 'stale', 'valid'].includes(row.validation_status) ||
    row.currency !== 'usd' ||
    !Number.isSafeInteger(price) ||
    price < 1_000 ||
    price > 30_000 ||
    themes.length === 0
  ) {
    throw new Error('gift_inventory_row_invalid')
  }

  return {
    artworkUrl: `/api/gifts/artwork/${encodeURIComponent(row.id)}`,
    category: row.category,
    checkedAt: isoTimestamp(row.checked_at),
    contributionAmountCents: price,
    createdAt: isoTimestamp(row.created_at),
    currency: 'usd',
    id: row.id,
    name: row.name,
    observedPriceCents: price,
    originalImageUrl: row.original_image_url,
    productDescription: row.product_description,
    retailer: row.retailer,
    sourceUrl: row.source_url,
    status: row.status as GiftInventoryStatus,
    themes,
    validationStatus: row.validation_status as GiftInventoryValidationStatus,
    whyItFits: row.why_it_fits,
  }
}

function inventoryMetadataSelect(): string {
  return 'id, name, category, why_it_fits, product_description, retailer, source_url, original_image_url, observed_price_cents, currency, theme_ids, status, validation_status, checked_at, created_at'
}

export function reservationFingerprint(reservationId: string): string {
  if (!reservationIdPattern.test(reservationId)) {
    throw new Error('gift_inventory_reservation_id_invalid')
  }
  return createHash('sha256').update(`gift-reservation-v1:${reservationId}`).digest('hex')
}

export function discoveryFingerprint(sourceUrl: string): string {
  const identity = giftSourceIdentityURL(sourceUrl)
  if (!identity) {
    throw new Error('gift_inventory_source_url_invalid')
  }
  return createHash('sha256').update(`gift-discovery-v1:${identity}`).digest('hex')
}

function distinctGiftInventoryNames(items: readonly GiftInventoryItem[]): GiftInventoryItem[] {
  const identities = new Set<string>()
  return items.filter((item) => {
    const identity = normalizeGiftProductName(item.name)
    if (!identity || identities.has(identity)) return false
    identities.add(identity)
    return true
  })
}

function validatedInventoryId(id: string): string {
  if (!inventoryIdPattern.test(id)) throw new Error('gift_inventory_id_invalid')
  return id
}

export function isWebP(bytes: Uint8Array): boolean {
  return (
    bytes.byteLength >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
}

/** Empty and idempotent: generated concepts enter through the inventory worker only. */
export async function bootstrapGiftInventory(database: GiftInventoryDatabase): Promise<number> {
  return inTransaction(database, async (connection) => {
    await connection.query(
      "SELECT pg_advisory_xact_lock(hashtext('saberistic-gift-inventory-bootstrap'))",
    )
    return 0
  })
}

export async function releaseExpiredGiftReservations(
  database: GiftInventoryDatabase,
): Promise<number> {
  const result = await database.query(
    `UPDATE gift_inventory
     SET status = 'available', reservation_key = NULL, reservation_expires_at = NULL,
         stripe_checkout_session_id = NULL, updated_at = now()
     WHERE status = 'reserved' AND reservation_expires_at <= now()
       AND stripe_checkout_session_id IS NULL`,
  )
  return result.rowCount ?? 0
}

export async function countAvailableGiftInventory(
  database: GiftInventoryDatabase,
): Promise<number> {
  return inTransaction(database, async (connection) => {
    await connection.query(
      `UPDATE gift_inventory
       SET status = 'available', reservation_key = NULL, reservation_expires_at = NULL,
           stripe_checkout_session_id = NULL, updated_at = now()
       WHERE status = 'reserved' AND reservation_expires_at <= now()
         AND stripe_checkout_session_id IS NULL`,
    )
    const result = await connection.query<CountRow>(
      `SELECT count(DISTINCT normalized_name)::integer AS count
       FROM gift_inventory
       WHERE status = 'available'
         AND retailer = 'Saberistic AI concept'
         AND cached_image_webp IS NOT NULL
         AND (
           validation_status = 'valid'
           OR (validation_status = 'pending' AND validation_expires_at > now())
           OR (validation_status = 'stale'
             AND checked_at > now() - (${staleInventoryGraceDays} * interval '1 day'))
         )`,
    )
    return safeCount(result.rows[0]?.count)
  })
}

type ReadinessRow = QueryResultRow & {
  high_count: number | string
  low_count: number | string
  lower_middle_count: number | string
  upper_middle_count: number | string
}

/** True only when every selectable price lane can deal a complete nine-item game. */
export async function isGiftInventoryReady(database: GiftInventoryDatabase): Promise<boolean> {
  await releaseExpiredGiftReservations(database)
  const result = await database.query<ReadinessRow>(
    `SELECT
       count(DISTINCT normalized_name) FILTER (WHERE observed_price_cents BETWEEN 1000 AND 3000)::integer AS low_count,
       count(DISTINCT normalized_name) FILTER (WHERE observed_price_cents BETWEEN 3000 AND 7500)::integer AS lower_middle_count,
       count(DISTINCT normalized_name) FILTER (WHERE observed_price_cents BETWEEN 7500 AND 15000)::integer AS upper_middle_count,
       count(DISTINCT normalized_name) FILTER (WHERE observed_price_cents BETWEEN 15000 AND 30000)::integer AS high_count
     FROM gift_inventory
     WHERE status = 'available'
       AND retailer = 'Saberistic AI concept'
       AND cached_image_webp IS NOT NULL
       AND (
         validation_status = 'valid'
         OR (validation_status = 'pending' AND validation_expires_at > now())
         OR (validation_status = 'stale'
           AND checked_at > now() - (${staleInventoryGraceDays} * interval '1 day'))
       )`,
  )
  const row = result.rows[0]
  return Boolean(
    row &&
    safeCount(row.low_count) >= maximumDealSize &&
    safeCount(row.lower_middle_count) >= maximumDealSize &&
    safeCount(row.upper_middle_count) >= maximumDealSize &&
    safeCount(row.high_count) >= maximumDealSize,
  )
}

export async function dealAvailableGiftItems(
  database: GiftInventoryDatabase,
  options: { budget: GiftBudgetId; limit?: number; seed: string; theme: GiftThemeId },
): Promise<GiftInventoryItem[]> {
  const limit = Math.max(1, Math.min(Math.floor(options.limit ?? maximumDealSize), maximumDealSize))
  const budget = giftBudgetById(options.budget)
  const seed = createHash('sha256').update(options.seed.slice(0, 512)).digest('hex')
  const theme = options.theme === 'mixed' ? null : options.theme

  return inTransaction(database, async (connection) => {
    await connection.query(
      `UPDATE gift_inventory
       SET status = 'available', reservation_key = NULL, reservation_expires_at = NULL,
           stripe_checkout_session_id = NULL, updated_at = now()
       WHERE status = 'reserved' AND reservation_expires_at <= now()
         AND stripe_checkout_session_id IS NULL`,
    )
    const result = await connection.query<InventoryRow>(
      `SELECT ${inventoryMetadataSelect()}
       FROM gift_inventory
       WHERE status = 'available'
         AND retailer = 'Saberistic AI concept'
         AND cached_image_webp IS NOT NULL
         AND observed_price_cents BETWEEN $2 AND $3
         AND (
           validation_status = 'valid'
           OR (validation_status = 'pending' AND validation_expires_at > now())
           OR (validation_status = 'stale'
             AND checked_at > now() - (${staleInventoryGraceDays} * interval '1 day'))
         )
       ORDER BY
         CASE WHEN $4::text IS NULL OR $4 = ANY(theme_ids) THEN 0 ELSE 1 END,
         md5(id || $1), id
       LIMIT $5`,
      [seed, budget.minimumCents, budget.maximumCents, theme, maximumAvailableInventory],
    )
    const items = distinctGiftInventoryNames(result.rows.map(mapInventoryRow))
    if (options.budget !== 'mixed') return items.slice(0, limit)

    const band = (item: GiftInventoryItem): 'high' | 'low' | 'middle' => {
      if (item.observedPriceCents < 5_000) return 'low'
      if (item.observedPriceCents < 15_000) return 'middle'
      return 'high'
    }
    const selected = ['low', 'middle', 'high']
      .map((wanted) => items.find((item) => band(item) === wanted))
      .filter((item): item is GiftInventoryItem => Boolean(item))
    const selectedIds = new Set(selected.map((item) => item.id))
    return [...selected, ...items.filter((item) => !selectedIds.has(item.id))].slice(0, limit)
  })
}

export async function reserveGiftInventoryItem(
  database: GiftInventoryDatabase,
  input: {
    expected: GiftInventoryImmutableFields
    offerId: string
    reservationId: string
    ttlSeconds: number
  },
): Promise<GiftInventoryItem | null> {
  const offerId = validatedInventoryId(input.offerId)
  const key = reservationFingerprint(input.reservationId)
  const ttlSeconds = Math.floor(input.ttlSeconds)
  if (ttlSeconds < minimumReservationTtlSeconds || ttlSeconds > maximumReservationTtlSeconds) {
    throw new Error('gift_inventory_reservation_ttl_invalid')
  }

  const result = await database.query<InventoryRow>(
    `UPDATE gift_inventory
     SET status = 'reserved', reservation_key = $2,
         reservation_expires_at = now() + ($3 * interval '1 second'), updated_at = now()
     WHERE id = $1
       AND retailer = 'Saberistic AI concept'
       AND name = $4 AND category = $5 AND retailer = $6 AND source_url = $7
       AND observed_price_cents = $8 AND currency = $9
       AND (
         status = 'available'
         OR (status = 'reserved' AND reservation_expires_at <= now()
           AND stripe_checkout_session_id IS NULL)
         OR (status = 'reserved' AND reservation_key = $2)
       )
     RETURNING ${inventoryMetadataSelect()}`,
    [
      offerId,
      key,
      ttlSeconds,
      input.expected.name,
      input.expected.category,
      input.expected.retailer,
      input.expected.sourceUrl,
      input.expected.observedPriceCents,
      input.expected.currency,
    ],
  )
  return result.rows[0] ? mapInventoryRow(result.rows[0]) : null
}

export async function attachGiftInventoryStripeSession(
  database: GiftInventoryDatabase,
  input: { offerId: string; reservationId: string; stripeCheckoutSessionId: string },
): Promise<boolean> {
  if (!stripeSessionIdPattern.test(input.stripeCheckoutSessionId)) {
    throw new Error('gift_inventory_stripe_session_invalid')
  }
  const result = await database.query(
    `UPDATE gift_inventory
     SET stripe_checkout_session_id = $3, updated_at = now()
     WHERE id = $1 AND status = 'reserved' AND reservation_key = $2
       AND reservation_expires_at > now()
       AND (stripe_checkout_session_id IS NULL OR stripe_checkout_session_id = $3)`,
    [
      validatedInventoryId(input.offerId),
      reservationFingerprint(input.reservationId),
      input.stripeCheckoutSessionId,
    ],
  )
  return (result.rowCount ?? 0) > 0
}

export async function releaseGiftInventoryReservation(
  database: GiftInventoryDatabase,
  input: { offerId: string; reservationId: string },
): Promise<boolean> {
  const result = await database.query(
    `UPDATE gift_inventory
     SET status = 'available', reservation_key = NULL, reservation_expires_at = NULL,
         stripe_checkout_session_id = NULL, updated_at = now()
     WHERE id = $1
       AND (status = 'available' OR (status = 'reserved' AND reservation_key = $2))`,
    [validatedInventoryId(input.offerId), reservationFingerprint(input.reservationId)],
  )
  return (result.rowCount ?? 0) > 0
}

export async function releaseGiftInventoryAfterDefinitiveCheckoutFailure(
  database: GiftInventoryDatabase,
  input: { offerId: string; reservationId: string },
): Promise<boolean> {
  const result = await database.query(
    `UPDATE gift_inventory
     SET status = 'available', reservation_key = NULL, reservation_expires_at = NULL,
         stripe_checkout_session_id = NULL, updated_at = now()
     WHERE id = $1 AND status = 'reserved' AND reservation_key = $2
       AND stripe_checkout_session_id IS NULL`,
    [validatedInventoryId(input.offerId), reservationFingerprint(input.reservationId)],
  )
  return (result.rowCount ?? 0) > 0
}

export async function markGiftInventorySold(
  database: GiftInventoryDatabase,
  input: { offerId: string; reservationId: string },
): Promise<boolean> {
  const result = await database.query(
    `UPDATE gift_inventory
     SET status = 'sold', reservation_expires_at = NULL,
         sold_at = COALESCE(sold_at, now()), updated_at = now()
     WHERE id = $1 AND reservation_key = $2 AND status IN ('reserved', 'sold')`,
    [validatedInventoryId(input.offerId), reservationFingerprint(input.reservationId)],
  )
  return (result.rowCount ?? 0) > 0
}

export async function keepGiftInventoryReservationPending(
  database: GiftInventoryDatabase,
  input: { offerId: string; reservationId: string },
): Promise<boolean> {
  const result = await database.query(
    `UPDATE gift_inventory
     SET reservation_expires_at = GREATEST(
       reservation_expires_at,
       now() + ($3 * interval '1 second')
     ), updated_at = now()
     WHERE id = $1 AND reservation_key = $2 AND status = 'reserved'`,
    [
      validatedInventoryId(input.offerId),
      reservationFingerprint(input.reservationId),
      pendingPaymentReservationTtlSeconds,
    ],
  )
  return (result.rowCount ?? 0) > 0
}

export async function transitionGiftInventoryFromPaymentStatus(
  database: GiftInventoryDatabase,
  input: { offerId: string; paymentStatus: GiftPaymentStatus; reservationId: string },
): Promise<'released' | 'reserved' | 'sold' | 'unchanged'> {
  if (['paid', 'partially_refunded', 'refunded'].includes(input.paymentStatus)) {
    return (await markGiftInventorySold(database, input)) ? 'sold' : 'unchanged'
  }
  if (['failed', 'expired'].includes(input.paymentStatus)) {
    return (await releaseGiftInventoryReservation(database, input)) ? 'released' : 'unchanged'
  }
  if (input.paymentStatus === 'pending') {
    return (await keepGiftInventoryReservationPending(database, input)) ? 'reserved' : 'unchanged'
  }
  return 'unchanged'
}

export async function getGiftInventoryArtwork(
  database: GiftInventoryDatabase,
  id: string,
): Promise<GiftInventoryArtwork | null> {
  const result = await database.query<
    QueryResultRow & { cached_image_sha256: string | null; cached_image_webp: Buffer | null }
  >(
    `SELECT cached_image_webp, cached_image_sha256 FROM gift_inventory
     WHERE id = $1 AND cached_image_webp IS NOT NULL`,
    [validatedInventoryId(id)],
  )
  const bytes = result.rows[0]?.cached_image_webp
  if (!bytes) return null
  if (bytes.byteLength > maximumArtworkBytes || !isWebP(bytes)) {
    throw new Error('gift_inventory_artwork_invalid')
  }
  const sha256 = result.rows[0]?.cached_image_sha256
  if (
    !sha256 ||
    !/^[a-f0-9]{64}$/.test(sha256) ||
    createHash('sha256').update(bytes).digest('hex') !== sha256
  ) {
    throw new Error('gift_inventory_artwork_invalid')
  }
  return { bytes: new Uint8Array(bytes), sha256 }
}

export async function enqueueGiftInventoryReplenishment(
  database: GiftInventoryDatabase,
  options: {
    budget: GiftBudgetId
    dailyDiscoveryLimit?: number
    maximumAvailable?: number
    minimumAvailable?: number
    randomId?: () => string
    theme: GiftThemeId
  },
): Promise<number> {
  const minimumAvailable = Math.max(
    maximumDealSize,
    Math.min(options.minimumAvailable ?? minimumAvailableInventory, maximumAvailableInventory),
  )
  const maximumAvailable = Math.max(
    minimumAvailable,
    Math.min(options.maximumAvailable ?? maximumAvailableInventory, maximumAvailableInventory),
  )
  const createId = options.randomId ?? randomUUID
  const environmentDailyLimit = Number(process.env.GIFT_INVENTORY_DAILY_DISCOVERY_LIMIT)
  const dailyDiscoveryLimit = Math.max(
    maximumDealSize,
    Math.min(
      Math.floor(
        options.dailyDiscoveryLimit ??
          (Number.isSafeInteger(environmentDailyLimit)
            ? environmentDailyLimit
            : maximumDiscoveryJobsPerDay),
      ),
      200,
    ),
  )
  const budget = giftBudgetById(options.budget)
  const theme = options.theme === 'mixed' ? null : options.theme

  return inTransaction(database, async (connection) => {
    await connection.query(
      "SELECT pg_advisory_xact_lock(hashtext('saberistic-gift-inventory-replenish'))",
    )
    await connection.query(
      `UPDATE gift_inventory
       SET status = 'available', reservation_key = NULL, reservation_expires_at = NULL,
           stripe_checkout_session_id = NULL, updated_at = now()
       WHERE status = 'reserved' AND reservation_expires_at <= now()
         AND stripe_checkout_session_id IS NULL`,
    )
    const inventory = await connection.query<CountRow>(
      `SELECT count(DISTINCT normalized_name)::integer AS count FROM gift_inventory
       WHERE status = 'available' AND cached_image_webp IS NOT NULL
         AND retailer = 'Saberistic AI concept'
         AND observed_price_cents BETWEEN $1 AND $2
         AND ($3::text IS NULL OR $3 = ANY(theme_ids))
         AND (validation_status = 'valid'
           OR (validation_status = 'pending' AND validation_expires_at > now())
           OR (validation_status = 'stale'
             AND checked_at > now() - (${staleInventoryGraceDays} * interval '1 day')))`,
      [budget.minimumCents, budget.maximumCents, theme],
    )
    const jobs = await connection.query<CountRow>(
      `SELECT count(*)::integer AS count FROM gift_inventory_jobs
       WHERE kind = 'discover' AND status IN ('queued', 'running')
         AND job_key LIKE 'gift-concept-%'
         AND budget_id = $1 AND theme_id = $2`,
      [options.budget, options.theme],
    )
    const globalInventory = await connection.query<CountRow>(
      `SELECT count(DISTINCT normalized_name)::integer AS count FROM gift_inventory
       WHERE status = 'available' AND cached_image_webp IS NOT NULL
         AND retailer = 'Saberistic AI concept'
         AND (validation_status = 'valid'
           OR (validation_status = 'pending' AND validation_expires_at > now())
           OR (validation_status = 'stale'
             AND checked_at > now() - (${staleInventoryGraceDays} * interval '1 day')))`,
    )
    const globalJobs = await connection.query<CountRow>(
      `SELECT count(*)::integer AS count FROM gift_inventory_jobs
       WHERE kind = 'discover' AND status IN ('queued', 'running')
         AND job_key LIKE 'gift-concept-%'`,
    )
    const recentDiscoveries = await connection.query<DiscoveryWindowRow>(
      `SELECT
         count(*)::integer AS global_count,
         count(*) FILTER (WHERE budget_id = $1 AND theme_id = $2)::integer AS target_count
       FROM gift_inventory_jobs
       WHERE kind = 'discover'
         AND job_key LIKE 'gift-concept-%'
         AND created_at >= now() - interval '24 hours'`,
      [options.budget, options.theme],
    )
    const eligible = Math.min(safeCount(inventory.rows[0]?.count), maximumAvailable)
    const activeJobs = safeCount(jobs.rows[0]?.count)
    const globalEligible = safeCount(globalInventory.rows[0]?.count)
    const globalActiveJobs = safeCount(globalJobs.rows[0]?.count)
    const recentGlobal = safeCount(recentDiscoveries.rows[0]?.global_count)
    const recentTarget = safeCount(recentDiscoveries.rows[0]?.target_count)
    const toQueue = Math.min(
      Math.max(0, minimumAvailable - eligible - activeJobs),
      maximumReplenishJobsPerPass,
      Math.max(0, maximumAvailable - globalEligible - globalActiveJobs),
      Math.max(0, dailyDiscoveryLimit - recentGlobal),
      Math.max(
        0,
        Math.min(maximumDiscoveryJobsPerTargetPerDay, dailyDiscoveryLimit) - recentTarget,
      ),
    )

    const jobKeys = Array.from(
      { length: toQueue },
      () => `${generatedDiscoveryJobPrefix}${createId()}`,
    )
    for (const jobKey of jobKeys) {
      if (!/^gift-concept-[A-Za-z0-9_-]{8,160}$/.test(jobKey)) {
        throw new Error('gift_inventory_job_key_invalid')
      }
    }
    if (jobKeys.length === 0) return 0
    const inserted = await connection.query(
      `INSERT INTO gift_inventory_jobs
         (job_key, kind, budget_id, theme_id, status, max_attempts)
       SELECT requested.job_key, 'discover', $2, $3, 'queued', 4
       FROM unnest($1::text[]) AS requested(job_key)
       ON CONFLICT (job_key) DO NOTHING`,
      [jobKeys, options.budget, options.theme],
    )
    return inserted.rowCount ?? 0
  })
}

export async function enqueueDueGiftInventoryRevalidation(
  database: GiftInventoryDatabase,
  options: { limit?: number; randomId?: () => string } = {},
): Promise<number> {
  const limit = Math.max(1, Math.min(Math.floor(options.limit ?? 12), 54))
  const createId = options.randomId ?? randomUUID
  return inTransaction(database, async (connection) => {
    await connection.query(
      "SELECT pg_advisory_xact_lock(hashtext('saberistic-gift-inventory-revalidate'))",
    )
    const due = await connection.query<QueryResultRow & { id: string }>(
      `SELECT item.id FROM gift_inventory AS item
       WHERE item.status <> 'sold'
         AND item.cached_image_webp IS NOT NULL
         AND (
           (item.validation_status IN ('valid', 'pending')
             AND item.validation_expires_at <= now())
           OR (item.validation_status = 'stale'
             AND COALESCE(item.last_validation_attempt_at, item.checked_at)
               <= now() - interval '24 hours')
         )
         AND NOT EXISTS (
           SELECT 1 FROM gift_inventory_jobs AS job
           WHERE job.product_id = item.id AND job.kind = 'validate'
             AND job.status IN ('queued', 'running')
         )
       ORDER BY item.checked_at ASC
       FOR UPDATE OF item SKIP LOCKED
       LIMIT $1`,
      [limit],
    )
    const productIds = due.rows.map((row) => validatedInventoryId(row.id))
    const jobKeys = productIds.map(() => `gift-validate-${createId()}`)
    for (const jobKey of jobKeys) {
      if (!/^gift-validate-[A-Za-z0-9_-]{8,160}$/.test(jobKey)) {
        throw new Error('gift_inventory_job_key_invalid')
      }
    }
    if (jobKeys.length === 0) return 0
    const inserted = await connection.query(
      `INSERT INTO gift_inventory_jobs (job_key, kind, product_id, status, max_attempts)
       SELECT requested.job_key, 'validate', requested.product_id, 'queued', 4
       FROM unnest($1::text[], $2::varchar[]) AS requested(job_key, product_id)
       ON CONFLICT (job_key) DO NOTHING`,
      [jobKeys, productIds],
    )
    return inserted.rowCount ?? 0
  })
}

export async function pruneGiftInventoryMaintenance(
  database: GiftInventoryDatabase,
): Promise<{ artworkRowsCleared: number; jobsDeleted: number }> {
  return inTransaction(database, async (connection) => {
    await connection.query(
      "SELECT pg_advisory_xact_lock(hashtext('saberistic-gift-inventory-prune'))",
    )
    const artwork = await connection.query(
      `UPDATE gift_inventory
       SET cached_image_webp = NULL, cached_image_mime = NULL, cached_image_sha256 = NULL,
           updated_at = now()
       WHERE cached_image_webp IS NOT NULL
         AND (
           (status = 'sold' AND sold_at <= now() - interval '30 days')
           OR (validation_status = 'invalid'
             AND COALESCE(last_validation_attempt_at, checked_at)
               <= now() - interval '7 days')
         )`,
    )
    const jobs = await connection.query(
      `DELETE FROM gift_inventory_jobs
       WHERE status IN ('completed', 'failed')
         AND COALESCE(completed_at, updated_at) <= now() - interval '7 days'`,
    )
    return {
      artworkRowsCleared: artwork.rowCount ?? 0,
      jobsDeleted: jobs.rowCount ?? 0,
    }
  })
}

export async function enqueueBestEffortReplenishRequest(
  input: { budget: GiftBudgetId; theme: GiftThemeId },
  database: GiftInventoryDatabase = getGiftInventoryDatabase(),
): Promise<number> {
  try {
    return await enqueueGiftInventoryReplenishment(database, input)
  } catch {
    return 0
  }
}

export const giftInventoryLimits = {
  maximumArtworkBytes,
  maximumAvailableInventory,
  maximumDealSize,
  maximumReservationTtlSeconds,
  minimumAvailableInventory,
  minimumReservationTtlSeconds,
} as const
