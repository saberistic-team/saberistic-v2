import { describe, expect, it, vi } from 'vitest'

import {
  down as generatedGiftInventoryCutoverDown,
  up as generatedGiftInventoryCutoverUp,
} from '@/migrations/20260901_235500_generated_gift_inventory_cutover'

function migrationSQL(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(migrationSQL).join('')
  if (!value || typeof value !== 'object') return ''
  const record = value as Record<string, unknown>
  return migrationSQL(record.value ?? record.queryChunks)
}

describe('generated Gift inventory cutover', () => {
  it('fences both legacy discovery and validation leases before invalidating unsold rows', async () => {
    const execute = vi.fn(async (_statement: unknown) => undefined)

    await generatedGiftInventoryCutoverUp({ db: { execute } } as never)

    expect(execute).toHaveBeenCalledTimes(1)
    const statement = migrationSQL(execute.mock.calls[0]?.[0])
    expect(statement).toContain(`"kind" IN ('discover', 'validate')`)
    expect(statement).toContain(`"status" IN ('queued', 'running')`)
    expect(statement).toContain(`'retailer_discovery_retired'`)
    expect(statement).toContain(`'retailer_validation_retired'`)
    expect(statement.indexOf('UPDATE "gift_inventory_jobs"')).toBeLessThan(
      statement.indexOf('UPDATE "gift_inventory"'),
    )
    expect(statement).toContain(`WHERE "status" <> 'sold'`)
  })

  it('fails closed when asked to reverse an irreversible data cutover', async () => {
    await expect(generatedGiftInventoryCutoverDown({} as never)).rejects.toThrow(
      'generated_gift_inventory_cutover_is_forward_only',
    )
  })
})
