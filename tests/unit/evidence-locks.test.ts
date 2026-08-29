import { describe, expect, it, vi } from 'vitest'

import { evidenceAdvisoryLockKey, lockEvidenceSources } from '@/lib/evidenceLocks'

const requestWithTransaction = ({
  execute = vi.fn(async () => ({})),
  packageName = '@payloadcms/db-postgres',
  transactionID = 'evidence-lock-test',
}: {
  execute?: ReturnType<typeof vi.fn>
  packageName?: string
  transactionID?: Promise<string> | string
} = {}) => {
  const transaction = { marker: 'exact-request-transaction' }

  return {
    execute,
    req: {
      payload: {
        db: {
          execute,
          packageName,
          sessions: {
            'evidence-lock-test': { db: transaction },
          },
        },
      },
      transactionID,
    },
    transaction,
  }
}

const lockParameter = (query: unknown): string => {
  const chunks = (query as { queryChunks?: unknown[] }).queryChunks
  if (!Array.isArray(chunks) || typeof chunks[1] !== 'string') {
    throw new Error('Expected a parameterized advisory-lock query.')
  }

  return chunks[1]
}

const lockSQL = (query: unknown): string => {
  const chunks = (query as { queryChunks?: Array<{ value?: string[] }> }).queryChunks
  return chunks?.flatMap((chunk) => chunk.value ?? []).join('') ?? ''
}

describe('evidence advisory locks', () => {
  it('derives stable signed 64-bit keys from canonical evidence IDs', () => {
    expect(evidenceAdvisoryLockKey(42)).toBe(evidenceAdvisoryLockKey('42'))
    expect(evidenceAdvisoryLockKey('42')).not.toBe(evidenceAdvisoryLockKey('43'))
    expect(BigInt.asIntN(64, evidenceAdvisoryLockKey('42'))).toBe(evidenceAdvisoryLockKey('42'))
  })

  it('deduplicates and sorts IDs before taking shared locks on the exact request transaction', async () => {
    const { execute, req, transaction } = requestWithTransaction({
      transactionID: Promise.resolve('evidence-lock-test'),
    })

    await lockEvidenceSources(req as never, ['z', 2, '10', '2'], 'shared')

    expect(execute).toHaveBeenCalledTimes(3)
    expect(execute.mock.calls.map(([args]) => lockParameter(args.sql))).toEqual(
      ['10', '2', 'z'].map((id) => evidenceAdvisoryLockKey(id).toString()),
    )
    expect(execute.mock.calls.map(([args]) => lockSQL(args.sql))).toEqual([
      'SELECT pg_advisory_xact_lock_shared(::bigint) AS evidence_lock',
      'SELECT pg_advisory_xact_lock_shared(::bigint) AS evidence_lock',
      'SELECT pg_advisory_xact_lock_shared(::bigint) AS evidence_lock',
    ])
    expect(execute.mock.calls.every(([args]) => args.db === transaction)).toBe(true)
  })

  it('uses exclusive transaction locks for evidence mutations', async () => {
    const { execute, req } = requestWithTransaction()

    await lockEvidenceSources(req as never, ['evidence-1'], 'exclusive')

    expect(lockSQL(execute.mock.calls[0]?.[0].sql)).toBe(
      'SELECT pg_advisory_xact_lock(::bigint) AS evidence_lock',
    )
  })

  it('fails closed without PostgreSQL, an active request transaction, or its exact session', async () => {
    const wrongAdapter = requestWithTransaction({ packageName: '@payloadcms/db-sqlite' })
    await expect(
      lockEvidenceSources(wrongAdapter.req as never, ['evidence-1'], 'shared'),
    ).rejects.toThrow('require the PostgreSQL database adapter')

    const missingTransaction = requestWithTransaction({ transactionID: '' })
    await expect(
      lockEvidenceSources(missingTransaction.req as never, ['evidence-1'], 'shared'),
    ).rejects.toThrow('active database transaction')

    const missingSession = requestWithTransaction({ transactionID: 'unknown-transaction' })
    await expect(
      lockEvidenceSources(missingSession.req as never, ['evidence-1'], 'exclusive'),
    ).rejects.toThrow('could not access its database transaction')
  })

  it('propagates lock acquisition failures before validation can continue', async () => {
    const execute = vi.fn(async () => {
      throw new Error('database lock failed')
    })
    const { req } = requestWithTransaction({ execute })

    await expect(lockEvidenceSources(req as never, ['evidence-1'], 'shared')).rejects.toThrow(
      'database lock failed',
    )
  })
})
