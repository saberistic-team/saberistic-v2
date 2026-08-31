import 'server-only'

import { createHash } from 'node:crypto'

import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import configPromise from '@payload-config'
import { getPayload } from 'payload'

import type {
  GiftPaymentCreate,
  GiftPaymentRecord,
  GiftPaymentStore,
  GiftPaymentUpdate,
} from './payments'

type LocalPayload = {
  db: PostgresAdapter
  create: (args: {
    collection: 'gift-payments'
    data: GiftPaymentCreate
    overrideAccess: true
    req?: TransactionRequest
  }) => Promise<unknown>
  find: (args: {
    collection: 'gift-payments'
    depth: 0
    limit: 1
    overrideAccess: true
    pagination: false
    req?: TransactionRequest
    where: { stripeCheckoutSessionId: { equals: string } }
  }) => Promise<{ docs: unknown[] }>
  update: (args: {
    collection: 'gift-payments'
    data: GiftPaymentUpdate
    id: number | string
    overrideAccess: true
    req?: TransactionRequest
  }) => Promise<unknown>
}

type TransactionRequest = {
  payload: LocalPayload
  transactionID: number | string
}

const lockNamespace = 'saberistic:gift-payment:v1\0'

function giftPaymentLockKey(sessionId: string): string {
  return createHash('sha256')
    .update(lockNamespace, 'utf8')
    .update(sessionId, 'utf8')
    .digest()
    .readBigInt64BE(0)
    .toString()
}

function giftPaymentRecord(value: unknown): GiftPaymentRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('gift_payment_record_invalid')
  }
  const record = value as Record<string, unknown>
  if (
    (typeof record.id !== 'string' && typeof record.id !== 'number') ||
    typeof record.stripeCheckoutSessionId !== 'string' ||
    !/^cs_(?:test|live)_[A-Za-z0-9]{16,255}$/.test(record.stripeCheckoutSessionId) ||
    !Array.isArray(record.processedStripeEventIds) ||
    !record.processedStripeEventIds.every((id) => typeof id === 'string')
  ) {
    throw new Error('gift_payment_record_invalid')
  }
  return value as GiftPaymentRecord
}

async function localPayload(): Promise<LocalPayload> {
  return (await getPayload({ config: configPromise })) as unknown as LocalPayload
}

function storeFor(payload: LocalPayload, req?: TransactionRequest): GiftPaymentStore {
  return {
    async create(data) {
      return giftPaymentRecord(
        await payload.create({
          collection: 'gift-payments',
          data,
          overrideAccess: true,
          ...(req ? { req } : {}),
        }),
      )
    },

    async findBySessionId(sessionId) {
      const result = await payload.find({
        collection: 'gift-payments',
        depth: 0,
        limit: 1,
        overrideAccess: true,
        pagination: false,
        ...(req ? { req } : {}),
        where: { stripeCheckoutSessionId: { equals: sessionId } },
      })
      return result.docs[0] ? giftPaymentRecord(result.docs[0]) : null
    },

    async update(id, data) {
      return giftPaymentRecord(
        await payload.update({
          collection: 'gift-payments',
          data,
          id,
          overrideAccess: true,
          ...(req ? { req } : {}),
        }),
      )
    },
  }
}

export const payloadGiftPaymentStore: GiftPaymentStore = {
  async create(data) {
    const payload = await localPayload()
    return giftPaymentRecord(
      await payload.create({
        collection: 'gift-payments',
        data,
        overrideAccess: true,
      }),
    )
  },

  async findBySessionId(sessionId) {
    const payload = await localPayload()
    const result = await payload.find({
      collection: 'gift-payments',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      pagination: false,
      where: { stripeCheckoutSessionId: { equals: sessionId } },
    })
    return result.docs[0] ? giftPaymentRecord(result.docs[0]) : null
  },

  async update(id, data) {
    const payload = await localPayload()
    return giftPaymentRecord(
      await payload.update({
        collection: 'gift-payments',
        data,
        id,
        overrideAccess: true,
      }),
    )
  },

  async runExclusive(sessionId, operation) {
    const payload = await localPayload()
    const database = payload.db
    if (database.packageName !== '@payloadcms/db-postgres') {
      throw new Error('gift_payment_lock_requires_postgres')
    }

    const transactionID = await database.beginTransaction()
    if (transactionID === null) throw new Error('gift_payment_transaction_unavailable')

    try {
      const transaction = database.sessions?.[String(transactionID)]?.db
      if (!transaction) throw new Error('gift_payment_transaction_unavailable')

      const key = giftPaymentLockKey(sessionId)
      await database.execute({
        db: transaction,
        sql: sql`SELECT pg_advisory_xact_lock(${key}::bigint) AS gift_payment_lock`,
      })

      const result = await operation(storeFor(payload, { payload, transactionID }))
      await database.commitTransaction(transactionID)
      return result
    } catch (error) {
      await database.rollbackTransaction(transactionID)
      throw error
    }
  },
}
