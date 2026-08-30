import type { Metadata } from 'next'

export const siteDescription =
  'Senior architecture and hands-on engineering for ambitious AI and software products.'
export const siteName = 'Saberistic'
export const siteTitle = 'Saberistic — Prototype to Production'
export const siteURL = new URL('https://saberistic.com')

const socialImage = {
  alt: 'Saberistic logo',
  height: 400,
  url: new URL('/brand/saberistic-mark.png', siteURL),
  width: 400,
}

export function createPageMetadata({
  article,
  description,
  path,
  title,
}: {
  article?: {
    modifiedTime?: string
    publishedTime: string
    tags?: string[]
  }
  description: string
  path: string
  title?: string
}): Metadata {
  const canonical = new URL(path, siteURL)
  const resolvedTitle = title ? `${title} — ${siteName}` : siteTitle

  return {
    alternates: { canonical },
    description,
    openGraph: {
      ...(article
        ? {
            authors: ['https://saberistic.com/#about'],
            modifiedTime: article.modifiedTime,
            publishedTime: article.publishedTime,
            tags: article.tags,
            type: 'article' as const,
          }
        : { type: 'website' as const }),
      description,
      images: [socialImage],
      locale: 'en_US',
      siteName,
      title: resolvedTitle,
      url: canonical,
    },
    title: title ?? { absolute: siteTitle },
    twitter: {
      card: 'summary',
      description,
      images: [socialImage],
      title: resolvedTitle,
    },
  }
}
