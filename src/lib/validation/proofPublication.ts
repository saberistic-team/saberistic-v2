export type ProofKind = 'case-study' | 'experience'

export type ProofValidationCode =
  | 'APPROVAL_REQUIRED'
  | 'CASE_STUDY_LABEL_DENIED'
  | 'CLAIM_EVIDENCE_REQUIRED'
  | 'CLAIM_HOLD'
  | 'CLAIM_ID_DUPLICATE'
  | 'CLAIM_PERMISSION_REQUIRED'
  | 'CLAIM_SURFACE_DENIED'
  | 'DATE_INVALID'
  | 'EVIDENCE_NOT_PUBLIC'
  | 'EVIDENCE_NOT_VERIFIED'
  | 'EVIDENCE_REQUIRED'
  | 'EVIDENCE_SURFACE_DENIED'
  | 'METRIC_EVIDENCE_REQUIRED'
  | 'NOT_ADMIN'
  | 'RELATIONSHIP_CLAIM_REQUIRED'
  | 'REQUIRED'
  | 'VISIBILITY_DENIED'

export type ProofValidationIssue = {
  code: ProofValidationCode
  message: string
  path: string
}

export type ProofEvidenceSnapshot = {
  allowedSurfaces?: unknown
  id: number | string
  permissionStatus?: unknown
  strength?: unknown
  verificationStatus?: unknown
}

export type ProofPublicationInput = {
  actorRole?: 'admin' | 'editor'
  data: Record<string, unknown>
  evidence?: ProofEvidenceSnapshot[]
  kind: ProofKind
  now?: Date
}

type Claim = Record<string, unknown>

const CLAIM_STATUS_WEIGHT = {
  founder_provided: 1,
  hold: 2,
  publicly_corroborated: 0,
} as const

const PERMISSION_STATUS_WEIGHT = {
  'approval-required': 1,
  'private-only': 2,
  public: 0,
} as const

const hasText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined

export const relationID = (value: unknown): number | string | undefined => {
  if (typeof value === 'number' || typeof value === 'string') return value

  const record = asRecord(value)
  const id = record?.id
  return typeof id === 'number' || typeof id === 'string' ? id : undefined
}

const claimsFrom = (data: Record<string, unknown>): Claim[] =>
  Array.isArray(data.claims)
    ? data.claims.filter((claim): claim is Claim => Boolean(asRecord(claim)))
    : []

const mostRestrictive = <Value extends string>(
  values: unknown[],
  weights: Record<Value, number>,
  fallback: Value,
): Value => {
  let result: Value | undefined

  for (const value of values) {
    if (typeof value !== 'string' || !(value in weights)) return fallback
    if (result === undefined || weights[value as Value] > weights[result]) result = value as Value
  }

  return result ?? fallback
}

export const deriveProofReviewState = (data: Record<string, unknown>) => {
  const claims = claimsFrom(data)

  return {
    claimStatus: mostRestrictive(
      claims.map((claim) => claim.claimStatus),
      CLAIM_STATUS_WEIGHT,
      'hold',
    ),
    permissionStatus: mostRestrictive(
      claims.map((claim) => claim.permissionStatus),
      PERMISSION_STATUS_WEIGHT,
      'approval-required',
    ),
  } as const
}

const addIssue = (
  issues: ProofValidationIssue[],
  code: ProofValidationCode,
  path: string,
  message: string,
) => {
  if (!issues.some((issue) => issue.code === code && issue.path === path)) {
    issues.push({ code, message, path })
  }
}

const evidenceFor = (
  references: unknown,
  evidence: ProofEvidenceSnapshot[],
): Array<{ id: number | string; source?: ProofEvidenceSnapshot }> => {
  if (!Array.isArray(references)) return []

  return references
    .map(relationID)
    .filter((id): id is number | string => id !== undefined)
    .map((id) => ({
      id,
      source: evidence.find((candidate) => String(candidate.id) === String(id)),
    }))
}

