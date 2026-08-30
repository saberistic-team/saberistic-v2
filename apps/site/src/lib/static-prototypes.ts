import 'server-only'

import { cache } from 'react'

import type { PublicPrototypeDetail } from '@/lib/public-content/types'

import { readGeneratedPublicSiteSnapshot } from './snapshot-source'

const getSnapshot = cache(async () => readGeneratedPublicSiteSnapshot())

export const getPublicPrototypes = cache(async () => (await getSnapshot()).prototypes)

export const getHomepagePrototypes = cache(async () => (await getSnapshot()).homepage)

export const getPublicPrototypeBySlug = cache(
  async (slug: string): Promise<PublicPrototypeDetail> => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return { item: null, state: 'not-found' }
    }

    const item = (await getSnapshot()).prototypes.items.find((prototype) => prototype.slug === slug)

    return item ? { item, state: 'ready' } : { item: null, state: 'not-found' }
  },
)
