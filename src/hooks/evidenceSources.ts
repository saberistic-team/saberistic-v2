import type { CollectionBeforeChangeHook } from 'payload'
import { ValidationError } from 'payload'

import { getRequestRole } from '@/access/roles'

export const validateEvidenceSourceBeforeChange: CollectionBeforeChangeHook = ({
  context,
  data,
  originalDoc,
  req,
}) => {
  const next = { ...originalDoc, ...data }
  const errors: { message: string; path: string }[] = []
  const seedAllowed = context.allowEvidenceSeed === true

  if (
    data.verificationStatus !== undefined &&
    data.verificationStatus !== originalDoc?.verificationStatus &&
    getRequestRole(req) !== 'admin' &&
    !seedAllowed
  ) {
    errors.push({
      message: 'Only an administrator may verify or reject evidence.',
      path: 'verificationStatus',
    })
  }

  const surfaces = Array.isArray(next.allowedSurfaces) ? next.allowedSurfaces : []

  if (next.permissionStatus === 'private-only') {
    if (surfaces.length !== 1 || surfaces[0] !== 'private-only') {
      errors.push({
        message: 'Private evidence may be used only on the private-only surface.',
        path: 'allowedSurfaces',
      })
    }
  } else if (surfaces.includes('private-only')) {
    errors.push({
      message: 'Public or approval-required evidence cannot use the private-only surface.',
      path: 'allowedSurfaces',
    })
  }

  if (next.archivedAt && !next.archivedUrl) {
    errors.push({ message: 'An archive date requires an archived URL.', path: 'archivedUrl' })
  }

  if (next.accessedAt && new Date(next.accessedAt).getTime() > Date.now()) {
    errors.push({ message: 'The access date cannot be in the future.', path: 'accessedAt' })
  }

  if (next.archivedAt && new Date(next.archivedAt).getTime() > Date.now()) {
    errors.push({ message: 'The archive date cannot be in the future.', path: 'archivedAt' })
  }

  if (errors.length > 0) {
    throw new ValidationError({ collection: 'evidence-sources', errors })
  }

  return data
}
