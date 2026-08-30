import 'server-only'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { cache } from 'react'

import {
  type HomepagePrototypeFeed,
  type PublicPrototypeDetail,
  type PublicPrototypeList,
} from './types'
import { asRecord, cardSelect, detailSelect, mapList, mapListStrict, mapPrototype } from './mapping'

type UnknownRecord = Record<string, unknown>

type PublicPayload = {
  find: (args: UnknownRecord) => Promise<{
    docs: unknown[]
    hasNextPage?: boolean
    totalDocs?: number
  }>
}

type PublicFindResult = Awaited<ReturnType<PublicPayload['find']>>

async function publicFind(args: UnknownRecord): Promise<PublicFindResult | null> {
  try {
    const payload = (await getPayload({ config: configPromise })) as unknown as PublicPayload

    return await payload.find({
      ...args,
      depth: 1,
      overrideAccess: false,
    })
  } catch (error) {
    const errorName = error instanceof Error ? error.name : 'UnknownError'
    console.error(`[public-content] Payload query unavailable (${errorName})`)
    return null
  }
}

export const getPublicPrototypes = cache(async (): Promise<PublicPrototypeList> => {
  const result = await publicFind({
    collection: 'prototypes',
    limit: 100,
    select: cardSelect,
    sort: '-updatedAt',
    where: {
      _status: { equals: 'published' },
    },
  })

  return mapList(result)
})

export const getPublicSiteContent = cache(
  async (): Promise<{
    homepage: HomepagePrototypeFeed
    prototypes: PublicPrototypeList
  }> => {
    const result = await publicFind({
      collection: 'prototypes',
      limit: 500,
      pagination: true,
      select: detailSelect,
      sort: '-updatedAt',
      where: {
        _status: { equals: 'published' },
      },
    })
    const prototypes = mapListStrict(result)

    if (!result || prototypes.state === 'unavailable') {
      return {
        homepage: { items: [], kind: 'recent', state: 'unavailable' },
        prototypes: { items: [], state: 'unavailable' },
      }
    }

    const itemBySlug = new Map(prototypes.items.map((item) => [item.slug, item]))
    const records = result.docs.map(asRecord)
    const now = Date.now()
    const publicRecords = records.filter((record) => {
      const item = typeof record.slug === 'string' ? itemBySlug.get(record.slug) : undefined
      return Boolean(item && item.status !== 'archived')
    })
    const featuredRecords = publicRecords
      .filter((record) => {
        if (record.featured !== true) return false
        if (record.featureUntil === null || record.featureUntil === undefined) return true
        if (typeof record.featureUntil !== 'string') return false

        const deadline = Date.parse(record.featureUntil)
        return !Number.isNaN(deadline) && deadline > now
      })
      .sort((left, right) => {
        const leftOrder = typeof left.featuredOrder === 'number' ? left.featuredOrder : Infinity
        const rightOrder = typeof right.featuredOrder === 'number' ? right.featuredOrder : Infinity
        if (leftOrder !== rightOrder) return leftOrder - rightOrder

        const leftUpdated = typeof left.updatedAt === 'string' ? Date.parse(left.updatedAt) : 0
        const rightUpdated = typeof right.updatedAt === 'string' ? Date.parse(right.updatedAt) : 0
        return rightUpdated - leftUpdated
      })
    const homepageRecords = featuredRecords.length ? featuredRecords : publicRecords
    const homepageItems = homepageRecords
      .slice(0, 3)
      .map((record) => (typeof record.slug === 'string' ? itemBySlug.get(record.slug) : undefined))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))

    return {
      homepage: {
        items: homepageItems,
        kind: featuredRecords.length ? 'featured' : 'recent',
        state: homepageItems.length ? 'ready' : 'empty',
      },
      prototypes,
    }
  },
)

export const getHomepagePrototypes = cache(async (): Promise<HomepagePrototypeFeed> => {
  const now = new Date().toISOString()
  const featured = await publicFind({
    collection: 'prototypes',
    limit: 3,
    select: cardSelect,
    sort: ['featuredOrder', '-updatedAt'],
    where: {
      and: [
        { _status: { equals: 'published' } },
        { featured: { equals: true } },
        { status: { not_equals: 'archived' } },
        {
          or: [{ featureUntil: { exists: false } }, { featureUntil: { greater_than: now } }],
        },
      ],
    },
  })
  const featuredList = mapList(featured)

  if (featuredList.state === 'unavailable') {
    return { ...featuredList, kind: 'featured' }
  }

  if (featuredList.items.length) {
    return { ...featuredList, kind: 'featured' }
  }

  const recent = await publicFind({
    collection: 'prototypes',
    limit: 3,
    select: cardSelect,
    sort: '-updatedAt',
    where: {
      and: [{ _status: { equals: 'published' } }, { status: { not_equals: 'archived' } }],
    },
  })

  return { ...mapList(recent), kind: 'recent' }
})

export const getPublicPrototypeBySlug = cache(
  async (slug: string): Promise<PublicPrototypeDetail> => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return { item: null, state: 'not-found' }
    }

    const result = await publicFind({
      collection: 'prototypes',
      limit: 1,
      select: detailSelect,
      where: {
        and: [{ _status: { equals: 'published' } }, { slug: { equals: slug } }],
      },
    })

    if (!result) return { item: null, state: 'unavailable' }

    const item = result.docs.length ? mapPrototype(result.docs[0]) : null
    return item ? { item, state: 'ready' } : { item: null, state: 'not-found' }
  },
)
