export type PrototypeValidationCode =
  | 'APPROVAL_REQUIRED'
  | 'APP_URL_REQUIRED'
  | 'ARCHIVED_FEATURED'
  | 'AVAILABILITY_REQUIRED'
  | 'EVIDENCE_NOT_PUBLIC'
  | 'EVIDENCE_NOT_VERIFIED'
  | 'EVIDENCE_REQUIRED'
  | 'EVIDENCE_SURFACE_DENIED'
  | 'FEATURED_POSTER_REQUIRED'
  | 'FEATURE_EXPIRED'
  | 'FUTURE_DATE'
  | 'INVALID_DATA_CLASSIFICATION'
  | 'INVALID_STATUS'
  | 'LIVE_REVIEW_REQUIRED'
  | 'LIVE_VERIFICATION_STALE'
  | 'NOT_ADMIN'
  | 'REQUIRED'
  | 'SOURCE_MISMATCH'
  | 'SOURCE_PROVENANCE_REQUIRED'
  | 'SOURCE_REVIEW_REQUIRED'
  | 'VERIFICATION_REQUIRED'

export type PrototypeValidationIssue = {
  code: PrototypeValidationCode
  message: string
  path: string
}

export type PrototypeEvidenceSnapshot = {
  allowedSurfaces?: unknown
  id: number | string
  permissionStatus?: unknown
  verificationStatus?: unknown
}

export type PrototypePublicationInput = {
  actorRole?: 'admin' | 'editor'
  data: Record<string, unknown>
  evidence?: PrototypeEvidenceSnapshot[]
  now?: Date
}

const LIFECYCLE_STATUSES = new Set([
  'alpha',
  'archived',
  'beta',
  'concept',
  'live',
  'prototype',
])
const LAUNCHABLE_STATUSES = new Set(['alpha', 'beta', 'live', 'prototype'])
const DATA_CLASSIFICATIONS = new Set([
  'account-data',
  'none',
  'non-sensitive',
  'sensitive',
  'synthetic-only',
])
const REVIEW_DATE_FIELDS = [
  'authReviewedAt',
  'securityReviewedAt',
  'monitoringVerifiedAt',
  'restoreTestedAt',
  'rollbackTestedAt',
] as const
const ALL_DATE_FIELDS = [
  ...REVIEW_DATE_FIELDS,
  'availabilityCheckedAt',
  'featureUntil',
  'lastVerifiedAt',
  'launchApprovedAt',
  'launchedAt',
] as const

const hasText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined

const relationID = (value: unknown): number | string | undefined => {
  if (typeof value === 'string' || typeof value === 'number') return value

  const record = asRecord(value)
  const id = record?.id
  return typeof id === 'string' || typeof id === 'number' ? id : undefined
}

