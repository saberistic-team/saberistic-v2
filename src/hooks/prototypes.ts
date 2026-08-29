import { revalidatePath } from 'next/cache'
import { isDeepStrictEqual } from 'node:util'
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
  CollectionBeforeValidateHook,
} from 'payload'
import { ValidationError } from 'payload'

import { getRequestRole } from '@/access/roles'
import { lockEvidenceSources } from '@/lib/evidenceLocks'
import { normalizeSlug } from '@/lib/validation/content'
import {
  type PrototypeEvidenceSnapshot,
  validatePrototypePublication,
} from '@/lib/validation/prototypePublication'

type InternalPayloadReader = {
  findByID: (args: {
    collection: string
    depth: number
    id: number | string
    overrideAccess: boolean
  }) => Promise<Record<string, unknown>>
}

const relationID = (value: unknown): number | string | undefined => {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined

  const id = (value as Record<string, unknown>).id
  return typeof id === 'number' || typeof id === 'string' ? id : undefined
}

const mergePrototype = (
  originalDoc: Record<string, unknown> | undefined,
  data: Record<string, unknown>,
): Record<string, unknown> => {
  const originalSource =
    originalDoc?.sourceProvenance && typeof originalDoc.sourceProvenance === 'object'
      ? (originalDoc.sourceProvenance as Record<string, unknown>)
      : undefined
  const incomingSource =
    data.sourceProvenance && typeof data.sourceProvenance === 'object'
      ? (data.sourceProvenance as Record<string, unknown>)
      : undefined

  return {
    ...originalDoc,
    ...data,
    ...(originalSource || incomingSource
      ? { sourceProvenance: { ...originalSource, ...incomingSource } }
      : {}),
  }
}

const launchReviewFields = new Set([
  '_status',
  'createdAt',
  'id',
  'launchApproval',
  'launchApprovedAt',
  'launchReviewer',
  'operationalNotes',
  'updatedAt',
])

const hasMaterialPrototypeChange = (
  data: Record<string, unknown>,
  originalDoc: Record<string, unknown> | undefined,
) =>
  Boolean(originalDoc) &&
  Object.entries(data).some(
    ([field, value]) =>
      !launchReviewFields.has(field) && !isDeepStrictEqual(value, originalDoc?.[field]),
  )

export const normalizePrototypeSlug: CollectionBeforeValidateHook = ({ data, operation }) => {
  if (!data) return data

  if (typeof data.slug === 'string') {
    data.slug = normalizeSlug(data.slug)
  } else if (operation === 'create' && typeof data.title === 'string') {
    data.slug = normalizeSlug(data.title)
  }

  return data
}

export const validatePrototypeBeforeChange: CollectionBeforeChangeHook = async ({
  context,
  data,
  originalDoc,
  req,
}) => {
  const original = originalDoc as Record<string, unknown> | undefined
  const actorRole = context.allowSeedPublishConcepts === true ? 'admin' : getRequestRole(req)
  const explicitlyReapproved =
    actorRole === 'admin' &&
    data.launchApproval === 'approved' &&
    data.launchReviewer !== undefined &&
    data.launchApprovedAt !== undefined

  if (hasMaterialPrototypeChange(data, original) && !explicitlyReapproved) {
    data.launchApproval = 'not-reviewed'
    data.launchReviewer = null
    data.launchApprovedAt = null
  }

  const next = mergePrototype(original, data)

  if (next._status !== 'published') return data

  const references = Array.isArray(next.evidenceSources)
    ? next.evidenceSources.map(relationID).filter((id): id is number | string => id !== undefined)
    : []
  const payloadReader = req.payload as unknown as InternalPayloadReader
  const evidence: PrototypeEvidenceSnapshot[] = []

  await lockEvidenceSources(req, references, 'shared')

  for (const id of references) {
    try {
      const source = await payloadReader.findByID({
        collection: 'evidence-sources',
        depth: 0,
        id,
        overrideAccess: true,
      })

      evidence.push({
        allowedSurfaces: source.allowedSurfaces,
        id,
        permissionStatus: source.permissionStatus,
        verificationStatus: source.verificationStatus,
      })
    } catch {
      // The pure validator reports an attached source that could not be verified.
    }
  }

  const issues = validatePrototypePublication({
    actorRole,
    data: next,
    evidence,
  })

  if (issues.length > 0) {
    throw new ValidationError({
      collection: 'prototypes',
      errors: issues.map(({ code, message, path }) => ({ message: `[${code}] ${message}`, path })),
    })
  }

  return data
}

const revalidatePrototypePaths = async (
  doc: Record<string, unknown>,
  previousDoc: Record<string, unknown> | undefined,
  logger: { warn: (value: unknown) => void },
) => {
  const paths = new Set(['/prototypes'])

  for (const slug of [doc.slug, previousDoc?.slug]) {
    if (typeof slug === 'string' && slug.length > 0) paths.add(`/prototypes/${slug}`)
  }

  if (doc.featured === true || previousDoc?.featured === true) paths.add('/')

  try {
    for (const route of paths) revalidatePath(route)
  } catch (error) {
    logger.warn({
      error: error instanceof Error ? error.message : 'Unknown cache revalidation error',
      id: doc.id,
      message: 'Prototype saved, but cache revalidation did not run.',
      paths: [...paths],
    })
  }
}

export const revalidatePrototypeAfterChange: CollectionAfterChangeHook = async ({
  context,
  doc,
  previousDoc,
  req,
}) => {
  if (context.skipRevalidate === true) return doc
  if (doc._status !== 'published' && previousDoc?._status !== 'published') return doc

  await revalidatePrototypePaths(
    doc as Record<string, unknown>,
    previousDoc as Record<string, unknown> | undefined,
    req.payload.logger,
  )

  return doc
}

export const revalidatePrototypeAfterDelete: CollectionAfterDeleteHook = async ({
  context,
  doc,
  req,
}) => {
  if (context.skipRevalidate === true || doc._status !== 'published') return doc

  await revalidatePrototypePaths(doc as Record<string, unknown>, undefined, req.payload.logger)

  return doc
}
