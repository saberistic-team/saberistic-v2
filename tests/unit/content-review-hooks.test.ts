import { describe, expect, it, vi } from 'vitest'
import { ValidationError } from 'payload'

import {
  protectEvidenceSourceBeforeDelete,
  validateEvidenceSourceBeforeChange,
} from '@/hooks/evidenceSources'
import { validateProofBeforeChange } from '@/hooks/proofContent'
import { validatePrototypeBeforeChange } from '@/hooks/prototypes'
import { down as careerMigrationDown } from '@/migrations/20260829_151905'

const approval = {
  publicationApproval: 'approved',
  publicationApprovedAt: '2026-08-29T00:00:00.000Z',
  publicationReviewer: 'admin-1',
}

let transactionSequence = 0

const transactionalRequest = (
  payload: Record<string, unknown>,
  execute = vi.fn(async () => ({})),
) => {
  const transactionID = `unit-evidence-lock-${++transactionSequence}`

  return {
    execute,
    req: {
      payload: {
        ...payload,
        db: {
          execute,
          packageName: '@payloadcms/db-postgres',
          sessions: {
            [transactionID]: { db: { transactionID } },
          },
        },
      },
      transactionID,
    },
  }
}

describe('proof content review hooks', () => {
  it('invalidates stale approval after a material draft edit', async () => {
    const data = { summary: 'Changed after review.' }
    const hook = validateProofBeforeChange('experience')

    const result = await hook({
      data,
      originalDoc: {
        ...approval,
        _status: 'draft',
        claims: [],
        summary: 'Reviewed wording.',
      },
      req: { user: { role: 'editor' } },
    } as never)

    expect(result).toMatchObject({
      publicationApproval: 'not-reviewed',
      publicationApprovedAt: null,
      publicationReviewer: null,
    })
  })

  it('allows an administrator to explicitly reapprove a material edit in the same save', async () => {
    const data = {
      publicationApproval: 'approved',
      publicationApprovedAt: '2026-08-29T12:00:00.000Z',
      publicationReviewer: 'admin-2',
      summary: 'Freshly reviewed wording.',
    }
    const hook = validateProofBeforeChange('experience')

    const result = await hook({
      data,
      originalDoc: {
        ...approval,
        _status: 'draft',
        claims: [],
        summary: 'Old wording.',
      },
      req: { user: { role: 'admin' } },
    } as never)

    expect(result).toMatchObject({
      publicationApproval: 'approved',
      publicationApprovedAt: '2026-08-29T12:00:00.000Z',
      publicationReviewer: 'admin-2',
    })
  })

  it('collects claim evidence without mutating the stored top-level relationships', async () => {
    const events: string[] = []
    const data = {
      ...approval,
      _status: 'published',
      claims: [
        {
          allowedSurfaces: ['about'],
          claimId: 'relationship',
          claimStatus: 'publicly_corroborated',
          claimType: 'relationship',
          evidenceSources: ['claim-source'],
          permissionStatus: 'public',
          relationshipValue: 'employment',
          statement: 'Prior employer role.',
        },
      ],
      evidenceSources: ['top-level-source'],
      organization: 'Example',
      relationship: 'employment',
      role: 'Engineer',
      slug: 'example',
      summary: 'Reviewed.',
      title: 'Example — Engineer',
      visibility: 'about',
    }
    const hook = validateProofBeforeChange('experience')
    const findByID = vi.fn(async ({ id }) => {
      events.push('read')
      return {
        allowedSurfaces: ['about'],
        id,
        permissionStatus: 'public',
        strength: 'primary',
        verificationStatus: 'verified',
      }
    })
    const execute = vi.fn(async () => {
      events.push('lock')
      return {}
    })
    const { req } = transactionalRequest({ findByID }, execute)

    await hook({
      data,
      req: {
        ...req,
        user: { role: 'admin' },
      },
    } as never)

    expect(data.evidenceSources).toEqual(['top-level-source'])
    expect(execute).toHaveBeenCalledTimes(2)
    expect(events).toEqual(['lock', 'lock', 'read', 'read'])
  })

  it('also invalidates stale prototype launch approval', async () => {
    const data = { summary: 'Changed prototype copy.' }

    const result = await validatePrototypeBeforeChange({
      context: {},
      data,
      originalDoc: {
        _status: 'draft',
        launchApproval: 'approved',
        launchApprovedAt: '2026-08-29T00:00:00.000Z',
        launchReviewer: 'admin-1',
        summary: 'Reviewed prototype copy.',
      },
      req: { user: { role: 'editor' } },
    } as never)

    expect(result).toMatchObject({
      launchApproval: 'not-reviewed',
      launchApprovedAt: null,
      launchReviewer: null,
    })
  })

  it('takes every prototype evidence lock before reading publication evidence', async () => {
    const events: string[] = []
    const findByID = vi.fn(async ({ id }) => {
      events.push(`read:${id}`)
      return {
        allowedSurfaces: ['prototype-hub'],
        id,
        permissionStatus: 'public',
        verificationStatus: 'verified',
      }
    })
    const execute = vi.fn(async () => {
      events.push('lock')
      return {}
    })
    const { req } = transactionalRequest({ findByID }, execute)

    await validatePrototypeBeforeChange({
      context: {},
      data: {
        _status: 'published',
        dataClassification: 'none',
        dataHandlingNotes: 'No visitor data is collected.',
        evidenceSources: ['source-b', 'source-a'],
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
      },
      req: { ...req, user: { role: 'admin' } },
    } as never)

    expect(execute).toHaveBeenCalledTimes(2)
    expect(events).toEqual(['lock', 'lock', 'read:source-b', 'read:source-a'])
  })
})

