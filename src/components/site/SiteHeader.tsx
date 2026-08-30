import Image from 'next/image'
import Link from 'next/link'

import saberisticMark from '@/assets/saberistic-mark.png'

import { SiteNav } from './SiteNav'

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell site-header__inner">
        <Link className="wordmark" href="/" prefetch={false}>
          <Image
            alt=""
            className="wordmark__mark"
            height={32}
            src={saberisticMark}
            width={32}
          />
          <span className="wordmark__copy">
            <span>SABERISTIC</span>
            <span aria-hidden="true" className="wordmark__descriptor">
              PROTOTYPE → PRODUCTION
            </span>
          </span>
        </Link>
        <SiteNav />
      </div>
    </header>
  )
}
