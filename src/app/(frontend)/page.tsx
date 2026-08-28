import Link from 'next/link'

import { HomePrototypeSection } from '@/components/home/HomePrototypeSection'
import { ReadinessPreview } from '@/components/home/ReadinessPreview'
import { getHomepagePrototypes } from '@/lib/public-content/prototypes'

export const dynamic = 'force-dynamic'

const situations = [
  {
    body: 'Find the gaps between demo and production.',
    cta: 'Check production readiness',
    href: '/readiness',
    title: 'I built a prototype',
  },
  {
    body: 'Design and build the critical product path.',
    cta: 'Explore Prototype to Production',
    href: '/#prototype-to-production',
    title: 'I need to ship',
  },
  {
    body: 'Diagnose architecture, reliability, security, or cost.',
    cta: 'Explore Engineering Rescue',
    href: '/#engineering-rescue',
    title: 'Something is broken',
  },
  {
    body: 'Add hands-on principal-level judgment without a permanent hire.',
    cta: 'Explore Fractional Principal Engineer',
    href: '/#fractional-principal-engineer',
    title: 'I need senior leadership',
  },
]

const offers = [
  {
    body: 'Close the gaps in architecture, security, observability, deployment, and ownership before real users expose them.',
    id: 'prototype-to-production',
    title: 'Prototype to Production',
  },
  {
    body: 'Find the failure mode, stabilize the critical path, and leave the system easier to operate.',
    id: 'engineering-rescue',
    title: 'Engineering Rescue',
  },
  {
    body: 'Add senior technical direction and hands-on execution without a permanent leadership hire.',
    id: 'fractional-principal-engineer',
    title: 'Fractional Principal Engineer',
  },
]

const proof = [
  {
    body: 'Worked across backend services and product interfaces supporting Brave’s privacy-preserving advertising and rewards ecosystem.',
    label: 'PRIOR EMPLOYER ROLE · BRAVE',
    title: 'Privacy-aligned advertising and rewards infrastructure',
  },
  {
    body: 'Helped establish early durable workflows, cloud deployment, service communication, and Solana/Metaplex integration.',
    label: 'PRIOR EMPLOYER ROLE · BAXUS',
    title: 'Early architecture joining physical assets and digital ownership',
  },
  {
    body: 'Contributed to TLSNotary tooling, load testing, Nitro Enclave/EKS deployment, and remote-attestation components.',
    label: 'TEAM ROLE · ETERNIS',
    title: 'Trusted execution for auditable data workflows',
  },
  {
    body: 'An open-source HashiCorp Vault plugin prototype for creating Solana accounts and signing with them.',
    label: 'OPEN-SOURCE CONTRIBUTION · SOLANA SECRETS ENGINE',
    title: 'Vault-backed Solana account creation and signing',
  },
]

export default async function HomePage() {
  const prototypeFeed = await getHomepagePrototypes()

  return (
    <>
      <section className="hero">
        <div className="shell hero__grid">
          <div className="hero__copy">
            <p className="eyebrow">SABERISTIC / PROTOTYPE → PRODUCTION</p>
            <h1>
              You built the prototype. <em>We make it production-ready.</em>
            </h1>
            <p className="hero__lede">
              Senior architecture and hands-on engineering for AI and software products that need to
              survive real users, sensitive data, and operational reality.
            </p>
            <div className="action-row">
              <Link className="button" href="/readiness">
                Check production readiness
              </Link>
              <Link className="button button--quiet" href="/prototypes">
                Explore prototypes
              </Link>
            </div>
            <p className="trust-line">
              Founder-led engineering experience across Brave, BAXUS, Eternis, Spiral Safe, and
              open-source security systems. Relationships are labeled clearly.
            </p>
          </div>
          <ReadinessPreview compact />
        </div>
      </section>

      <HomePrototypeSection feed={prototypeFeed} />

      <section aria-labelledby="situations-heading" className="section">
        <div className="shell">
          <div className="section-intro">
            <p className="eyebrow">02 / WHERE I HELP</p>
            <h2 id="situations-heading">Bring the difficult part.</h2>
            <p>
              Start with the situation you recognize. Each path leads to a specific next step—not a
              generic consultation funnel.
            </p>
          </div>
          <div className="situation-grid">
            {situations.map((situation, index) => (
              <article className="situation-card" key={situation.title}>
                <span aria-hidden="true">0{index + 1}</span>
                <h3>{situation.title}</h3>
                <p>{situation.body}</p>
                <Link className="text-link" href={situation.href}>
                  {situation.cta} <span aria-hidden="true">→</span>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="proof-heading" className="section section--ink" id="work">
        <div className="shell">
          <div className="section-intro section-intro--light">
            <p className="eyebrow">03 / SELECTED PROOF</p>
            <h2 id="proof-heading">
              Built inside systems where privacy, money, and reliability matter.
            </h2>
            <p>
              Saberistic is led by AmirSaber Sharifi, a hands-on engineer and architect with more
              than a decade of experience across privacy-preserving products, payments, marketplace
              infrastructure, trusted execution, and cloud systems.
            </p>
          </div>
          <div className="proof-grid">
            {proof.map((item) => (
              <article className="proof-card" key={item.label}>
                <p className="proof-card__label">{item.label}</p>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
          <Link className="text-link text-link--light" href="/#work">
            See verified work <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <section aria-labelledby="offers-heading" className="section" id="services">
        <div className="shell offer-layout">
          <div className="section-intro section-intro--sticky">
            <p className="eyebrow">04 / WAYS TO WORK TOGETHER</p>
            <h2 id="offers-heading">Make the system legible. Then change it.</h2>
            <p>
              Assess the real constraint, separate blockers from distractions, and build the
              smallest durable path forward.
            </p>
          </div>
          <div className="offer-list">
            {offers.map((offer, index) => (
              <article id={offer.id} key={offer.id}>
                <span aria-hidden="true">0{index + 1}</span>
                <div>
                  <h3>{offer.title}</h3>
                  <p>{offer.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="about-heading" className="section section--about" id="about">
        <div className="shell about-layout">
          <p className="eyebrow">05 / ABOUT</p>
          <div>
            <h2 id="about-heading">Engineering judgment, backed by implementation.</h2>
            <p>
              Saberistic is led by AmirSaber Sharifi, a software architect, engineering leader, and
              lifelong builder. The common thread across staff engineering, early-stage
              architecture, technical leadership, and founder-led products is hands-on judgment:
              understand the product, find the critical system boundary, and implement what the
              architecture requires.
            </p>
          </div>
          <a className="text-link" href="https://github.com/saberistic" rel="me">
            Review public work <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>
    </>
  )
}
