import { describe, expect, it } from 'vitest'

import {
  seedPreparedContent,
  type SeedDocument,
  type SeedPayload,
} from '../../src/lib/seedPreparedContent'

type LocalCall = {
  args: Record<string, unknown>
  method: keyof SeedPayload
}

type FakeSeedPayloadOptions = {
  collections?: Record<string, SeedDocument[]>
  globals?: Record<string, Record<string, unknown>>
}

const copy = <Value>(value: Value): Value => structuredClone(value)

class FakeSeedPayload implements SeedPayload {
  readonly calls: LocalCall[] = []

  private readonly collections = new Map<string, SeedDocument[]>()
  private readonly globals = new Map<string, Record<string, unknown>>()
  private nextID = 1

  constructor({ collections = {}, globals = {} }: FakeSeedPayloadOptions = {}) {
    for (const [name, docs] of Object.entries(collections)) {
      this.collections.set(name, copy(docs))
    }

    for (const [slug, global] of Object.entries(globals)) {
      this.globals.set(slug, copy(global))
    }
  }

  async create(args: Record<string, unknown>): Promise<SeedDocument> {
    this.record('create', args)
    const collection = this.collectionName(args)
    const data = copy(args.data as Record<string, unknown>)
    const document = { ...data, id: `seed-${this.nextID++}` }
    const docs = this.collections.get(collection) ?? []

    docs.push(document)
    this.collections.set(collection, docs)
    return copy(document)
  }

  async find(args: Record<string, unknown>): Promise<{ docs: SeedDocument[] }> {
    this.record('find', args)
    const collection = this.collectionName(args)
    const [field, condition] = Object.entries(args.where as Record<string, { equals: unknown }>)[0]
    const limit = typeof args.limit === 'number' ? args.limit : Number.POSITIVE_INFINITY
    const docs = (this.collections.get(collection) ?? [])
      .filter((document) => document[field] === condition.equals)
      .slice(0, limit)

    return { docs: copy(docs) }
  }

  async findGlobal(args: Record<string, unknown>): Promise<Record<string, unknown>> {
    this.record('findGlobal', args)
    return copy(this.globals.get(String(args.slug)) ?? {})
  }

  async update(args: Record<string, unknown>): Promise<SeedDocument> {
    this.record('update', args)
    const collection = this.collectionName(args)
    const docs = this.collections.get(collection) ?? []
    const index = docs.findIndex((document) => document.id === args.id)

    if (index === -1) throw new Error(`Cannot update missing ${collection} record ${args.id}.`)

    const updated = {
      ...docs[index],
      ...copy(args.data as Record<string, unknown>),
      id: docs[index].id,
    }
    docs[index] = updated
    this.collections.set(collection, docs)
    return copy(updated)
  }

  async updateGlobal(args: Record<string, unknown>): Promise<Record<string, unknown>> {
    this.record('updateGlobal', args)
    const slug = String(args.slug)
    const updated = {
      ...(this.globals.get(slug) ?? {}),
      ...copy(args.data as Record<string, unknown>),
    }

    this.globals.set(slug, updated)
    return copy(updated)
  }

  documents(collection: string): SeedDocument[] {
    return copy(this.collections.get(collection) ?? [])
  }

  global(slug: string): Record<string, unknown> {
    return copy(this.globals.get(slug) ?? {})
  }

  private collectionName(args: Record<string, unknown>): string {
    const collection = String(args.collection)
    if (collection === 'users') throw new Error('The prepared-content seed must not touch users.')
    return collection
  }

  private record(method: keyof SeedPayload, args: Record<string, unknown>): void {
    this.calls.push({ args, method })
  }
}

const repositoryURLs = [
  'https://github.com/saberistic-team/back-then',
  'https://github.com/saberistic-team/frescopay',
  'https://github.com/saberistic-team/tadading',
  'https://github.com/saberistic-team/story-sprout-pay',
]

const idsBy = (documents: SeedDocument[], field: string) =>
  Object.fromEntries(documents.map((document) => [String(document[field]), document.id]))