const validDate = (value: unknown): Date | undefined => {
  if (!hasText(value) && !(value instanceof Date)) return undefined

  const parsed = value instanceof Date ? value : new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

const addIssue = (
  issues: PrototypeValidationIssue[],
  code: PrototypeValidationCode,
  path: string,
  message: string,
) => {
  if (!issues.some((issue) => issue.code === code && issue.path === path)) {
    issues.push({ code, message, path })
  }
}

const requireText = (
  issues: PrototypeValidationIssue[],
  data: Record<string, unknown>,
  path: string,
) => {
  if (!hasText(data[path])) {
    addIssue(issues, 'REQUIRED', path, 'This field is required before publication.')
  }
}

const validateRepositorySource = (
  issues: PrototypeValidationIssue[],
  data: Record<string, unknown>,
) => {
  if (!hasText(data.sourceUrl)) return

  const source = asRecord(data.sourceProvenance)
  if (!source) {
    addIssue(
      issues,
      'SOURCE_PROVENANCE_REQUIRED',
      'sourceProvenance',
      'Repository provenance is required when a source URL is published.',
    )
    return
  }

  const required = [
    'repositoryUrl',
    'repositoryOwner',
    'repositoryName',
    'relation',
    'licenseSpdxExpression',
    'sourceLastCheckedAt',
    'sourceReviewStatus',
  ]

  for (const field of required) {
    if (!hasText(source[field])) {
      addIssue(
        issues,
        'SOURCE_PROVENANCE_REQUIRED',
        `sourceProvenance.${field}`,
        'Complete repository provenance before publication.',
      )
    }
  }

  if (source.repositoryUrl !== data.sourceUrl) {
    addIssue(
      issues,
      'SOURCE_MISMATCH',
      'sourceProvenance.repositoryUrl',
      'The canonical repository URL must match the public source URL.',
    )
  }

  if (hasText(source.repositoryUrl)) {
    try {
      const repositoryURL = new URL(source.repositoryUrl)
      const parts = repositoryURL.pathname
        .replace(/\.git$/i, '')
        .split('/')
        .filter(Boolean)

      if (
        repositoryURL.hostname !== 'github.com' ||
        parts.length !== 2 ||
        parts[0]?.toLowerCase() !== String(source.repositoryOwner).toLowerCase() ||
        parts[1]?.toLowerCase() !== String(source.repositoryName).toLowerCase() ||
        repositoryURL.search ||
        repositoryURL.hash
      ) {
        addIssue(
          issues,
          'SOURCE_MISMATCH',
          'sourceProvenance.repositoryUrl',
          'Use the canonical GitHub repository URL and matching owner and repository fields.',
        )
      }
    } catch {
      addIssue(
        issues,
        'SOURCE_MISMATCH',
        'sourceProvenance.repositoryUrl',
        'Use a valid canonical GitHub repository URL.',
      )
    }
  }

  if (source.sourceReviewStatus === 'blocked' || source.sourceReviewStatus === 'unreviewed') {
    addIssue(
      issues,
      'SOURCE_REVIEW_REQUIRED',
      'sourceProvenance.sourceReviewStatus',
      'Review the source metadata before publication.',
    )
  }

  if (data.status === 'live' && source.sourceReviewStatus !== 'reviewed') {
    addIssue(
      issues,
      'SOURCE_REVIEW_REQUIRED',
      'sourceProvenance.sourceReviewStatus',
      'A live project requires a completed source review.',
    )
  }
}

const validateEvidence = (
  issues: PrototypeValidationIssue[],
  data: Record<string, unknown>,
  evidence: PrototypeEvidenceSnapshot[],
) => {
  const references = Array.isArray(data.evidenceSources)
    ? data.evidenceSources.map(relationID).filter((id): id is number | string => id !== undefined)
    : []

  if (references.length === 0) {
    addIssue(
      issues,
      'EVIDENCE_REQUIRED',
      'evidenceSources',
      'Attach at least one reviewed evidence source before publication.',
    )
    return
  }

  for (const id of references) {
    const source = evidence.find((candidate) => String(candidate.id) === String(id))

    if (!source || source.verificationStatus !== 'verified') {
      addIssue(
        issues,
        'EVIDENCE_NOT_VERIFIED',
        'evidenceSources',
        'Every attached source must be verified.',
      )
      continue
    }

    if (source.permissionStatus !== 'public') {
      addIssue(
        issues,
        'EVIDENCE_NOT_PUBLIC',
        'evidenceSources',
        'Every attached source must be approved for public use.',
      )
    }

    const surfaces = Array.isArray(source.allowedSurfaces) ? source.allowedSurfaces : []
    if (!surfaces.includes('prototype-hub')) {
      addIssue(
        issues,
        'EVIDENCE_SURFACE_DENIED',
        'evidenceSources',
        'Every attached source must be approved for the prototype hub.',
      )
    }
  }
}

export const validatePrototypePublication = ({
  actorRole,
  data,
  evidence = [],
  now = new Date(),
}: PrototypePublicationInput): PrototypeValidationIssue[] => {
  if (data._status !== 'published') return []

  const issues: PrototypeValidationIssue[] = []
  const status = data.status
  const classification = data.dataClassification

  if (actorRole !== 'admin') {
    addIssue(issues, 'NOT_ADMIN', '_status', 'Only an administrator may publish content.')
  }

  for (const field of ['title', 'slug', 'summary', 'story', 'safetyNotice', 'dataHandlingNotes']) {
    requireText(issues, data, field)
  }

  if (!Array.isArray(data.limitations) || data.limitations.length === 0) {
    addIssue(
      issues,
      'REQUIRED',
      'limitations',
      'Record at least one honest limitation before publication.',
    )
  }

  if (!LIFECYCLE_STATUSES.has(String(status))) {
    addIssue(issues, 'INVALID_STATUS', 'status', 'Select a supported lifecycle status.')
  }

  if (!DATA_CLASSIFICATIONS.has(String(classification))) {
    addIssue(
      issues,
      'INVALID_DATA_CLASSIFICATION',
      'dataClassification',
      'Select a supported data classification.',
    )
  }

  if (status === 'archived' && data.featured === true) {
    addIssue(issues, 'ARCHIVED_FEATURED', 'featured', 'Archived projects cannot be featured.')
  }

  if (data.featured === true && !relationID(data.poster)) {
    addIssue(
      issues,
      'FEATURED_POSTER_REQUIRED',
      'poster',
      'Featured projects require a poster image.',
    )
  }

  const featureUntil = validDate(data.featureUntil)
  if (data.featured === true && featureUntil && featureUntil.getTime() <= now.getTime()) {
    addIssue(
      issues,
      'FEATURE_EXPIRED',
      'featureUntil',
      'Extend or remove the expired feature date before publication.',
    )
  }

  if (status === 'concept' || status === 'prototype') {
    if (classification !== 'none' && classification !== 'synthetic-only') {
      addIssue(
        issues,
        'INVALID_DATA_CLASSIFICATION',
        'dataClassification',
        'Concepts and prototypes may use only no data or synthetic data.',
      )
    }
  }

  if (status === 'alpha') {
    const allowed = new Set(['none', 'non-sensitive', 'synthetic-only'])
    if (!allowed.has(String(classification))) {
      addIssue(
        issues,
        'INVALID_DATA_CLASSIFICATION',
        'dataClassification',
        'An alpha may use only no data, synthetic data, or reviewed non-sensitive data.',
      )
    }
  }

  if (LAUNCHABLE_STATUSES.has(String(status))) {
    if (!hasText(data.appUrl)) {
      addIssue(issues, 'APP_URL_REQUIRED', 'appUrl', 'A launchable project requires an app URL.')
    }

    if (!validDate(data.lastVerifiedAt)) {
      addIssue(
        issues,
        'VERIFICATION_REQUIRED',
        'lastVerifiedAt',
        'Record when the project was last verified.',
      )
    }

    if (!validDate(data.availabilityCheckedAt)) {
      addIssue(
        issues,
        'VERIFICATION_REQUIRED',
        'availabilityCheckedAt',
        'Record when availability was checked.',
      )
    }

    if (!['available', 'degraded', 'unavailable'].includes(String(data.availabilityStatus))) {
      addIssue(
        issues,
        'AVAILABILITY_REQUIRED',
        'availabilityStatus',
        'Set a manually checked availability state before publication.',
      )
    }

    if (data.launchApproval !== 'approved') {
      addIssue(
        issues,
        'APPROVAL_REQUIRED',
        'launchApproval',
        'An administrator must approve the public launch.',
      )
    }

    if (!relationID(data.launchReviewer) || !validDate(data.launchApprovedAt)) {
      addIssue(
        issues,
        'APPROVAL_REQUIRED',
        'launchReviewer',
        'Record the administrator and approval date.',
      )
    }
  }

  if (classification === 'account-data' || classification === 'sensitive') {
    if (status !== 'beta' && status !== 'live') {
      addIssue(
        issues,
        'INVALID_DATA_CLASSIFICATION',
        'dataClassification',
        'Account or sensitive data requires beta or live review controls.',
      )
    }

    for (const field of ['privacyUrl', 'termsUrl']) requireText(issues, data, field)
    for (const field of REVIEW_DATE_FIELDS) {
      if (!validDate(data[field])) {
        addIssue(
          issues,
          'LIVE_REVIEW_REQUIRED',
          field,
          'Complete every operational review before handling account or sensitive data.',
        )
      }
    }
  }

  if (status === 'live') {
    requireText(issues, data, 'serviceExpectations')

    for (const field of REVIEW_DATE_FIELDS) {
      if (!validDate(data[field])) {
        addIssue(
          issues,
          'LIVE_REVIEW_REQUIRED',
          field,
          'Complete every operational review before marking a project live.',
        )
      }
    }

    const lastVerified = validDate(data.lastVerifiedAt)
    const maximumAge = 30 * 24 * 60 * 60 * 1000
    if (lastVerified && now.getTime() - lastVerified.getTime() > maximumAge) {
      addIssue(
        issues,
        'LIVE_VERIFICATION_STALE',
        'lastVerifiedAt',
        'Verify a live project at least every 30 days.',
      )
    }
  }

  for (const field of ALL_DATE_FIELDS) {
    const date = validDate(data[field])
    if (date && date.getTime() > now.getTime()) {
      addIssue(issues, 'FUTURE_DATE', field, 'Review and verification dates cannot be future-dated.')
    }
  }

  validateRepositorySource(issues, data)
  validateEvidence(issues, data, evidence)

  return issues
}
