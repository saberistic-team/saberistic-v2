import Link from 'next/link'

import { TrackedLink } from '@/components/analytics/TrackedLink'
import { HomeBuildNotesSection } from '@/components/home/HomeBuildNotesSection'
import { HomePrototypeSection } from '@/components/home/HomePrototypeSection'
import { ReadinessPreview } from '@/components/home/ReadinessPreview'
import { JsonLd } from '@/components/seo/JsonLd'
import type { AnalyticsEvent } from '@/lib/analytics/events'
import { getHomepagePrototypes } from '@/lib/public-content/prototypes'
import { createPageMetadata, siteDescription } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export const metadata = createPageMetadata({
  description: siteDescription,
  path: '/',
})

const homepageStructuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@id': 'https://saberistic.com/#website',
      '@type': 'WebSite',
      name: 'Saberistic',
      publisher: { '@id': 'https://saberistic.com/#organization' },
      url: 'https://saberistic.com/',
    },
    {
      '@id': 'https://saberistic.com/#organization',
      '@type': 'Organization',
      founder: { '@id': 'https://saberistic.com/#amir-saber-sharifi' },
      logo: {
        '@type': 'ImageObject',
        contentUrl: 'https://saberistic.com/brand/saberistic-mark.png',
        height: 400,
        width: 400,
      },
      name: 'Saberistic',
      sameAs: ['https://github.com/saberistic-team'],
      url: 'https://saberistic.com/',
    },
    {
      '@id': 'https://saberistic.com/#amir-saber-sharifi',
      '@type': 'Person',
      name: 'AmirSaber Sharifi',
      sameAs: ['https://github.com/saberistic', 'https://www.linkedin.com/in/saberistic/'],
      url: 'https://saberistic.com/#about',
      worksFor: { '@id': 'https://saberistic.com/#organization' },
    },
  ],
}

const situations = [
  {
    body: 'Find the gaps between demo and production.',
    cta: 'Check production readiness',
    event: {
      data: { cta: 'check_readiness', placement: 'situation' },
      name: 'primary_cta_clicked',
    },
    href: '/readiness',
    title: 'I built a prototype',
  },
  {
    body: 'Design and build the critical product path.',
    cta: 'Explore Prototype to Production',
    event: {
      data: { service: 'prototype_to_production' },
      name: 'service_viewed',
    },
    href: '/#prototype-to-production',
    title: 'I need to ship',
  },
  {
    body: 'Diagnose architecture, reliability, security, or cost.',
    cta: 'Explore Engineering Rescue',
    event: {
      data: { service: 'engineering_rescue' },
      name: 'service_viewed',
    },
    href: '/#engineering-rescue',
    title: 'Something is broken',
  },
  {
    body: 'Add hands-on principal-level judgment without a permanent hire.',
    cta: 'Explore Fractional Principal Engineer',
    event: {
      data: { service: 'fractional_principal_engineer' },
      name: 'service_viewed',
    },
    href: '/#fractional-principal-engineer',
    title: 'I need senior leadership',
  },
] satisfies Array<{
  body: string
  cta: string
  event: AnalyticsEvent
  href: string
  title: string
}>

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
    body: 'Public contribution history covers advertiser workflow and reporting work in ads-ui plus credential-support changes in bat-go.',
    label: 'PRIOR EMPLOYER ROLE · BRAVE',
    title: 'Privacy-aligned advertising and rewards infrastructure',
  },
  {
    body: 'Public evidence supports early platform architecture and Temporal-based transaction-workflow contributions.',
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
      <JsonLd data={homepageStructuredData} id="homepage-structured-data" />
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
              <TrackedLink
                analyticsEvent={{
                  data: { cta: 'check_readiness', placement: 'home_hero' },
                  name: 'primary_cta_clicked',
                }}
                className="button"
                href="/readiness"
              >
                Check production readiness
              </TrackedLink>
              <TrackedLink
                analyticsEvent={{
                  data: { cta: 'explore_prototypes', placement: 'home_hero' },
                  name: 'primary_cta_clicked',
                }}
                className="button button--quiet"
                href="/prototypes"
              >
                Explore prototypes
              </TrackedLink>
            </div>
            <p className="trust-line">
              Founder-led engineering experience across Brave, BAXUS, Eternis, and open-source
              security systems. Relationships are labeled clearly.
            </p>
          </div>
          <ReadinessPreview compact />
        </div>
      </section>

      <HomePrototypeSection feed={prototypeFeed} />

      <HomeBuildNotesSection />

      <section aria-labelledby="situations-heading" className="section">
        <div className="shell">
          <div className="section-intro">
            <p className="eyebrow">03 / WHERE I HELP</p>
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
                <TrackedLink
                  analyticsEvent={situation.event}
                  className="text-link"
                  href={situation.href}
                >
                  {situation.cta} <span aria-hidden="true">→</span>
                </TrackedLink>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="proof-heading" className="section section--ink" id="work">
        <div className="shell">
          <div className="section-intro section-intro--light">
            <p className="eyebrow">04 / SELECTED PROOF</p>
            <h2 id="proof-heading">
              Built inside systems where privacy, money, and reliability matter.
            </h2>
            <p>
              Saberistic is led by AmirSaber Sharifi, a hands-on engineer and architect with
              experience across privacy-preserving products, payments, marketplace infrastructure,
              trusted execution, and cloud systems.
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
            <p className="eyebrow">05 / WAYS TO WORK TOGETHER</p>
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
          <p className="eyebrow">06 / ABOUT</p>
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
