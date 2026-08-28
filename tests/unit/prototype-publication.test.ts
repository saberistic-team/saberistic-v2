import { describe, expect, it } from 'vitest'

import {
  type PrototypeEvidenceSnapshot,
  type PrototypePublicationInput,
  validatePrototypePublication,
} from '../../src/lib/validation/prototypePublication'

const now = new Date('2026-08-29T00:00:00.000Z')

const evidence = [
  {
    id: 'evidence-1',
    allowedSurfaces: ['prototype-hub'],
    permissionStatus: 'public',
    verificationStatus: 'verified',
  },
] satisfies PrototypeEvidenceSnapshot[]

const publishedConcept: Record<string, unknown> = {
  _status: 'published',
  dataClassification: 'none',
  dataHandlingNotes: 'No visitor data is collected.',
  evidenceSources: ['evidence-1'],
  featured: false,
  launchApproval: 'not-reviewed',
  limitations: [{ text: 'Not a launched application.' }],
  safetyNotice: 'Build note only; no public application is offered.',
  slug: 'build-note',
  sourceProvenance: {
    licenseSpdxExpression: 'NOASSERTION',
    relation: 'organization_owned',
    repositoryName: 'example',
    repositoryOwner: 'saberistic-team',
    repositoryUrl: 'https://github.com/saberistic-team/example',
    sourceLastCheckedAt: '2026-08-28T00:00:00.000Z',
    sourceReviewStatus: 'metadata_only',
  },
  sourceUrl: 'https://github.com/saberistic-team/example',
  status: 'concept',
  story: 'Longer scoped context.',
  summary: 'A scoped build note.',
  title: 'Build Note',
}

const validate = (
  data: Record<string, unknown>,
  overrides: Partial<Omit<PrototypePublicationInput, 'data'>> = {},
) =>
  validatePrototypePublication({
    actorRole: 'admin',
    data,
    evidence,
    now,
    ...overrides,
  })

const pairs = (issues: ReturnType<typeof validatePrototypePublication>) =>
  issues.map(({ code, path }) => [code, path])

describe('prototype publication validation', () => {
  it('does not apply public launch gates to drafts', () => {
    expect(
      validatePrototypePublication({
        data: { _status: 'draft' },
      }),
    ).toEqual([])
  })

  it('allows a complete, evidenced concept without pretending it is an app', () => {
    expect(validate(publishedConcept)).toEqual([])
  })

  it('requires app, verification, availability, and approval controls for a prototype', () => {
    const issues = validate({
      ...publishedConcept,
      status: 'prototype',
    })

    expect(pairs(issues)).toEqual(
      expect.arrayContaining([
        ['APP_URL_REQUIRED', 'appUrl'],
        ['VERIFICATION_REQUIRED', 'lastVerifiedAt'],
        ['AVAILABILITY_REQUIRED', 'availabilityStatus'],
        ['APPROVAL_REQUIRED', 'launchApproval'],
      ]),
    )
  })

  it('blocks featured archived records', () => {
    const issues = validate({
      ...publishedConcept,
      featured: true,
      status: 'archived',
    })

    expect(pairs(issues)).toContainEqual(['ARCHIVED_FEATURED', 'featured'])
  })

  it('requires administrator authority for publication', () => {
    const issues = validate(publishedConcept, { actorRole: 'editor' })

    expect(issues.some(({ code, path }) => code === 'NOT_ADMIN' && path.length > 0)).toBe(true)
  })

  it('requires source metadata to agree with the canonical repository URL', () => {
    const issues = validate({
      ...publishedConcept,
      sourceProvenance: {
        ...(publishedConcept.sourceProvenance as Record<string, unknown>),
        repositoryName: 'different-repository',
      },
    })

    expect(
      issues.some(
        ({ code, path }) => code === 'SOURCE_MISMATCH' && path.startsWith('sourceProvenance.'),
      ),
    ).toBe(true)
  })
})
