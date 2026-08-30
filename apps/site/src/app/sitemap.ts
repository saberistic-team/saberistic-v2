import type { MetadataRoute } from 'next'

import { getPublicPrototypes } from '@/lib/public-content/prototypes'

export const dynamic = 'force-static'

function validModifiedAt(value?: string): Date | undefined {
  if (!value) return undefined

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const prototypes = await getPublicPrototypes()
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      changeFrequency: 'weekly',
      priority: 1,
      url: 'https://saberistic.com/',
    },
    {
      changeFrequency: 'weekly',
      priority: 0.9,
      url: 'https://saberistic.com/prototypes/',
    },
    {
      changeFrequency: 'monthly',
      priority: 0.8,
      url: 'https://saberistic.com/readiness/',
    },
    {
      changeFrequency: 'yearly',
      priority: 0.3,
      url: 'https://saberistic.com/privacy/',
    },
  ]

  const prototypeRoutes: MetadataRoute.Sitemap = prototypes.items.map((prototype) => {
    const lastModified = validModifiedAt(prototype.updatedAt)

    return {
      changeFrequency: 'monthly',
      ...(lastModified ? { lastModified } : {}),
      priority: 0.7,
      url: `https://saberistic.com/prototypes/${prototype.slug}/`,
    }
  })

  return [...staticRoutes, ...prototypeRoutes]
}
