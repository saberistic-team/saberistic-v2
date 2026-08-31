import { describe, expect, it, vi } from 'vitest'
import { ValidationError } from 'payload'

import { validatePrototypeBeforeChange } from '../../src/hooks/prototypes'
import {
  LOVABLE_PROTOTYPE_VERIFIED_AT,
  publishLovablePrototypes,
  type LovablePrototypeDocument,
  type LovablePrototypePayload,
} from '../../src/lib/publishLovablePrototypes'
import { mapPrototype } from '../../src/lib/public-content/mapping'
import { validatePrototypePublication } from '../../src/lib/validation/prototypePublication'
import { migrations } from '../../src/migrations'

type LocalCall = {
  args: Record<string, unknown>
  method: keyof LovablePrototypePayload
}

type FakePayloadOptions = {
  collections?: Record<string, LovablePrototypeDocument[]>
}

const copy = <Value>(value: Value): Value => structuredClone(value)

class FakePayload implements LovablePrototypePayload {
  readonly calls: LocalCall[] = []

  private readonly collections = new Map<string, LovablePrototypeDocument[]>()
  private nextID = 1

  constructor({ collections = {} }: FakePayloadOptions = {}) {
    for (const [name, docs] of Object.entries(collections)) {
      this.collections.set(name, copy(docs))
    }
  }

  async create(args: Record<string, unknown>): Promise<LovablePrototypeDocument> {
    this.calls.push({ args: copy(args), method: 'create' })
    const collection = String(args.collection)
    const document = {
      ...copy(args.data as Record<string, unknown>),
      id: `lovable-${this.nextID++}`,
    }
    const docs = this.collections.get(collection) ?? []

    docs.push(document)
    this.collections.set(collection, docs)
    return copy(document)
  }

  async find(args: Record<string, unknown>): Promise<{ docs: LovablePrototypeDocument[] }> {
    this.calls.push({ args: copy(args), method: 'find' })
    const collection = String(args.collection)
    const [field, condition] = Object.entries(args.where as Record<string, { equals: unknown }>)[0]
    let docs = (this.collections.get(collection) ?? []).filter(
      (document) => document[field] === condition.equals,
    )

    if (collection === 'prototypes' && args.draft === false) {
      docs = docs.filter((document) => document._status === 'published')
    } else if (collection === 'prototypes' && args.draft === true) {
      docs = docs.filter((document) => document._status === 'draft')
    }

    if (args.sort === 'id') {
      docs = [...docs].sort((left, right) => String(left.id).localeCompare(String(right.id)))
    }

    const limit = typeof args.limit === 'number' ? args.limit : docs.length
    return { docs: copy(docs.slice(0, limit)) }
  }

  async update(args: Record<string, unknown>): Promise<LovablePrototypeDocument> {
    this.calls.push({ args: copy(args), method: 'update' })
    const collection = String(args.collection)
    const docs = this.collections.get(collection) ?? []
    const index = docs.findIndex((document) => document.id === args.id)

    if (index === -1) throw new Error(`Cannot update missing ${collection} record ${args.id}.`)

    const document = {
      ...docs[index],
      ...copy(args.data as Record<string, unknown>),
      id: docs[index].id,
    }
    docs[index] = document
    this.collections.set(collection, docs)
    return copy(document)
  }

  documents(collection: string): LovablePrototypeDocument[] {
    return copy(this.collections.get(collection) ?? [])
  }
}

const users: LovablePrototypeDocument[] = [
  { email: 'later@example.test', id: 20, role: 'admin' },
  { email: 'editor@example.test', id: 2, role: 'editor' },
  { email: 'first@example.test', id: 10, role: 'admin' },
]

const idsBy = (documents: LovablePrototypeDocument[], field: string) =>
  Object.fromEntries(documents.map((document) => [String(document[field]), document.id]))

