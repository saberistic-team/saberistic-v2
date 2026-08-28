import type { CollectionBeforeChangeHook } from 'payload'
import { ValidationError } from 'payload'

import { getRequestRole } from '@/access/roles'

export const validateMediaBeforeChange: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
  req,
}) => {
  const next = { ...originalDoc, ...data }

  if (next._status === 'published' && getRequestRole(req) !== 'admin') {
    throw new ValidationError({
      collection: 'media',
      errors: [{ message: 'Only an administrator may publish media.', path: '_status' }],
    })
  }

  if (next._status !== 'published' || next.usageRights === 'owned') return data

  const errors: { message: string; path: string }[] = []

  if (typeof next.credit !== 'string' || next.credit.trim().length === 0) {
    errors.push({ message: 'Credit is required for third-party media.', path: 'credit' })
  }

  if (typeof next.sourceUrl !== 'string' || next.sourceUrl.trim().length === 0) {
    errors.push({ message: 'A source URL is required for third-party media.', path: 'sourceUrl' })
  }

  if (errors.length > 0) {
    throw new ValidationError({ collection: 'media', errors })
  }

  return data
}
