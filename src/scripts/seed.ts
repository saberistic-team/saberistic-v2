import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../payload.config'

const SNAPSHOT = '2026-08-28T00:00:00.000Z'
const PUBLIC_CONCEPTS = process.env.SEED_PUBLIC_CONCEPTS === 'true'

type SeedDocument = Record<string, unknown> & {
  id: number | string
}

type SeedPayload = {
  create: (args: Record<string, unknown>) => Promise<SeedDocument>
  find: (args: Record<string, unknown>) => Promise<{ docs: SeedDocument[] }>
  findGlobal: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
  update: (args: Record<string, unknown>) => Promise<SeedDocument>
  updateGlobal: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
}

const evidenceSeeds = [
  {
    accessedAt: SNAPSHOT,
    allowedSurfaces: ['prototype-hub'],
    internalVerificationNotes:
      'Supports repository and README facts only; not production readiness, adoption, privacy review, or complete functionality.',
    permissionStatus: 'public',
    publisherOrOwner: 'saberistic-team',
    sourceType: 'repository',
    strength: 'first-party-public',
    supports:
      'Saberistic Team publishes the back-then repository; its README describes an MIT-licensed Milestone 0 foundation and links a Vercel deployment.',
    title: 'BackThen public repository',
    url: 'https://github.com/saberistic-team/back-then',
    verificationStatus: 'verified',
  },
  {
    accessedAt: SNAPSHOT,
    allowedSurfaces: ['prototype-hub'],
    internalVerificationNotes:
      'Supports the educational and synthetic implementation boundary only.',
    permissionStatus: 'public',
    publisherOrOwner: 'saberistic-team',
    sourceType: 'repository',
    strength: 'first-party-public',
    supports:
      'Saberistic Team publishes an MIT-licensed educational USDC-to-MXN laboratory whose README explicitly excludes real money, chains, banks, and compliance vendors.',
    title: 'FrescoPay public repository',
    url: 'https://github.com/saberistic-team/frescopay',
    verificationStatus: 'verified',
  },
  {
    accessedAt: SNAPSHOT,
    allowedSurfaces: ['prototype-hub'],
    internalVerificationNotes:
      'Does not establish a public deployment, working subscriptions, production readiness, or a reviewed license.',
    permissionStatus: 'public',
    publisherOrOwner: 'saberistic-team',
    sourceType: 'repository',
    strength: 'first-party-public',
    supports:
      'Saberistic Team publishes the tadading repository, which describes a daily visual-puzzle subscription application in an in-progress Phase 2.',
    title: 'TadaDing public repository',
    url: 'https://github.com/saberistic-team/tadading',
    verificationStatus: 'verified',
  },
  {
    accessedAt: SNAPSHOT,
    allowedSurfaces: ['prototype-hub'],
    internalVerificationNotes:
      'Does not verify payment safety, royalty correctness, moderation, content licensing, privacy, or production readiness.',
    permissionStatus: 'public',
    publisherOrOwner: 'saberistic-team',
    sourceType: 'repository',
    strength: 'first-party-public',
    supports:
      'Saberistic Team publishes a collaborative-storytelling prototype repository whose README describes AI assistance, Stripe payments, royalties, and a Lovable deployment URL.',
    title: 'Story Sprout Pay public repository',
    url: 'https://github.com/saberistic-team/story-sprout-pay',
    verificationStatus: 'verified',
  },
] as const

