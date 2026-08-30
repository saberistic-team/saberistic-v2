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
  description,
  path,
  title,
}: {
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
      description,
      images: [socialImage],
      locale: 'en_US',
      siteName,
      title: resolvedTitle,
      type: 'website',
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
