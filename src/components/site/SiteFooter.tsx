import Link from 'next/link'

const footerLinks = [
  { href: '/prototypes', label: 'Prototypes' },
  { href: '/#work', label: 'Work' },
  { href: '/#services', label: 'Services' },
  { href: '/#about', label: 'About' },
  { href: '/readiness', label: 'Readiness preview' },
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
              Start with the $200 Architecture Diagnostic: a focused principal-engineer review of
              the system, tradeoffs, and next steps.
            </p>
          </div>
          <Link className="button" href="/readiness?next=architecture-diagnostic">
            Start the Architecture Diagnostic
          </Link>
        </section>

        <div className="footer-grid">
          <div>
            <Link className="wordmark wordmark--footer" href="/">
              SABERISTIC
            </Link>
            <p className="footer-note">
              Saberistic is led by AmirSaber Sharifi. Senior engineering for ambitious products.
            </p>
          </div>

          <nav aria-label="Footer">
            <ul className="footer-links">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
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
          </div>
        </div>

        <p className="footer-legal">© {new Date().getFullYear()} Saberistic.</p>
      </div>
    </footer>
  )
}