const evidenceOriginal = {
  allowedSurfaces: ['work'],
  id: 'evidence-1',
  permissionStatus: 'public',
  strength: 'secondary',
  verificationStatus: 'verified',
}

describe('evidence reference hooks', () => {
  it('blocks a material evidence change while published proof still references it', async () => {
    const events: string[] = []
    const find = vi.fn(async () => {
      events.push('reference-check')
      return { docs: [{ id: 'published-proof' }] }
    })
    const execute = vi.fn(async () => {
      events.push('lock')
      return {}
    })
    const { req } = transactionalRequest({ find, update: vi.fn() }, execute)

    try {
      await validateEvidenceSourceBeforeChange({
        context: {},
        data: { strength: 'primary' },
        originalDoc: evidenceOriginal,
        req: { ...req, user: { role: 'admin' } },
      } as never)
      throw new Error('Expected the evidence update to be blocked.')
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError)
      expect((error as ValidationError).data.errors).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining('Unpublish every linked') }),
      )
    }

    expect(events[0]).toBe('lock')
  })

  it('invalidates approvals on linked drafts before accepting a material evidence change', async () => {
    const update = vi.fn(async () => ({}))
    const find = vi.fn(async ({ where }) => ({
      docs: JSON.stringify(where).includes('draft') ? [{ id: 'draft-proof' }] : [],
    }))
    const { execute, req } = transactionalRequest({ find, update })

    await validateEvidenceSourceBeforeChange({
      context: {},
      data: { strength: 'primary' },
      originalDoc: evidenceOriginal,
      req: { ...req, user: { role: 'admin' } },
    } as never)

    expect(execute).toHaveBeenCalledOnce()
    expect(update).toHaveBeenCalledTimes(3)
    const updateCalls = update.mock.calls as unknown as Array<[{ data: Record<string, unknown> }]>
    expect(updateCalls.map(([call]) => call.data)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ publicationApproval: 'not-reviewed' }),
        expect.objectContaining({ launchApproval: 'not-reviewed' }),
      ]),
    )
  })

  it('blocks deletion until every active proof record is detached', async () => {
    const events: string[] = []
    const find = vi.fn(async () => {
      events.push('reference-check')
      return { docs: [{ id: 'linked-proof' }] }
    })
    const execute = vi.fn(async () => {
      events.push('lock')
      return {}
    })
    const { req } = transactionalRequest({ find, update: vi.fn() }, execute)

    try {
      await protectEvidenceSourceBeforeDelete({
        id: 'evidence-1',
        req,
      } as never)
      throw new Error('Expected evidence deletion to be blocked.')
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError)
      expect((error as ValidationError).data.errors).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining('Detach this source') }),
      )
    }

    expect(events[0]).toBe('lock')
  })
})

describe('career migration rollback safety', () => {
  it('fails closed before destructive schema statements can run', async () => {
    const execute = vi.fn()

    await expect(
      careerMigrationDown({ db: { execute }, payload: {}, req: {} } as never),
    ).rejects.toThrow('intentionally non-reversible')
    expect(execute).not.toHaveBeenCalled()
  })
})