const requiredSurfaces = (kind: ProofKind, data: Record<string, unknown>): string[] => {
  if (kind === 'case-study') {
    return data.featured === true ? ['work', 'homepage'] : ['work']
  }

  return data.visibility === 'homepage-and-about' ? ['about', 'homepage'] : ['about']
}

const validateSource = (
  issues: ProofValidationIssue[],
  source: ProofEvidenceSnapshot | undefined,
  path: string,
  surfaces: string[],
) => {
  if (!source || source.verificationStatus !== 'verified') {
    addIssue(
      issues,
      'EVIDENCE_NOT_VERIFIED',
      path,
      'Every selected source must be verified before publication.',
    )
    return
  }

  if (source.permissionStatus !== 'public') {
    addIssue(
      issues,
      'EVIDENCE_NOT_PUBLIC',
      path,
      'Every selected source must be approved for public use.',
    )
  }

  const allowed = Array.isArray(source.allowedSurfaces) ? source.allowedSurfaces : []
  if (surfaces.some((surface) => !allowed.includes(surface))) {
    addIssue(
      issues,
      'EVIDENCE_SURFACE_DENIED',
      path,
      'Every selected source must allow each surface where this record will appear.',
    )
  }
}

export const validateProofPublication = ({
  actorRole,
  data,
  evidence = [],
  kind,
  now = new Date(),
}: ProofPublicationInput): ProofValidationIssue[] => {
  if (data._status !== 'published') return []

  const issues: ProofValidationIssue[] = []
  const claims = claimsFrom(data)
  const surfaces = requiredSurfaces(kind, data)

  if (actorRole !== 'admin') {
    addIssue(issues, 'NOT_ADMIN', '_status', 'Only an administrator may publish proof content.')
  }

  if (data.publicationApproval !== 'approved') {
    addIssue(
      issues,
      'APPROVAL_REQUIRED',
      'publicationApproval',
      'Complete administrator publication review before publishing.',
    )
  }

  for (const field of ['publicationReviewer', 'publicationApprovedAt']) {
    if (!data[field]) {
      addIssue(
        issues,
        'APPROVAL_REQUIRED',
        field,
        'Record the publication reviewer and approval date before publishing.',
      )
    }
  }

  const required =
    kind === 'case-study'
      ? ['title', 'slug', 'summary', 'body', 'organization', 'relationship', 'publicContentType']
      : ['title', 'slug', 'organization', 'role', 'relationship', 'summary', 'visibility']

  for (const field of required) {
    if (!hasText(data[field])) {
      addIssue(issues, 'REQUIRED', field, 'This field is required before publication.')
    }
  }

  if (kind === 'experience' && data.visibility === 'hidden') {
    addIssue(
      issues,
      'VISIBILITY_DENIED',
      'visibility',
      'A hidden experience record must remain a draft.',
    )
  }

  const startDate = hasText(data.startDate) ? new Date(data.startDate) : undefined
  const endDate = hasText(data.endDate) ? new Date(data.endDate) : undefined
  const approvedAt = hasText(data.publicationApprovedAt)
    ? new Date(data.publicationApprovedAt)
    : undefined

  if (startDate && Number.isNaN(startDate.getTime())) {
    addIssue(issues, 'DATE_INVALID', 'startDate', 'Use a valid start date.')
  }
  if (endDate && Number.isNaN(endDate.getTime())) {
    addIssue(issues, 'DATE_INVALID', 'endDate', 'Use a valid end date.')
  }
  if (startDate && endDate && startDate.getTime() > endDate.getTime()) {
    addIssue(issues, 'DATE_INVALID', 'endDate', 'The end date cannot precede the start date.')
  }
  if (approvedAt && (Number.isNaN(approvedAt.getTime()) || approvedAt.getTime() > now.getTime())) {
    addIssue(
      issues,
      'DATE_INVALID',
      'publicationApprovedAt',
      'Use a valid approval date that is not in the future.',
    )
  }

  const topLevelEvidence = evidenceFor(data.evidenceSources, evidence)
  if (topLevelEvidence.length === 0) {
    addIssue(
      issues,
      'EVIDENCE_REQUIRED',
      'evidenceSources',
      'Attach at least one reviewed evidence source before publication.',
    )
  }
  for (const { source } of topLevelEvidence) {
    validateSource(issues, source, 'evidenceSources', surfaces)
  }

  if (claims.length === 0) {
    addIssue(
      issues,
      'RELATIONSHIP_CLAIM_REQUIRED',
      'claims',
      'Add a reviewed relationship claim before publication.',
    )
  }

  const seenClaimIDs = new Set<string>()
  let matchingRelationshipClaim: Claim | undefined

  claims.forEach((claim, index) => {
    const path = `claims.${index}`
    const claimID = hasText(claim.claimId) ? claim.claimId : undefined

    if (claimID) {
      if (seenClaimIDs.has(claimID)) {
        addIssue(
          issues,
          'CLAIM_ID_DUPLICATE',
          `${path}.claimId`,
          'Claim IDs must be unique within a record.',
        )
      }
      seenClaimIDs.add(claimID)
    }

    if (claim.claimType === 'relationship' && claim.relationshipValue === data.relationship) {
      matchingRelationshipClaim = claim
    }

    if (claim.claimStatus === 'hold') {
      addIssue(
        issues,
        'CLAIM_HOLD',
        `${path}.claimStatus`,
        'A held claim cannot appear in published content.',
      )
    }

    if (claim.permissionStatus !== 'public') {
      addIssue(
        issues,
        'CLAIM_PERMISSION_REQUIRED',
        `${path}.permissionStatus`,
        'Every published claim must have public permission.',
      )
    }

    const allowed = Array.isArray(claim.allowedSurfaces) ? claim.allowedSurfaces : []
    if (surfaces.some((surface) => !allowed.includes(surface))) {
      addIssue(
        issues,
        'CLAIM_SURFACE_DENIED',
        `${path}.allowedSurfaces`,
        'Every claim must allow each surface where this record will appear.',
      )
    }

    const claimEvidence = evidenceFor(claim.evidenceSources, evidence)
    if (claimEvidence.length === 0) {
      addIssue(
        issues,
        'CLAIM_EVIDENCE_REQUIRED',
        `${path}.evidenceSources`,
        'Attach exact evidence for every published claim.',
      )
    }

    for (const { source } of claimEvidence) {
      validateSource(issues, source, `${path}.evidenceSources`, surfaces)
    }

    if (claim.claimType === 'metric') {
      const acceptableMetricEvidence = claimEvidence.some(
        ({ source }) =>
          source?.verificationStatus === 'verified' &&
          source.permissionStatus === 'public' &&
          (source.strength === 'primary' || source.strength === 'first-party-public'),
      )

      if (claim.claimStatus !== 'publicly_corroborated' || !acceptableMetricEvidence) {
        addIssue(
          issues,
          'METRIC_EVIDENCE_REQUIRED',
          `${path}.evidenceSources`,
          'A metric requires directly supporting primary or first-party public evidence.',
        )
      }
    }
  })

  if (!matchingRelationshipClaim) {
    addIssue(
      issues,
      'RELATIONSHIP_CLAIM_REQUIRED',
      'claims',
      'Add a relationship claim that exactly matches the record relationship.',
    )
  }

  if (kind === 'case-study' && data.publicContentType === 'case_study') {
    const directlyAllowed =
      data.relationship === 'saberistic_engagement' || data.relationship === 'sanitized_diagnostic'
    const contractPermission =
      data.relationship === 'contract' &&
      matchingRelationshipClaim?.permissionStatus === 'public' &&
      hasText(matchingRelationshipClaim.permissionEvidence) &&
      Boolean(matchingRelationshipClaim.permissionReviewer) &&
      Boolean(matchingRelationshipClaim.permissionReviewedAt)

    if (!directlyAllowed && !contractPermission) {
      addIssue(
        issues,
        'CASE_STUDY_LABEL_DENIED',
        'publicContentType',
        'Use an experience or contribution profile unless this is a Saberistic engagement, sanitized diagnostic, or explicitly permitted contract case study.',
      )
    }
  }

  return issues
}
