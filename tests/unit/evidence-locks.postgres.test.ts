import { describe, expect, it } from 'vitest'

import { lockEvidenceSources } from '@/lib/evidenceLocks'

const runPostgresIntegration = process.env.RUN_EVIDENCE_LOCK_INTEGRATION === 'true'

const withTimeout = <T>(promise: Promise<T>, milliseconds: number, message: string): Promise<T> =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(message)), milliseconds)

    promise.then(
      (value) => {
        clearTimeout(timeout)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timeout)
        reject(error)
      },
    )
  })

describe.skipIf(!runPostgresIntegration)('evidence advisory locks with PostgreSQL', () => {
  it('holds an exclusive lock until commit and blocks a concurrent publication lock', async () => {
    await import('dotenv/config')

    const [{ getPayload }, { default: config }] = await Promise.all([
      import('payload'),
      import('../../src/payload.config'),
    ])
    const payload = await getPayload({ config })
    let firstTransactionID: null | number | string = null
    let secondTransactionID: null | number | string = null
    let firstClosed = false
    let secondClosed = false

    try {
      firstTransactionID = await payload.db.beginTransaction()
      secondTransactionID = await payload.db.beginTransaction()

      if (firstTransactionID === null || secondTransactionID === null) {
        throw new Error('PostgreSQL did not create both test transactions.')
      }

      const evidenceID = `concurrent-evidence-lock-${process.pid}`

      await lockEvidenceSources(
        { payload, transactionID: firstTransactionID },
        [evidenceID],
        'exclusive',
      )

      const publicationLock = lockEvidenceSources(
        { payload, transactionID: secondTransactionID },
        [evidenceID],
        'shared',
      )
      const observed = await Promise.race([
        publicationLock.then(() => 'acquired' as const),
        new Promise<'blocked'>((resolve) => setTimeout(() => resolve('blocked'), 200)),
      ])

      expect(observed).toBe('blocked')

      await payload.db.commitTransaction(firstTransactionID)
      firstClosed = true

      await withTimeout(publicationLock, 2000, 'Concurrent lock did not resume after commit.')

      await payload.db.commitTransaction(secondTransactionID)
      secondClosed = true
    } finally {
      if (!firstClosed && firstTransactionID !== null) {
        await payload.db.rollbackTransaction(firstTransactionID).catch(() => {})
      }
      if (!secondClosed && secondTransactionID !== null) {
        await payload.db.rollbackTransaction(secondTransactionID).catch(() => {})
      }
      await payload.destroy()
    }
  }, 15_000)
})
