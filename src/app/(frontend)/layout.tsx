import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { UmamiAnalytics } from '@/components/analytics/UmamiAnalytics'
import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'
import { SkipLink } from '@/components/site/SkipLink'
import { siteDescription, siteName, siteTitle, siteURL } from '@/lib/seo'

import './styles.css'

export const metadata: Metadata = {
  applicationName: siteName,
  authors: [{ name: 'AmirSaber Sharifi', url: new URL('/#about', siteURL) }],
  category: 'technology',
  creator: 'AmirSaber Sharifi',
  description: siteDescription,
  formatDetection: {
    address: false,
    email: false,
    telephone: false,
  },
  metadataBase: siteURL,
  publisher: siteName,
  robots: {
    follow: true,
    googleBot: {
      follow: true,
      index: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
    index: true,
  },
  title: {
    default: siteTitle,
    template: '%s — Saberistic',
  },
}

export default function FrontendLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SkipLink />
        <SiteHeader />
        <main id="main-content">{children}</main>
        <SiteFooter />
        <UmamiAnalytics />
      </body>
    </html>
  )
}
