import type { MetadataRoute } from 'next'

export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  return {
    host: 'https://saberistic.com',
    rules: {
      allow: '/',
      disallow: ['/admin/', '/api/'],
      userAgent: '*',
    },
    sitemap: 'https://saberistic.com/sitemap.xml',
  }
}
