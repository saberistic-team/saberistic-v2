import type { CollectionBeforeChangeHook, PayloadRequest } from 'payload'
import { ValidationError } from 'payload'
import { describe, expect, it } from 'vitest'

import { protectUserRoles } from '../../src/hooks/users'

type HookArgs = Parameters<CollectionBeforeChangeHook>[0]

const runHook = (
  overrides: Partial<HookArgs> & Pick<HookArgs, 'data' | 'operation'>,
) => {
  const req = {
    method: 'PATCH',
    pathname: '/api/users/1',
    user: null,
    ...overrides.req,
  } as PayloadRequest

  return protectUserRoles({
    collection: { slug: 'users' } as HookArgs['collection'],
    context: {},
    req,
    ...overrides,
  })
}

const expectValidationMessage = (run: () => unknown, message: string) => {
  try {
    run()
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError)
    expect((error as ValidationError).data.errors).toContainEqual(
      expect.objectContaining({ message }),
    )
    return
  }

  throw new Error('Expected the hook to reject the change.')
}

describe('user role protection', () => {
  it('forces Payload first-user registrations to become administrators', () => {
    const data = {
      name: '  Saberistic   Administrator  ',
      role: 'editor',
    }

    expect(
      runHook({
        data,
        operation: 'create',
        req: {
          method: 'POST',
          pathname: '/api/users/first-register',
          user: null,
        } as PayloadRequest,
      }),
    ).toEqual({
      name: 'Saberistic Administrator',
      role: 'admin',
    })
  })

  it('does not grant the bootstrap exception to an ordinary user create', () => {
    expectValidationMessage(
      () =>
        runHook({
          data: { role: 'admin' },
          operation: 'create',
          req: {
            method: 'POST',
            pathname: '/api/users',
            user: null,
          } as PayloadRequest,
        }),
      'Only an administrator may change a user role.',
    )
  })

  it('does not grant the bootstrap exception to an authenticated user', () => {
    expectValidationMessage(
      () =>
        runHook({
          data: { role: 'admin' },
          operation: 'create',
          req: {
            method: 'POST',
            pathname: '/api/users/first-register',
            user: { id: 7, role: 'editor' },
          } as PayloadRequest,
        }),
      'Only an administrator may change a user role.',
    )
  })

  it('prevents editors from changing roles', () => {
    expectValidationMessage(
      () =>
        runHook({
          data: { role: 'admin' },
          operation: 'update',
          originalDoc: { id: 7, role: 'editor' },
          req: {
            method: 'PATCH',
            pathname: '/api/users/7',
            user: { id: 7, role: 'editor' },
          } as PayloadRequest,
        }),
      'Only an administrator may change a user role.',
    )
  })

  it('allows administrators to change roles', () => {
    const data = { role: 'admin' }

    expect(
      runHook({
        data,
        operation: 'update',
        originalDoc: { id: 7, role: 'editor' },
        req: {
          method: 'PATCH',
          pathname: '/api/users/7',
          user: { id: 1, role: 'admin' },
        } as PayloadRequest,
      }),
    ).toEqual(data)
  })

  it('retains the explicit trusted bootstrap context used by the seed script', () => {
    const data = { role: 'admin' }

    expect(
      runHook({
        context: { allowRoleBootstrap: true },
        data,
        operation: 'create',
      }),
    ).toEqual(data)
  })

  it('still blocks security-review metadata during first-user registration', () => {
    expectValidationMessage(
      () =>
        runHook({
          data: {
            lastSecurityReviewAt: '2026-08-29T00:00:00.000Z',
            role: 'editor',
          },
          operation: 'create',
          req: {
            method: 'POST',
            pathname: '/api/users/first-register',
            user: null,
          } as PayloadRequest,
        }),
      'Only an administrator may record a security review.',
    )
  })
})
