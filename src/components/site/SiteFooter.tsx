import Image from 'next/image'
import Link from 'next/link'

import saberisticMark from '@/assets/saberistic-mark.png'
import { TrackedLink } from '@/components/analytics/TrackedLink'

const footerLinks = [
  { href: '/prototypes', label: 'Prototypes' },
  { href: '/gifts', label: 'Gift game' },
  { href: '/build-notes', label: 'Build notes' },
  { href: '/#work', label: 'Work' },
  { href: '/#services', label: 'Services' },
  { href: '/#about', label: 'About' },
  { href: '/readiness', label: 'Readiness check' },
  { href: '/privacy', label: 'Privacy' },
]

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell">
        <section aria-labelledby="footer-cta-heading" className="footer-cta" id="contact">
          <p className="eyebrow">THE NEXT HONEST STEP</p>
          <div>
            <h2 id="footer-cta-heading">
              Have a working prototype and an unclear path to production?
            </h2>
            <p>
              Start with the $200 Architecture Diagnostic: a guided readiness brief, a focused
              principal-engineer review, and a concrete path to the next production gate.
            </p>
          </div>
          <TrackedLink
            analyticsEvent={{
              data: { cta: 'architecture_diagnostic', placement: 'footer' },
              name: 'primary_cta_clicked',
            }}
            className="button"
            href="/readiness?next=architecture-diagnostic"
          >
            Start the Architecture Diagnostic
          </TrackedLink>
        </section>

        <div className="footer-grid">
          <div>
            <Link className="wordmark wordmark--footer" href="/" prefetch={false}>
              <Image
                alt=""
                className="wordmark__mark"
                height={32}
                src={saberisticMark}
                width={32}
              />
              <span>SABERISTIC</span>
            </Link>
            <p className="footer-note">
              Saberistic is led by AmirSaber Sharifi. Senior engineering for ambitious products.
            </p>
          </div>

          <nav aria-label="Footer">
            <ul className="footer-links">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} prefetch={false}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="footer-links footer-links--external">
            <a href="https://github.com/saberistic-team" rel="me">
              GitHub — Saberistic
            </a>
            <a href="https://github.com/saberistic" rel="me">
              GitHub — AmirSaber
            </a>
            <a href="https://www.linkedin.com/in/saberistic/" rel="me">
              LinkedIn — AmirSaber
            </a>
          </div>
        </div>

        <p className="footer-legal">© {new Date().getFullYear()} Saberistic.</p>
      </div>
    </footer>
  )
}