const prototypeSeeds = [
  {
    appUrl: 'https://backthen-mu.vercel.app',
    availabilityCheckedAt: SNAPSHOT,
    availabilityMessage:
      'HTTP 200 observed on 2026-08-28; the user journey and data handling were not verified.',
    availabilityStatus: 'available',
    dataClassification: 'synthetic-only',
    dataHandlingNotes:
      'The launch candidate must provide a synthetic-data mode and must not retain visitor memories or media before privacy review.',
    decisions: [
      {
        detail:
          'Any public demonstration must use sample memories until authentication, storage, consent, export, and deletion behavior are reviewed.',
        title: 'Synthetic demo boundary',
      },
    ],
    featured: false,
    lastVerifiedAt: SNAPSHOT,
    launchApproval: 'not-reviewed',
    limitations: [
      { text: 'The repository describes Milestone 0, not a completed product.' },
      { text: 'Voice, photo, privacy, export, and account deletion behavior remain unverified.' },
    ],
    problem:
      'Personal histories are often scattered across messages, photos, recordings, and memories that are never organized.',
    repositoryURL: 'https://github.com/saberistic-team/back-then',
    safetyNotice:
      'Prototype review pending. Use sample memories only; do not enter personal or sensitive information.',
    slug: 'backthen',
    sourceProvenance: {
      licenseSpdxExpression: 'MIT',
      relation: 'organization_owned',
      repositoryName: 'back-then',
      repositoryOwner: 'saberistic-team',
      repositoryUrl: 'https://github.com/saberistic-team/back-then',
      sourceLastCheckedAt: SNAPSHOT,
      sourceReviewStatus: 'metadata_only',
    },
    sourceUrl: 'https://github.com/saberistic-team/back-then',
    status: 'prototype',
    story:
      'BackThen explores a warmer, more intentional way to preserve personal stories. The current repository describes a Milestone 0 foundation, so the public experience remains a review candidate rather than a production claim.',
    summary:
      'A mobile-first life-story prototype that turns recurring prompts and voice, text, or photos into an organized personal archive.',
    title: 'BackThen',
  },
  {
    availabilityStatus: 'unchecked',
    dataClassification: 'synthetic-only',
    dataHandlingNotes:
      'Use generated sample transactions only. Reject and never store wallet keys, financial credentials, or personal financial data.',
    decisions: [
      {
        detail:
          'The demonstration must remain synthetic and must never receive wallet, bank, chain, or financial-provider credentials.',
        title: 'No-real-money boundary',
      },
    ],
    featured: false,
    launchApproval: 'not-reviewed',
    limitations: [
      { text: 'No real money, wallets, chains, banks, or compliance vendors are connected.' },
      { text: 'A public Render deployment and resettable guided journey have not yet been verified.' },
    ],
    problem:
      'Payment architecture is difficult to evaluate safely when demonstrations depend on real funds, institutions, or credentials.',
    repositoryURL: 'https://github.com/saberistic-team/frescopay',
    safetyNotice:
      'Educational simulation only. This is not a financial service and does not move or custody real funds.',
    slug: 'frescopay',
    sourceProvenance: {
      licenseSpdxExpression: 'MIT',
      relation: 'organization_owned',
      repositoryName: 'frescopay',
      repositoryOwner: 'saberistic-team',
      repositoryUrl: 'https://github.com/saberistic-team/frescopay',
      sourceLastCheckedAt: SNAPSHOT,
      sourceReviewStatus: 'metadata_only',
    },
    sourceUrl: 'https://github.com/saberistic-team/frescopay',
    status: 'prototype',
    story:
      'FrescoPay makes payment-system architecture visible through an educational environment built around synthetic events and explicit failure handling.',
    summary:
      'A synthetic USDC-to-MXN payment-systems laboratory for exploring durable workflows without moving real money.',
    title: 'FrescoPay',
  },
  {
    availabilityStatus: 'unchecked',
    dataClassification: 'synthetic-only',
    dataHandlingNotes:
      'The first public build should use disposable sample accounts or no accounts and must not collect payment details.',
    decisions: [
      {
        detail:
          'Charging cannot be enabled until payment behavior, account recovery, worker health, and operational ownership pass review.',
        title: 'Subscriptions remain disabled',
      },
    ],
    featured: false,
    launchApproval: 'not-reviewed',
    limitations: [
      { text: 'The repository describes an in-progress Phase 2.' },
      { text: 'No independently verified public URL is currently recorded.' },
      { text: 'Web, API, worker, database, subscription, and accessibility behavior remain unverified.' },
    ],
    problem:
      'Many daily puzzle experiences depend heavily on language and do not travel cleanly across audiences.',
    repositoryURL: 'https://github.com/saberistic-team/tadading',
    safetyNotice:
      'Public-alpha review pending. Subscription charging must remain disabled until launch approval.',
    slug: 'tadading',
    sourceProvenance: {
      licenseSpdxExpression: 'NOASSERTION',
      relation: 'organization_owned',
      repositoryName: 'tadading',
      repositoryOwner: 'saberistic-team',
      repositoryUrl: 'https://github.com/saberistic-team/tadading',
      sourceLastCheckedAt: SNAPSHOT,
      sourceReviewStatus: 'metadata_only',
    },
    sourceUrl: 'https://github.com/saberistic-team/tadading',
    status: 'alpha',
    story:
      'TadaDing explores a compact recurring puzzle experience designed to work across languages and mobile devices.',
    summary:
      'A daily, language-light visual puzzle application being evaluated as a public alpha.',
    title: 'TadaDing',
  },
  {
    appUrl: 'https://story-sprout-pay.lovable.app',
    availabilityCheckedAt: SNAPSHOT,
    availabilityMessage:
      'HTTP 200 observed on 2026-08-28; payments, moderation, content handling, and the complete journey were not verified.',
    availabilityStatus: 'available',
    dataClassification: 'synthetic-only',
    dataHandlingNotes:
      'Use test content and test-mode or fully disabled payments only. Do not retain visitor content before moderation and privacy review.',
    decisions: [
      {
        detail:
          'The public candidate must not create real charges or promise royalties before payment, legal, moderation, and accounting review.',
        title: 'Payment-disabled fallback',
      },
    ],
    featured: false,
    lastVerifiedAt: SNAPSHOT,
    launchApproval: 'not-reviewed',
    limitations: [
      { text: 'Payment webhook idempotency, refunds, and royalty accounting are unverified.' },
      { text: 'User-content moderation, authorship, and intellectual-property rules are unverified.' },
      { text: 'The reachable deployment does not establish a safe or complete user journey.' },
    ],
    problem:
      'Collaborative stories need understandable authorship, contribution, moderation, and reward rules.',
    repositoryURL: 'https://github.com/saberistic-team/story-sprout-pay',
    safetyNotice:
      'Payment-disabled sandbox only. Do not submit sensitive information or copyrighted third-party content.',
    slug: 'story-sprout-pay',
    sourceProvenance: {
      licenseSpdxExpression: 'NOASSERTION',
      relation: 'organization_owned',
      repositoryName: 'story-sprout-pay',
      repositoryOwner: 'saberistic-team',
      repositoryUrl: 'https://github.com/saberistic-team/story-sprout-pay',
      sourceLastCheckedAt: SNAPSHOT,
      sourceReviewStatus: 'metadata_only',
    },
    sourceUrl: 'https://github.com/saberistic-team/story-sprout-pay',
    status: 'prototype',
    story:
      'Story Sprout Pay is retained as a visually engaging fallback candidate. It may be demonstrated only as a payment-disabled sandbox or recorded walkthrough until its higher-risk systems are reviewed.',
    summary:
      'A collaborative branching-story concept combining AI-assisted writing, paid contributions, and creator royalties.',
    title: 'Story Sprout Pay',
  },
] as const

