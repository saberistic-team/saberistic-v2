import type { CollectionBeforeChangeHook, CollectionBeforeValidateHook } from 'payload'
import { ValidationError } from 'payload'
import { isDeepStrictEqual } from 'node:util'

import { getRequestRole } from '@/access/roles'
import { lockEvidenceSources } from '@/lib/evidenceLocks'
import { normalizeSlug } from '@/lib/validation/content'
import {
  deriveProofReviewState,
  type ProofEvidenceSnapshot,
  type ProofKind,
  relationID,
  validateProofPublication,
} from '@/lib/validation/proofPublication'

type InternalPayloadReader = {
  findByID: (args: {
    collection: string
    depth: number
    id: number | string
    overrideAccess: boolean
  }) => Promise<Record<string, unknown>>
}

const mergeProof = (
  originalDoc: Record<string, unknown> | undefined,
  data: Record<string, unknown>,
): Record<string, unknown> => ({ ...originalDoc, ...data })

const evidenceIDs = (data: Record<string, unknown>): Array<number | string> => {
  const references: unknown[] = Array.isArray(data.evidenceSources) ? [...data.evidenceSources] : []
  const claims = Array.isArray(data.claims) ? data.claims : []

  for (const claim of claims) {
    if (!claim || typeof claim !== 'object' || Array.isArray(claim)) continue
    const claimEvidence = (claim as Record<string, unknown>).evidenceSources
    if (Array.isArray(claimEvidence)) references.push(...claimEvidence)
  }

  return [
    ...new Map(
      references
        .map(relationID)
        .filter((id): id is number | string => id !== undefined)
        .map((id) => [String(id), id]),
    ).values(),
  ]
}

const reviewFields = new Set([
  '_status',
  'createdAt',
  'id',
  'internalReviewNotes',
  'publicationApproval',
  'publicationApprovedAt',
  'publicationReviewer',
  'updatedAt',
])

const hasMaterialChange = (
  data: Record<string, unknown>,
  originalDoc: Record<string, unknown> | undefined,
): boolean => {
  if (!originalDoc) return false

  return Object.entries(data).some(
    ([field, value]) => !reviewFields.has(field) && !isDeepStrictEqual(value, originalDoc[field]),
  )
}

const hasExplicitReapproval = (data: Record<string, unknown>, actorRole: string | undefined) =>
  actorRole === 'admin' &&
  data.publicationApproval === 'approved' &&
  data.publicationReviewer !== undefined &&
  data.publicationApprovedAt !== undefined

export const normalizeProofSlug: CollectionBeforeValidateHook = ({ data, operation }) => {
  if (!data) return data

  if (typeof data.slug === 'string') {
    data.slug = normalizeSlug(data.slug)
  } else if (operation === 'create' && typeof data.title === 'string') {
    data.slug = normalizeSlug(data.title)
  }

  return data
}

export const validateProofBeforeChange =
  (kind: ProofKind): CollectionBeforeChangeHook =>
  async ({ data, originalDoc, req }) => {
    const original = originalDoc as Record<string, unknown> | undefined
    const actorRole = getRequestRole(req)

    if (hasMaterialChange(data, original) && !hasExplicitReapproval(data, actorRole)) {
      data.publicationApproval = 'not-reviewed'
      data.publicationReviewer = null
      data.publicationApprovedAt = null
    }

    const next = mergeProof(original, data)
    const derived = deriveProofReviewState(next)

    data.claimStatus = derived.claimStatus
    data.permissionStatus = derived.permissionStatus
    next.claimStatus = derived.claimStatus
    next.permissionStatus = derived.permissionStatus

    if (next._status !== 'published') return data

    const payloadReader = req.payload as unknown as InternalPayloadReader
    const evidence: ProofEvidenceSnapshot[] = []
    const references = evidenceIDs(next)

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
          strength: source.strength,
          verificationStatus: source.verificationStatus,
        })
      } catch {
        // The pure validator reports any source that cannot be verified.
      }
    }

    const issues = validateProofPublication({
      actorRole,
      data: next,
      evidence,
      kind,
    })

    if (issues.length > 0) {
      throw new ValidationError({
        collection: kind === 'case-study' ? 'case-studies' : 'experience',
        errors: issues.map(({ code, message, path }) => ({
          message: `[${code}] ${message}`,
          path,
        })),
      })
    }

    return data
  }
