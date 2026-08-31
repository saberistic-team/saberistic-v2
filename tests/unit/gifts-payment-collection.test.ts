import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { GiftPayments } from '@/collections/GiftPayments'

type AccessFunction = (args: { req: { user?: unknown } }) => unknown

function access(name: 'create' | 'delete' | 'read' | 'update', role?: 'admin' | 'editor') {
  const rule = GiftPayments.access?.[name]
  if (typeof rule !== 'function') throw new Error(`Expected ${name} access function.`)
  return (rule as AccessFunction)({
    req: role ? { user: { id: 1, role } } : {},
  })
}

describe('private Gift Draft payment collection', () => {
  it('is unreadable publicly and only admins can delete records', () => {
    expect(access('read')).toBe(false)
    expect(access('read', 'editor')).toBe(true)
    expect(access('update', 'editor')).toBe(true)
    expect(access('create', 'admin')).toBe(false)
    expect(access('delete', 'editor')).toBe(false)
    expect(access('delete', 'admin')).toBe(true)
  })

  it('keeps provider payment state immutable while fulfillment remains staff-editable', () => {
    const paymentStatus = GiftPayments.fields.find(
      (field) => 'name' in field && field.name === 'paymentStatus',
    )
    const fulfillmentStatus = GiftPayments.fields.find(
      (field) => 'name' in field && field.name === 'fulfillmentStatus',
    )
    if (!paymentStatus || !('access' in paymentStatus)) {
      throw new Error('Expected paymentStatus access controls.')
    }

    const update = paymentStatus.access?.update
    expect(typeof update).toBe('function')
    expect((update as AccessFunction)({ req: { user: { id: 1, role: 'admin' } } })).toBe(false)
    expect(
      fulfillmentStatus && 'access' in fulfillmentStatus
        ? fulfillmentStatus.access?.update
        : undefined,
    ).toBeUndefined()
  })
})
