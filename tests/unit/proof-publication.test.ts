import { describe, expect, it } from 'vitest'

import {
  deriveProofReviewState,
  type ProofEvidenceSnapshot,
  validateProofPublication,
} from '../../src/lib/validation/proofPublication'

const evidence: ProofEvidenceSnapshot[] = [
  {
    allowedSurfaces: ['homepage', 'work', 'about'],
    id: 'public-source',
    permissionStatus: 'public',
    strength: 'primary',
    verificationStatus: 'verified',
  },
]

const approvedClaim = {
  allowedSurfaces: ['work'],
  claimId: 'relationship',
  claimStatus: 'publicly_corroborated',
  claimType: 'relationship',
  evidenceSources: ['public-source'],
  permissionStatus: 'public',
  relationshipValue: 'employment',
  statement: 'Prior employer role at Example.',
}

const approvedCaseStudy = {
  _status: 'published',
  body: 'Contextual reviewed copy.',
  claims: [approvedClaim],
  evidenceSources: ['public-source'],
  featured: false,
  organization: 'Example',
  publicationApproval: 'approved',
  publicationApprovedAt: '2026-08-28T00:00:00.000Z',
  publicationReviewer: 'admin-1',
  publicContentType: 'experience_profile',
  relationship: 'employment',
  slug: 'example',
  summary: 'Reviewed summary.',
  title: 'Reviewed title',
}

describe('deriveProofReviewState', () => {
  it('derives the most restrictive claim and permission state', () => {
    expect(
      deriveProofReviewState({
        claims: [
          { claimStatus: 'publicly_corroborated', permissionStatus: 'public' },
          { claimStatus: 'founder_provided', permissionStatus: 'approval-required' },
          { claimStatus: 'hold', permissionStatus: 'private-only' },
        ],
      }),
    ).toEqual({ claimStatus: 'hold', permissionStatus: 'private-only' })

    expect(deriveProofReviewState({ claims: [] })).toEqual({
      claimStatus: 'hold',
      permissionStatus: 'approval-required',
    })
  })
})

describe('validateProofPublication', () => {
  it('allows an administrator to publish a reviewed experience profile', () => {
    expect(
      validateProofPublication({
        actorRole: 'admin',
        data: approvedCaseStudy,
        evidence,
        kind: 'case-study',
        now: new Date('2026-08-29T00:00:00.000Z'),
      }),
    ).toEqual([])
  })

  it('never applies publication gates to a draft', () => {
    expect(
      validateProofPublication({
        actorRole: 'editor',
        data: { _status: 'draft', claims: [{ claimStatus: 'hold' }] },
        kind: 'experience',
      }),
    ).toEqual([])
  })

  it('blocks editors, unapproved records, held claims, and disallowed evidence surfaces', () => {
    const issues = validateProofPublication({
      actorRole: 'editor',
      data: {
        ...approvedCaseStudy,
        claims: [
          {
            ...approvedClaim,
            allowedSurfaces: ['about'],
            claimStatus: 'hold',
            permissionStatus: 'approval-required',
          },
        ],
        publicationApproval: 'not-reviewed',
      },
      evidence: [
        {
          ...evidence[0],
          allowedSurfaces: ['about'],
        },
      ],
      kind: 'case-study',
    })

    expect(issues.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        'NOT_ADMIN',
        'APPROVAL_REQUIRED',
        'CLAIM_HOLD',
        'CLAIM_PERMISSION_REQUIRED',
        'CLAIM_SURFACE_DENIED',
        'EVIDENCE_SURFACE_DENIED',
      ]),
    )
  })

  it('requires the public relationship to have an exact matching structured claim', () => {
    const issues = validateProofPublication({
      actorRole: 'admin',
      data: {
        ...approvedCaseStudy,
        claims: [{ ...approvedClaim, relationshipValue: 'contract' }],
      },
      evidence,
      kind: 'case-study',
    })

    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'RELATIONSHIP_CLAIM_REQUIRED', path: 'claims' }),
    )
  })

  it('reserves the case-study label for permitted engagement categories', () => {
    const issues = validateProofPublication({
      actorRole: 'admin',
      data: { ...approvedCaseStudy, publicContentType: 'case_study' },
      evidence,
      kind: 'case-study',
    })

    expect(issues).toContainEqual(expect.objectContaining({ code: 'CASE_STUDY_LABEL_DENIED' }))
  })

  it('requires direct primary evidence for numeric metrics', () => {
    const issues = validateProofPublication({
      actorRole: 'admin',
      data: {
        ...approvedCaseStudy,
        claims: [
          approvedClaim,
          {
            ...approvedClaim,
            claimId: 'unsupported-metric',
            claimStatus: 'founder_provided',
            claimType: 'metric',
            relationshipValue: undefined,
            statement: 'Processed an unsupported number of transactions.',
          },
        ],
      },
      evidence: [{ ...evidence[0], strength: 'secondary' }],
      kind: 'case-study',
    })

    expect(issues).toContainEqual(expect.objectContaining({ code: 'METRIC_EVIDENCE_REQUIRED' }))
  })

  it('keeps hidden or chronologically invalid experience records in draft', () => {
    const issues = validateProofPublication({
      actorRole: 'admin',
      data: {
        ...approvedCaseStudy,
        claims: [{ ...approvedClaim, allowedSurfaces: ['about'] }],
        endDate: '2020-01-01T00:00:00.000Z',
        role: 'Engineer',
        startDate: '2021-01-01T00:00:00.000Z',
        visibility: 'hidden',
      },
      evidence,
      kind: 'experience',
    })

    expect(issues.map(({ code }) => code)).toEqual(
      expect.arrayContaining(['VISIBILITY_DENIED', 'DATE_INVALID']),
    )
  })
})
