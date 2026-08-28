import type { Access, FieldAccess } from 'payload'

export type SaberisticRole = 'admin' | 'editor'

type StaffUser = {
  id: number | string
  role?: SaberisticRole | null
}

export const getRequestUser = (req: { user?: unknown }): StaffUser | null =>
  (req.user as StaffUser | null | undefined) ?? null

export const getRequestRole = (req: { user?: unknown }): SaberisticRole | undefined => {
  const role = getRequestUser(req)?.role

  return role === 'admin' || role === 'editor' ? role : undefined
}

export const isAdmin: Access = ({ req }) => getRequestRole(req) === 'admin'

export const isStaff: Access = ({ req }) => {
  const role = getRequestRole(req)

  return role === 'admin' || role === 'editor'
}

export const adminFieldAccess: FieldAccess = ({ req }) => getRequestRole(req) === 'admin'

export const staffFieldAccess: FieldAccess = ({ req }) => {
  const role = getRequestRole(req)

  return role === 'admin' || role === 'editor'
}

export const publishedOrStaff: Access = ({ req }) => {
  if (getRequestRole(req)) return true

  return {
    _status: {
      equals: 'published',
    },
  }
}

export const ownUserOrAdmin: Access = ({ req }) => {
  const user = getRequestUser(req)

  if (!user) return false
  if (user.role === 'admin') return true

  return {
    id: {
      equals: user.id,
    },
  }
}

export const draftOnlyForEditors: Access = ({ req }) => {
  const role = getRequestRole(req)

  if (role === 'admin') return true
  if (role !== 'editor') return false

  return {
    _status: {
      equals: 'draft',
    },
  }
}

export const proposedEvidenceOnlyForEditors: Access = ({ req }) => {
  const role = getRequestRole(req)

  if (role === 'admin') return true
  if (role !== 'editor') return false

  return {
    verificationStatus: {
      equals: 'proposed',
    },
  }
}
