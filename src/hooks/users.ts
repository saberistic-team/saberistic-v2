import type { CollectionBeforeChangeHook, CollectionBeforeDeleteHook } from 'payload'
import { ValidationError } from 'payload'

import { getRequestRole, getRequestUser } from '@/access/roles'

const fail = (path: string, message: string): never => {
  throw new ValidationError({
    collection: 'users',
    errors: [{ message, path }],
  })
}

export const protectUserRoles: CollectionBeforeChangeHook = ({
  collection,
  context,
  data,
  operation,
  originalDoc,
  req,
}) => {
  const role = getRequestRole(req)
  const bootstrapAllowed = context.allowRoleBootstrap === true
  // Payload verifies that the auth collection is empty immediately before this hook.
  const isFirstUserRegistration =
    operation === 'create' &&
    !getRequestUser(req) &&
    req.method === 'POST' &&
    req.pathname.endsWith(`/${collection.slug}/first-register`)

  if (typeof data.name === 'string') {
    data.name = data.name.trim().replace(/\s+/g, ' ')
  }

  if (isFirstUserRegistration) {
    data.role = 'admin'
  }

  if (role !== 'admin' && !bootstrapAllowed) {
    if (
      !isFirstUserRegistration &&
      data.role !== undefined &&
      data.role !== originalDoc?.role
    ) {
      fail('role', 'Only an administrator may change a user role.')
    }

    if (
      data.lastSecurityReviewAt !== undefined &&
      data.lastSecurityReviewAt !== originalDoc?.lastSecurityReviewAt
    ) {
      fail(
        'lastSecurityReviewAt',
        'Only an administrator may record a security review.',
      )
    }
  }

  return data
}

export const protectAdminDeletion: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const currentUser = getRequestUser(req)

  if (currentUser && String(currentUser.id) === String(id)) {
    fail('id', 'You cannot delete the account used for this session.')
  }

  const user = (await req.payload.findByID({
    collection: 'users',
    depth: 0,
    id,
    overrideAccess: true,
  })) as { role?: unknown }

  if (user.role !== 'admin') return

  const administrators = await req.payload.count({
    collection: 'users',
    overrideAccess: true,
    where: {
      role: {
        equals: 'admin',
      },
    },
  })

  if (administrators.totalDocs <= 1) {
    fail('id', 'The final administrator account cannot be deleted.')
  }
}