describe('publishLovablePrototypes', () => {
  it('publishes three source-evidenced records idempotently with the intended launch boundaries', async () => {
    const req = { id: 'lovable-publication-migration' }
    const payload = new FakePayload({ collections: { users } })

    await publishLovablePrototypes({ payload, req })

    const firstEvidence = payload.documents('evidence-sources')
    const firstPrototypes = payload.documents('prototypes')
    const firstEvidenceIDs = idsBy(firstEvidence, 'url')
    const firstPrototypeIDs = idsBy(firstPrototypes, 'slug')

    await publishLovablePrototypes({ payload, req })

    const evidence = payload.documents('evidence-sources')
    const prototypes = payload.documents('prototypes')

    expect(evidence).toHaveLength(6)
    expect(prototypes).toHaveLength(3)
    expect(idsBy(evidence, 'url')).toEqual(firstEvidenceIDs)
    expect(idsBy(prototypes, 'slug')).toEqual(firstPrototypeIDs)
    expect(prototypes).toEqual(firstPrototypes)
    expect(payload.calls.filter(({ method }) => method === 'create')).toHaveLength(9)

    for (const source of evidence) {
      expect(source).toMatchObject({
        accessedAt: LOVABLE_PROTOTYPE_VERIFIED_AT,
        allowedSurfaces: ['prototype-hub'],
        permissionStatus: 'public',
        verificationStatus: 'verified',
      })
      expect(String(source.title).length).toBeLessThanOrEqual(140)
      expect(String(source.publisherOrOwner).length).toBeLessThanOrEqual(120)
      expect(String(source.supports).length).toBeLessThanOrEqual(500)
      expect(String(source.internalVerificationNotes).length).toBeLessThanOrEqual(1000)
    }

    for (const prototype of prototypes) {
      expect(prototype).toMatchObject({
        _status: 'published',
        featured: false,
        launchReviewer: 10,
        sourceProvenance: {
          licenseSpdxExpression: 'NOASSERTION',
          relation: 'organization_owned',
          sourceLastCheckedAt: LOVABLE_PROTOTYPE_VERIFIED_AT,
          sourceReviewStatus: 'reviewed',
        },
      })
      expect(prototype.evidenceSources).toHaveLength(2)
      expect(prototype.decisions).not.toHaveLength(0)
      expect(prototype.limitations).not.toHaveLength(0)
      expect(prototype.seo).toMatchObject({ noIndex: false })
      expect(String(prototype.title).length).toBeLessThanOrEqual(100)
      expect(String(prototype.summary).length).toBeLessThanOrEqual(280)
      expect(String(prototype.story).length).toBeLessThanOrEqual(3000)
      expect(String(prototype.problem).length).toBeLessThanOrEqual(800)
      expect(String(prototype.safetyNotice).length).toBeLessThanOrEqual(500)
      expect(String(prototype.dataHandlingNotes).length).toBeLessThanOrEqual(1000)
      expect(String(prototype.availabilityMessage).length).toBeLessThanOrEqual(300)
      expect(String(prototype.operationalNotes).length).toBeLessThanOrEqual(2000)
      expect(
        String((prototype.seo as Record<string, unknown>).metaTitle).length,
      ).toBeLessThanOrEqual(60)
      expect(
        String((prototype.seo as Record<string, unknown>).metaDescription).length,
      ).toBeLessThanOrEqual(160)
      expect(prototype.decisions).toHaveLength(4)
      for (const decision of prototype.decisions as Array<Record<string, unknown>>) {
        expect(String(decision.title).length).toBeLessThanOrEqual(100)
        expect(String(decision.detail).length).toBeLessThanOrEqual(500)
      }
      expect((prototype.limitations as unknown[]).length).toBeLessThanOrEqual(10)
      for (const limitation of prototype.limitations as Array<Record<string, unknown>>) {
        expect(String(limitation.text).length).toBeLessThanOrEqual(300)
      }

      const attachedEvidence = evidence
        .filter((source) =>
          (prototype.evidenceSources as Array<number | string>).includes(source.id),
        )
        .map((source) => ({
          allowedSurfaces: source.allowedSurfaces,
          id: source.id,
          permissionStatus: source.permissionStatus,
          verificationStatus: source.verificationStatus,
        }))
      expect(
        validatePrototypePublication({
          actorRole: 'admin',
          data: prototype,
          evidence: attachedEvidence,
          now: new Date(LOVABLE_PROTOTYPE_VERIFIED_AT),
        }),
      ).toEqual([])
    }

    const lastPress = prototypes.find(({ slug }) => slug === 'the-last-press')
    const psychLab = prototypes.find(({ slug }) => slug === 'psych-lab')
    const borrowedBrain = prototypes.find(({ slug }) => slug === 'borrowed-brain')

    expect(lastPress).toMatchObject({
      appUrl: 'https://the-last-press.lovable.app',
      availabilityStatus: 'degraded',
      launchApproval: 'blocked',
      status: 'concept',
    })
    expect(psychLab).toMatchObject({
      appUrl: 'https://getpsychlab.app',
      availabilityStatus: 'available',
      launchApproval: 'blocked',
      status: 'concept',
    })
    expect(borrowedBrain).toMatchObject({
      appUrl: 'https://borrowed-thinking-lab.lovable.app',
      availabilityStatus: 'available',
      dataClassification: 'synthetic-only',
      launchApproval: 'approved',
      launchApprovedAt: LOVABLE_PROTOTYPE_VERIFIED_AT,
      status: 'prototype',
    })

    expect(mapPrototype(lastPress)?.canLaunch).toBe(false)
    expect(mapPrototype(lastPress)?.appUrl).toBeUndefined()
    expect(mapPrototype(psychLab)?.canLaunch).toBe(false)
    expect(mapPrototype(psychLab)?.appUrl).toBeUndefined()
    expect(mapPrototype(borrowedBrain)).toMatchObject({
      appUrl: 'https://borrowed-thinking-lab.lovable.app/',
      canLaunch: true,
    })

    const prototypeWrites = payload.calls.filter(
      ({ args, method }) =>
        (method === 'create' || method === 'update') && args.collection === 'prototypes',
    )
    expect(prototypeWrites).toHaveLength(3)
    for (const { args } of prototypeWrites) {
      expect(args.req).toEqual(req)
      expect(args).not.toHaveProperty('draft')
      expect(args.context).toEqual({
        allowLovablePrototypePublicationMigrationAdmin: true,
        skipRevalidate: true,
      })
    }
  })

  it('preserves an existing published editorial record byte-for-byte', async () => {
    const editorialPsychLab: LovablePrototypeDocument = {
      _status: 'published',
      featured: true,
      id: 'editorial-psych-lab',
      launchApproval: 'approved',
      slug: 'psych-lab',
      story: 'Editorially reviewed story that the migration must not replace.',
      summary: 'Editorial summary.',
      title: 'Psych Lab — Editorial Edition',
    }
    const payload = new FakePayload({
      collections: {
        prototypes: [editorialPsychLab],
        users,
      },
    })

    await publishLovablePrototypes({ payload, req: { id: 'editorial-preservation' } })

    expect(payload.documents('prototypes')).toHaveLength(3)
    expect(payload.documents('prototypes').find(({ slug }) => slug === 'psych-lab')).toEqual(
      editorialPsychLab,
    )
    expect(
      payload.calls.some(
        ({ args, method }) =>
          method === 'update' &&
          args.collection === 'prototypes' &&
          args.id === editorialPsychLab.id,
      ),
    ).toBe(false)
  })

  it('publishes an existing draft through the reviewed update path without changing its identity', async () => {
    const draft: LovablePrototypeDocument = {
      _status: 'draft',
      id: 'draft-last-press',
      launchApproval: 'not-reviewed',
      slug: 'the-last-press',
      summary: 'Unreviewed draft copy.',
      title: 'Draft Last Press',
    }
    const payload = new FakePayload({
      collections: {
        prototypes: [draft],
        users,
      },
    })

    await publishLovablePrototypes({ payload, req: { id: 'draft-publication' } })

    expect(
      payload.documents('prototypes').find(({ slug }) => slug === 'the-last-press'),
    ).toMatchObject({
      _status: 'published',
      id: draft.id,
      launchApproval: 'blocked',
      launchReviewer: 10,
      summary:
        'A shared-timer social game in which every scarce press resets one global countdown and the last player to act before time expires wins the season.',
    })
    expect(
      payload.calls.some(
        ({ args, method }) =>
          method === 'update' &&
          args.collection === 'prototypes' &&
          args.id === draft.id &&
          (args.context as Record<string, unknown>)
            .allowLovablePrototypePublicationMigrationAdmin === true,
      ),
    ).toBe(true)
  })

  it('fails before writing when no administrator can review the records', async () => {
    const payload = new FakePayload({
      collections: {
        users: [{ email: 'editor@example.test', id: 1, role: 'editor' }],
      },
    })

    await expect(publishLovablePrototypes({ payload })).rejects.toThrow(
      'requires at least one administrator',
    )
    expect(payload.documents('evidence-sources')).toEqual([])
    expect(payload.documents('prototypes')).toEqual([])
  })

  it('uses only the narrowly named migration context to supply the internal admin actor', async () => {
    const payload = new FakePayload({ collections: { users } })
    await publishLovablePrototypes({ payload })
    const prototype = payload.documents('prototypes').find(({ slug }) => slug === 'the-last-press')
    const evidence = payload.documents('evidence-sources')
    const transactionID = 'lovable-publication-hook'
    const execute = vi.fn(async () => ({}))
    const findByID = vi.fn(async ({ id }: { id: number | string }) => {
      const source = evidence.find((candidate) => candidate.id === id)
      if (!source) throw new Error(`Missing source ${id}`)
      return source
    })
    const req = {
      payload: {
        db: {
          execute,
          packageName: '@payloadcms/db-postgres',
          sessions: { [transactionID]: { db: { transactionID } } },
        },
        findByID,
      },
      transactionID,
    }

    await expect(
      validatePrototypeBeforeChange({
        context: { allowLovablePrototypePublicationMigrationAdmin: true },
        data: prototype,
        req,
      } as never),
    ).resolves.toBe(prototype)
    expect(findByID).toHaveBeenCalledWith(expect.objectContaining({ req }))

    try {
      await validatePrototypeBeforeChange({ context: {}, data: prototype, req } as never)
      throw new Error('Expected the unprivileged publication to fail.')
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError)
      expect((error as ValidationError).data.errors).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining('[NOT_ADMIN]') }),
      )
    }
  })

  it('preserves an explicit blocked review on material draft updates while approvals still need a date', async () => {
    const blocked = await validatePrototypeBeforeChange({
      context: { allowLovablePrototypePublicationMigrationAdmin: true },
      data: {
        launchApproval: 'blocked',
        launchReviewer: 10,
        summary: 'Reviewed and blocked after a material change.',
      },
      originalDoc: {
        _status: 'draft',
        launchApproval: 'not-reviewed',
        launchReviewer: null,
        summary: 'Earlier draft.',
      },
      req: {},
    } as never)

    expect(blocked).toMatchObject({
      launchApproval: 'blocked',
      launchReviewer: 10,
    })

    const incompleteApproval = await validatePrototypeBeforeChange({
      context: { allowLovablePrototypePublicationMigrationAdmin: true },
      data: {
        launchApproval: 'approved',
        launchReviewer: 10,
        summary: 'Materially changed without an approval date.',
      },
      originalDoc: {
        _status: 'draft',
        launchApproval: 'not-reviewed',
        launchReviewer: null,
        summary: 'Earlier draft.',
      },
      req: {},
    } as never)

    expect(incompleteApproval).toMatchObject({
      launchApproval: 'not-reviewed',
      launchApprovedAt: null,
      launchReviewer: null,
    })
  })

  it('registers the publication and repair migrations', () => {
    const names = migrations.map((migration) => migration.name)
    const publicationIndex = names.indexOf('20260830_160500_publish_lovable_prototypes')
    const repairIndex = names.indexOf('20260830_163500_retry_lovable_prototype_publication')

    expect(publicationIndex).toBeGreaterThanOrEqual(0)
    expect(repairIndex).toBeGreaterThan(publicationIndex)
  })
})
