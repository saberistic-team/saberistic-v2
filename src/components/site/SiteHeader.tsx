import Link from 'next/link'

import { SiteNav } from './SiteNav'

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell site-header__inner">
        <Link aria-label="Saberistic home" className="wordmark" href="/">
          <span>SABERISTIC</span>
          <span aria-hidden="true" className="wordmark__descriptor">
            PROTOTYPE → PRODUCTION
          </span>
        </Link>
        <SiteNav />
      </div>
    </header>
  )
}