const log = (message: string) => process.stdout.write(`${message}\n`)

const findOne = async (
  payload: SeedPayload,
  collection: string,
  field: string,
  value: string,
): Promise<SeedDocument | undefined> => {
  const result = await payload.find({
    collection,
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: {
      [field]: {
        equals: value,
      },
    },
  })

  return result.docs[0]
}

const bootstrapAdmin = async (payload: SeedPayload) => {
  const email = process.env.PAYLOAD_ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.PAYLOAD_ADMIN_PASSWORD

  if (!email && !password) return
  if (!email || !password) {
    throw new Error('Set both PAYLOAD_ADMIN_EMAIL and PAYLOAD_ADMIN_PASSWORD, or neither.')
  }
  if (password.length < 16) {
    throw new Error('PAYLOAD_ADMIN_PASSWORD must contain at least 16 characters.')
  }

  const existing = await findOne(payload, 'users', 'email', email)
  if (existing) {
    if (existing.role !== 'admin') {
      throw new Error('The bootstrap email already exists but is not an administrator.')
    }

    log('Administrator already exists; credentials were not changed.')
    return
  }

  await payload.create({
    collection: 'users',
    context: { allowRoleBootstrap: true },
    data: {
      email,
      name: 'Saberistic Administrator',
      password,
      role: 'admin',
    },
    overrideAccess: true,
  })
  log('Created the environment-configured administrator.')
}

const seedEvidence = async (payload: SeedPayload) => {
  const records = new Map<string, SeedDocument>()

  for (const data of evidenceSeeds) {
    const existing = await findOne(payload, 'evidence-sources', 'url', data.url)
    const operation = {
      collection: 'evidence-sources',
      context: { allowEvidenceSeed: true },
      data,
      overrideAccess: true,
    }
    const record = existing
      ? await payload.update({ ...operation, id: existing.id })
      : await payload.create(operation)

    records.set(data.url, record)
  }

  log(`Verified ${records.size} idempotent GitHub evidence records.`)
  return records
}

