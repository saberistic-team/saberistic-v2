import { describe, expect, it } from 'vitest'

import { seedCareerContent } from '../../src/lib/seedCareerContent'
import type { SeedDocument, SeedPayload } from '../../src/lib/seedPreparedContent'

type Call = {
  args: Record<string, unknown>
  method: keyof SeedPayload
}

const copy = <Value>(value: Value): Value => structuredClone(value)

class FakePayload implements SeedPayload {
  readonly calls: Call[] = []

  private readonly collections = new Map<string, SeedDocument[]>()
  private nextID = 1

  constructor(collections: Record<string, SeedDocument[]> = {}) {
    for (const [name, docs] of Object.entries(collections)) {
      this.collections.set(name, copy(docs))
    }
  }

  async create(args: Record<string, unknown>): Promise<SeedDocument> {
    this.calls.push({ args, method: 'create' })
    const collection = String(args.collection)
    if (collection === 'users') throw new Error('Career seed must not touch users.')
    const document = {
      ...copy(args.data as Record<string, unknown>),
      id: `career-${this.nextID++}`,
    }
    const documents = this.collections.get(collection) ?? []
    documents.push(document)
    this.collections.set(collection, documents)
    return copy(document)
  }

  async find(args: Record<string, unknown>): Promise<{ docs: SeedDocument[] }> {
    this.calls.push({ args, method: 'find' })
    const documents = this.collections.get(String(args.collection)) ?? []
    const [field, condition] = Object.entries(args.where as Record<string, { equals: unknown }>)[0]

    return {
      docs: copy(documents.filter((document) => document[field] === condition.equals).slice(0, 1)),
    }
  }

  async update(args: Record<string, unknown>): Promise<SeedDocument> {
    this.calls.push({ args, method: 'update' })
    const collection = String(args.collection)
    const documents = this.collections.get(collection) ?? []
    const index = documents.findIndex((document) => document.id === args.id)
    if (index < 0) throw new Error(`Missing ${collection} record ${String(args.id)}.`)

    documents[index] = {
      ...documents[index],
      ...copy(args.data as Record<string, unknown>),
      id: documents[index].id,
    }
    this.collections.set(collection, documents)
    return copy(documents[index])
  }

  async findGlobal(_args: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error('Career seed must not read globals.')
  }

  async updateGlobal(_args: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error('Career seed must not update globals.')
  }

  documents(collection: string): SeedDocument[] {
    return copy(this.collections.get(collection) ?? [])
  }
}

const idsBySlug = (documents: SeedDocument[]) =>
  Object.fromEntries(documents.map((document) => [String(document.slug), document.id]))

describe('seedCareerContent', () => {
  it('idempotently creates review-gated career drafts with exact evidence links', async () => {
    const payload = new FakePayload()
    const req = { id: 'career-migration-request' }

    await seedCareerContent(payload, req)
    const firstCaseIDs = idsBySlug(payload.documents('case-studies'))
    const firstExperienceIDs = idsBySlug(payload.documents('experience'))

    await seedCareerContent(payload, req)

    const evidence = payload.documents('evidence-sources')
    const caseStudies = payload.documents('case-studies')
    const experience = payload.documents('experience')

    expect(evidence).toHaveLength(9)
    expect(caseStudies).toHaveLength(4)
    expect(experience).toHaveLength(4)
    expect(idsBySlug(caseStudies)).toEqual(firstCaseIDs)
    expect(idsBySlug(experience)).toEqual(firstExperienceIDs)

    for (const record of [...caseStudies, ...experience]) {
      expect(record).toMatchObject({
        _status: 'draft',
        publicationApproval: 'not-reviewed',
      })
      expect(record.publicationApprovedAt).toBeUndefined()
      expect(record.publicationReviewer).toBeUndefined()
      expect(Array.isArray(record.evidenceSources) && record.evidenceSources.length > 0).toBe(true)
    }

    for (const record of caseStudies) {
      expect(record).toMatchObject({ featured: false, seo: { noIndex: true } })
      expect(record.publicContentType).not.toBe('case_study')
    }

    for (const record of experience) {
      expect(record).toMatchObject({ visibility: 'about' })
      expect(Object.values(firstCaseIDs)).toContain(record.relatedCaseStudy)
      expect(record.startDate).toBeUndefined()
      expect(record.endDate).toBeUndefined()
    }

    const serialized = JSON.stringify({ caseStudies, evidence, experience })
    expect(serialized).not.toContain('60×')
    expect(serialized).not.toContain('Walmart')
    expect(serialized).not.toContain('200,000')

    for (const { args } of payload.calls) {
      expect(args.req).toBe(req)
      expect(args.collection).not.toBe('users')
    }
  })

  it('never replaces an existing published record', async () => {
    const publishedCase: SeedDocument = {
      _status: 'published',
      id: 'published-case',
      slug: 'brave-privacy-aligned-advertising-and-rewards',
      title: 'Editorial case-study copy',
    }
    const publishedExperience: SeedDocument = {
      _status: 'published',
      id: 'published-experience',
      slug: 'brave-privacy-aligned-advertising-and-rewards',
      title: 'Editorial experience copy',
    }
    const payload = new FakePayload({
      'case-studies': [publishedCase],
      experience: [publishedExperience],
    })

    await seedCareerContent(payload)

    expect(payload.documents('case-studies').find(({ id }) => id === publishedCase.id)).toEqual(
      publishedCase,
    )
    expect(payload.documents('experience').find(({ id }) => id === publishedExperience.id)).toEqual(
      publishedExperience,
    )
    expect(
      payload.calls.some(({ args, method }) => method === 'update' && args.id === publishedCase.id),
    ).toBe(false)
    expect(
      payload.calls.some(
        ({ args, method }) => method === 'update' && args.id === publishedExperience.id,
      ),
    ).toBe(false)
  })

  it('preserves existing evidence decisions and edited drafts on rerun', async () => {
    const existingEvidence: SeedDocument = {
      allowedSurfaces: ['private-only'],
      id: 'reviewed-evidence',
      permissionStatus: 'private-only',
      url: 'https://github.com/saberistic/solana-secrets-engine',
      verificationStatus: 'rejected',
    }
    const editedDraft: SeedDocument = {
      _status: 'draft',
      id: 'edited-draft',
      publicationApproval: 'approved',
      publicationApprovedAt: '2026-08-29T00:00:00.000Z',
      publicationReviewer: 'admin-1',
      slug: 'solana-secrets-engine-key-management',
      summary: 'Administrator-edited copy.',
    }
    const payload = new FakePayload({
      'case-studies': [editedDraft],
      'evidence-sources': [existingEvidence],
    })

    await seedCareerContent(payload)

    expect(
      payload.documents('evidence-sources').find(({ id }) => id === existingEvidence.id),
    ).toEqual(existingEvidence)
    expect(
      payload.documents('case-studies').find(({ id }) => id === editedDraft.id),
    ).toEqual(editedDraft)
    expect(
      payload.calls.some(
        ({ args, method }) =>
          method === 'update' &&
          (args.id === existingEvidence.id || args.id === editedDraft.id),
      ),
    ).toBe(false)
  })
})
