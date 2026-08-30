'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { TrackedLink } from '@/components/analytics/TrackedLink'

const links = [
  { href: '/prototypes', label: 'Prototypes' },
  { href: '/build-notes', label: 'Build notes' },
  { href: '/#work', label: 'Work' },
  { href: '/#services', label: 'Services' },
  { href: '/#about', label: 'About' },
  { href: '/#contact', label: 'Contact' },
]

function isCurrent(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function SiteNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Primary" className="site-nav">
      <ul className="site-nav__list">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              aria-current={isCurrent(pathname, link.href) ? 'page' : undefined}
              className="site-nav__link"
              href={link.href}
              prefetch={false}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
      <TrackedLink
        analyticsEvent={{
          data: { cta: 'check_readiness', placement: 'header' },
          name: 'primary_cta_clicked',
        }}
        className="button button--small"
        href="/readiness"
      >
        Check readiness
      </TrackedLink>
    </nav>
  )
}