describe('seedPreparedContent', () => {
  it('idempotently upserts linked evidence and draft prototypes without replacing site copy', async () => {
    const req = { id: 'authenticated-seed-request' }
    const existingCore = {
      canonicalOrigin: 'https://studio.example',
      defaultPrimaryActionId: 'custom_primary_action',
      defaultSeo: {
        description: 'Existing description that must remain intact.',
        title: 'Existing SEO title',
      },
      legalFooter: 'Existing legal footer.',
      siteName: 'Existing Studio Name',
      tagline: 'Existing custom tagline.',
    }
    const payload = new FakeSeedPayload({
      globals: {
        'site-settings': {
          ...existingCore,
          organization: {
            name: 'Existing Organization',
            url: 'https://organization.example',
          },
        },
      },
    })

    await seedPreparedContent({
      canonicalOrigin: 'https://saberistic.com',
      payload,
      req,
    })

    const firstEvidenceIDs = idsBy(payload.documents('evidence-sources'), 'url')
    const firstPrototypeIDs = idsBy(payload.documents('prototypes'), 'slug')

    await seedPreparedContent({
      canonicalOrigin: 'https://saberistic.com',
      payload,
      req,
    })

    const evidence = payload.documents('evidence-sources')
    const prototypes = payload.documents('prototypes')

    expect(evidence).toHaveLength(4)
    expect(prototypes).toHaveLength(4)
    expect(idsBy(evidence, 'url')).toEqual(firstEvidenceIDs)
    expect(idsBy(prototypes, 'slug')).toEqual(firstPrototypeIDs)
    expect(payload.calls.filter(({ method }) => method === 'create')).toHaveLength(8)

    for (const repositoryURL of repositoryURLs) {
      const source = evidence.find((document) => document.url === repositoryURL)
      const prototype = prototypes.find((document) => document.sourceUrl === repositoryURL)

      expect(source).toBeDefined()
      expect(prototype).toMatchObject({
        _status: 'draft',
        evidenceSources: [source?.id],
        featured: false,
        launchApproval: 'not-reviewed',
      })
    }

    const siteSettings = payload.global('site-settings')
    expect(siteSettings).toMatchObject(existingCore)
    expect(siteSettings.socialLinks).toEqual([
      {
        label: 'Saberistic Team on GitHub',
        platform: 'github',
        url: 'https://github.com/saberistic-team',
      },
      {
        label: 'AmirSaber Sharifi on GitHub',
        platform: 'github',
        url: 'https://github.com/saberistic',
      },
      {
        label: 'AmirSaber Sharifi on LinkedIn',
        platform: 'linkedin',
        url: 'https://www.linkedin.com/in/saberistic',
      },
    ])
    expect(siteSettings.organization).toEqual({
      name: 'Existing Organization',
      sameAs: [
        { url: 'https://github.com/saberistic-team' },
        { url: 'https://github.com/saberistic' },
      ],
      url: 'https://organization.example',
    })

    expect(payload.calls).not.toHaveLength(0)
    for (const call of payload.calls) expect(call.args.req).toBe(req)
    expect(payload.calls.map(({ args }) => args.collection).filter(Boolean)).not.toContain('users')
  })

  it('leaves an existing published prototype untouched', async () => {
    const publishedBackThen: SeedDocument = {
      _status: 'published',
      featured: true,
      id: 'published-backthen',
      slug: 'backthen',
      summary: 'Editorially approved live copy.',
      title: 'BackThen — Live',
    }
    const payload = new FakeSeedPayload({
      collections: {
        prototypes: [publishedBackThen],
      },
    })

    await seedPreparedContent({
      canonicalOrigin: 'https://saberistic.com',
      payload,
      req: { id: 'published-preservation-request' },
    })

    const prototypes = payload.documents('prototypes')
    expect(prototypes).toHaveLength(4)
    expect(prototypes.find(({ slug }) => slug === 'backthen')).toEqual(publishedBackThen)
    expect(
      payload.calls.some(
        ({ args, method }) =>
          method === 'update' &&
          args.collection === 'prototypes' &&
          args.id === publishedBackThen.id,
      ),
    ).toBe(false)
  })
})
