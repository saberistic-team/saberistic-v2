import { isDeepStrictEqual } from 'node:util'

import type { CollectionBeforeChangeHook, CollectionBeforeDeleteHook } from 'payload'
import { ValidationError } from 'payload'

import { getRequestRole } from '@/access/roles'
import { lockEvidenceSources } from '@/lib/evidenceLocks'

type ReferenceCollection = {
  approvalFields: [approval: string, reviewer: string, approvedAt: string]
  collection: 'case-studies' | 'experience' | 'prototypes'
  paths: string[]
}

type ReferencePayload = {
  find: (args: Record<string, unknown>) => Promise<{ docs: Array<{ id: number | string }> }>
  update: (args: Record<string, unknown>) => Promise<unknown>
}

const referenceCollections: ReferenceCollection[] = [
  {
    approvalFields: ['publicationApproval', 'publicationReviewer', 'publicationApprovedAt'],
    collection: 'experience',
    paths: ['evidenceSources', 'claims.evidenceSources'],
  },
  {
    approvalFields: ['publicationApproval', 'publicationReviewer', 'publicationApprovedAt'],
    collection: 'case-studies',
    paths: ['evidenceSources', 'claims.evidenceSources'],
  },
  {
    approvalFields: ['launchApproval', 'launchReviewer', 'launchApprovedAt'],
    collection: 'prototypes',
    paths: ['evidenceSources'],
  },
]

const reviewNeutralFields = new Set(['accessedAt', 'internalVerificationNotes'])

const hasMaterialEvidenceChange = (
  data: Record<string, unknown>,
  originalDoc: Record<string, unknown> | undefined,
) =>
  Boolean(originalDoc) &&
  Object.entries(data).some(
    ([field, value]) =>
      !reviewNeutralFields.has(field) && !isDeepStrictEqual(value, originalDoc?.[field]),
  )

const findReferences = async ({
  evidenceID,
  req,
  status,
}: {
  evidenceID: number | string
  req: { payload: unknown }
  status?: 'draft' | 'published'
}) => {
  const payload = req.payload as ReferencePayload
  const references: Array<ReferenceCollection & { docs: Array<{ id: number | string }> }> = []

  for (const reference of referenceCollections) {
    const statusFilter = status ? [{ _status: { equals: status } }] : []
    const result = await payload.find({
      collection: reference.collection,
      depth: 0,
      draft: status === 'draft',
      limit: 1000,
      overrideAccess: true,
      pagination: false,
      req,
      where: {
        and: [
          ...statusFilter,
          {
            or: reference.paths.map((path) => ({
              [path]: { contains: evidenceID },
            })),
          },
        ],
      },
    })

    if (result.docs.length > 0) references.push({ ...reference, docs: result.docs })
  }

  return references
}

const invalidateDraftApprovals = async (
  references: Awaited<ReturnType<typeof findReferences>>,
  req: { payload: unknown },
) => {
  const payload = req.payload as ReferencePayload

  for (const { approvalFields, collection, docs } of references) {
    const [approval, reviewer, approvedAt] = approvalFields

    for (const doc of docs) {
      await payload.update({
        collection,
        data: {
          _status: 'draft',
          [approval]: 'not-reviewed',
          [reviewer]: null,
          [approvedAt]: null,
        },
        draft: true,
        id: doc.id,
        overrideAccess: true,
        req,
      })
    }
  }
}

export const validateEvidenceSourceBeforeChange: CollectionBeforeChangeHook = async ({
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

  const original = originalDoc as Record<string, unknown> | undefined
  if (original?.id !== undefined && hasMaterialEvidenceChange(data, original)) {
    await lockEvidenceSources(req, [original.id as number | string], 'exclusive')

    const publishedReferences = await findReferences({
      evidenceID: original.id as number | string,
      req,
      status: 'published',
    })

    if (publishedReferences.length > 0) {
      throw new ValidationError({
        collection: 'evidence-sources',
        errors: [
          {
            message:
              'Unpublish every linked Experience, Case Study, or prototype before materially changing this evidence.',
            path: 'verificationStatus',
          },
        ],
      })
    }

    await invalidateDraftApprovals(
      await findReferences({ evidenceID: original.id as number | string, req, status: 'draft' }),
      req,
    )
  }

  return data
}

export const protectEvidenceSourceBeforeDelete: CollectionBeforeDeleteHook = async ({
  id,
  req,
}) => {
  await lockEvidenceSources(req, [id], 'exclusive')

  const references = [
    ...(await findReferences({ evidenceID: id, req, status: 'published' })),
    ...(await findReferences({ evidenceID: id, req, status: 'draft' })),
  ]

  if (references.length > 0) {
    throw new ValidationError({
      collection: 'evidence-sources',
      errors: [
        {
          message:
            'Detach this source from every Experience, Case Study, and prototype before deleting it.',
          path: 'id',
        },
      ],
    })
  }
}
