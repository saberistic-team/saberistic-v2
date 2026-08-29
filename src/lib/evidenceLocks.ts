import { createHash } from 'node:crypto'

import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import type { PayloadRequest } from 'payload'

export type EvidenceLockMode = 'exclusive' | 'shared'

const lockNamespace = 'saberistic:evidence:v1\0'

const canonicalEvidenceID = (id: number | string): string => String(id)

export const evidenceAdvisoryLockKey = (id: number | string): bigint =>
  createHash('sha256')
    .update(lockNamespace, 'utf8')
    .update(canonicalEvidenceID(id), 'utf8')
    .digest()
    .readBigInt64BE(0)

const sortedEvidenceIDs = (ids: Iterable<number | string>): string[] =>
  [...new Set([...ids].map(canonicalEvidenceID))].sort((left, right) =>
    left < right ? -1 : left > right ? 1 : 0,
  )

const transactionFor = async (req: Pick<PayloadRequest, 'payload' | 'transactionID'>) => {
  const database = req.payload.db as unknown as PostgresAdapter

  if (database.packageName !== '@payloadcms/db-postgres') {
    throw new Error('Evidence integrity locks require the PostgreSQL database adapter.')
  }

  const transactionID = await req.transactionID

  if (transactionID === undefined || transactionID === null || transactionID === '') {
    throw new Error('Evidence validation requires an active database transaction.')
  }

  const transaction = database.sessions?.[String(transactionID)]?.db

  if (!transaction) {
    throw new Error('Evidence validation could not access its database transaction.')
  }

  return { database, transaction }
}

/**
 * Serializes evidence publication and mutation checks on the request's exact
 * PostgreSQL transaction connection. IDs are sorted before acquisition so a
 * document with multiple sources cannot deadlock with another document that
 * references the same sources in a different order.
 */
export const lockEvidenceSources = async (
  req: Pick<PayloadRequest, 'payload' | 'transactionID'>,
  ids: Iterable<number | string>,
  mode: EvidenceLockMode,
): Promise<void> => {
  const sortedIDs = sortedEvidenceIDs(ids)
  if (sortedIDs.length === 0) return

  const { database, transaction } = await transactionFor(req)

  for (const id of sortedIDs) {
    const key = evidenceAdvisoryLockKey(id).toString()

    if (mode === 'shared') {
      await database.execute({
        db: transaction,
        sql: sql`SELECT pg_advisory_xact_lock_shared(${key}::bigint) AS evidence_lock`,
      })
    } else {
      await database.execute({
        db: transaction,
        sql: sql`SELECT pg_advisory_xact_lock(${key}::bigint) AS evidence_lock`,
      })
    }
  }
}