const seedSiteSettings = async (payload: SeedPayload) => {
  const existing = await payload.findGlobal({
    depth: 0,
    overrideAccess: true,
    slug: 'site-settings',
  })

  if (typeof existing.siteName === 'string' && existing.siteName.trim().length > 0) {
    log('Site settings already contain content; left them unchanged.')
    return
  }

  const canonicalOrigin =
    process.env.SITE_URL?.trim() ||
    process.env.RENDER_EXTERNAL_URL?.trim() ||
    'http://localhost:3000'

  await payload.updateGlobal({
    data: {
      canonicalOrigin,
      defaultPrimaryActionId: 'check_production_readiness',
      defaultSecondaryActionId: 'explore_prototypes',
      defaultSeo: {
        description:
          'Senior architecture and hands-on engineering for AI and software products that must survive real users and operational reality.',
        title: 'Saberistic — Prototype to Production',
      },
      legalFooter:
        'Independent projects, prior employer roles, and open-source contributions are labeled clearly.',
      organization: {
        name: 'Saberistic',
        sameAs: [
          { url: 'https://github.com/saberistic-team' },
          { url: 'https://github.com/saberistic' },
        ],
        url: canonicalOrigin,
      },
      siteName: 'Saberistic',
      socialLinks: [
        {
          label: 'Saberistic Team on GitHub',
          platform: 'github',
          url: 'https://github.com/saberistic-team',
        },
        {
          label: 'AmirSaber Sharifi on GitHub',
          platform: 'github',
          url: 'https://github.com/saberistic',
        },
        {
          label: 'AmirSaber Sharifi on LinkedIn',
          platform: 'linkedin',
          url: 'https://www.linkedin.com/in/saberistic',
        },
      ],
      tagline: 'You built the prototype. We make it production-ready.',
    },
    overrideAccess: true,
    slug: 'site-settings',
  })
  log('Created initial site settings without inventing contact or booking details.')
}

const asPublicConcept = (data: Record<string, unknown>): Record<string, unknown> => {
  const publicConcept = { ...data }

  delete publicConcept.availabilityCheckedAt
  delete publicConcept.lastVerifiedAt

  return {
    ...publicConcept,
    _status: 'published',
    appUrl: null,
    availabilityMessage: 'Published as a build note only; no public application is offered.',
    availabilityStatus: 'unchecked',
    featured: false,
    launchApproval: 'not-reviewed',
    status: 'concept',
  }
}

const seedPrototypes = async (
  payload: SeedPayload,
  evidence: Map<string, SeedDocument>,
) => {
  let changed = 0
  let skippedPublished = 0

  for (const seed of prototypeSeeds) {
    const { repositoryURL, ...prototype } = seed
    const evidenceSource = evidence.get(repositoryURL)
    if (!evidenceSource) throw new Error(`Missing evidence seed for ${repositoryURL}.`)

    const existing = await findOne(payload, 'prototypes', 'slug', prototype.slug)
    if (existing?._status === 'published') {
      skippedPublished += 1
      continue
    }

    const draftData: Record<string, unknown> = {
      ...prototype,
      _status: 'draft',
      evidenceSources: [evidenceSource.id],
    }
    const data = PUBLIC_CONCEPTS ? asPublicConcept(draftData) : draftData
    const operation = {
      collection: 'prototypes',
      context: {
        allowSeedPublishConcepts: PUBLIC_CONCEPTS,
        skipRevalidate: true,
      },
      data,
      overrideAccess: true,
    }

    if (existing) {
      await payload.update({ ...operation, id: existing.id })
    } else {
      await payload.create(operation)
    }
    changed += 1
  }

  const mode = PUBLIC_CONCEPTS ? 'public concept build notes' : 'drafts'
  log(`Seeded ${changed} prototype candidates as ${mode}.`)
  if (skippedPublished > 0) {
    log(`Left ${skippedPublished} existing published prototype record(s) unchanged.`)
  }
}

const main = async () => {
  const payload = (await getPayload({ config })) as unknown as SeedPayload

  await bootstrapAdmin(payload)
  const evidence = await seedEvidence(payload)
  await seedSiteSettings(payload)
  await seedPrototypes(payload, evidence)

  log('Seed complete. No startup auto-seeding is configured.')
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown seed failure.'
    process.stderr.write(`Seed failed: ${message}\n`)
    process.exit(1)
  })
