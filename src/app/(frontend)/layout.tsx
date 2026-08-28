import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'
import { SkipLink } from '@/components/site/SkipLink'

import './styles.css'

export const metadata: Metadata = {
  description:
    'Senior architecture and hands-on engineering for ambitious AI and software products.',
  title: {
    default: 'Saberistic — Prototype to Production',
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
      </body>
    </html>
  )
}
