import type { SeedDocument, SeedPayload } from './seedPreparedContent'
import { deriveProofReviewState } from './validation/proofPublication'

const SNAPSHOT = '2026-08-28T00:00:00.000Z'

type EvidenceSeed = {
  accessedAt: string
  allowedSurfaces: readonly string[]
  internalVerificationNotes: string
  permissionStatus: 'public'
  publisherOrOwner: string
  sourceType:
    | 'archive'
    | 'commit'
    | 'package-registry'
    | 'professional-profile'
    | 'pull-request'
    | 'repository'
  strength: 'first-party-public' | 'primary' | 'public-contribution' | 'secondary'
  supports: string
  title: string
  url: string
  verificationStatus: 'verified'
}

type ClaimSeed = {
  claimId: string
  claimStatus: 'founder_provided' | 'publicly_corroborated'
  claimType: 'contribution' | 'relationship' | 'role'
  evidenceURLs: readonly string[]
  permissionStatus: 'public'
  relationshipValue?: string
  statement: string
}

type CareerSeed = {
  body: string
  capabilities: readonly string[]
  claims: readonly ClaimSeed[]
  organization: string
  publicContentType: 'contribution_profile' | 'experience_profile'
  responsibility: string
  role: string
  slug: string
  summary: string
  title: string
}

const evidenceSeeds: readonly EvidenceSeed[] = [
  {
    accessedAt: SNAPSHOT,
    allowedSurfaces: ['homepage', 'work', 'about'],
    internalVerificationNotes:
      'Supports the historical employer relationship and archived title only; it does not support later metrics or outcomes.',
    permissionStatus: 'public',
    publisherOrOwner: 'Brave Software',
    sourceType: 'archive',
    strength: 'primary',
    supports:
      'An archived official Brave team page names AmirSaber Sharifi as a Senior Software Engineer.',
    title: 'Archived official Brave team page',
    url: 'https://web.archive.org/web/20190531130820/https://brave.com/about/',
    verificationStatus: 'verified',
  },
  {
    accessedAt: SNAPSHOT,
    allowedSurfaces: ['homepage', 'work', 'about'],
    internalVerificationNotes:
      'Supports only the contribution shown in this public pull request and its linked history.',
    permissionStatus: 'public',
    publisherOrOwner: 'Brave Software',
    sourceType: 'pull-request',
    strength: 'public-contribution',
    supports:
      'The public ads-ui pull request records AmirSaber Sharifi contribution history in advertiser workflow and reporting code.',
    title: 'Brave ads-ui public contribution',
    url: 'https://github.com/brave/ads-ui/pull/1',
    verificationStatus: 'verified',
  },
  {
    accessedAt: SNAPSHOT,
    allowedSurfaces: ['homepage', 'work', 'about'],
    internalVerificationNotes:
      'Supports only the credential-related contribution visible in this public pull request.',
    permissionStatus: 'public',
    publisherOrOwner: 'Brave Software',
    sourceType: 'pull-request',
    strength: 'public-contribution',
    supports:
      'The public bat-go pull request records an AmirSaber Sharifi credential-support contribution.',
    title: 'Brave bat-go credential-support contribution',
    url: 'https://github.com/brave-intl/bat-go/pull/1049',
    verificationStatus: 'verified',
  },
  {
    accessedAt: SNAPSHOT,
    allowedSurfaces: ['homepage', 'work', 'about'],
    internalVerificationNotes:
      'The role is founder-provided. The profile also contains a named colleague recommendation, but neither should be used to attribute the complete present-day product or architecture.',
    permissionStatus: 'public',
    publisherOrOwner: 'AmirSaber Sharifi / named former colleague',
    sourceType: 'professional-profile',
    strength: 'secondary',
    supports:
      'The public profile records the BAXUS role and a named former colleague recommendation describing early platform architecture and workflow work.',
    title: 'Public BAXUS role and named colleague recommendation',
    url: 'https://www.linkedin.com/in/saberistic',
    verificationStatus: 'verified',
  },
  {
    accessedAt: SNAPSHOT,
    allowedSurfaces: ['homepage', 'work', 'about'],
    internalVerificationNotes:
      'Supports only the discrete Temporal implementation contribution shown in this commit.',
    permissionStatus: 'public',
    publisherOrOwner: 'BAXUS',
    sourceType: 'commit',
    strength: 'public-contribution',
    supports:
      'The public BAXUS repository history records an AmirSaber Sharifi contribution to its Temporal implementation.',
    title: 'BAXUS Temporal public contribution',
    url: 'https://github.com/BAXUSNFT/baxus-temporal/commit/393bf8c137a1a98b3380effab7f371176ad2480a',
    verificationStatus: 'verified',
  },
  {
    accessedAt: SNAPSHOT,
    allowedSurfaces: ['homepage', 'work', 'about'],
    internalVerificationNotes:
      'Supports package-maintainer and published-package facts only, not an employer relationship or a production outcome.',
    permissionStatus: 'public',
    publisherOrOwner: 'EternisAI',
    sourceType: 'package-registry',
    strength: 'first-party-public',
    supports: 'The public @eternis/tlsn-js package lists saberistic as a maintainer.',
    title: '@eternis/tlsn-js package maintainer record',
    url: 'https://www.npmjs.com/package/@eternis/tlsn-js',
    verificationStatus: 'verified',
  },
  {
    accessedAt: SNAPSHOT,
    allowedSurfaces: ['homepage', 'work', 'about'],
    internalVerificationNotes:
      'Supports only the load-testing contribution shown in the public commit.',
    permissionStatus: 'public',
    publisherOrOwner: 'EternisAI',
    sourceType: 'commit',
    strength: 'public-contribution',
    supports:
      'The public EternisAI repository history records an AmirSaber Sharifi load-testing contribution.',
    title: 'Eternis public load-testing contribution',
    url: 'https://github.com/EternisAI/notary-k6/commit/98466c3242354f0fe9538f62ae8252d8bcfb7546',
    verificationStatus: 'verified',
  },
  {
    accessedAt: SNAPSHOT,
    allowedSurfaces: ['homepage', 'work', 'about'],
    internalVerificationNotes:
      'Supports only the Nitro/EKS adaptation visible in this public pull request.',
    permissionStatus: 'public',
    publisherOrOwner: 'EternisAI',
    sourceType: 'pull-request',
    strength: 'public-contribution',
    supports:
      'The public EternisAI pull request records an AmirSaber Sharifi Nitro Enclave and EKS adaptation contribution.',
    title: 'Eternis Nitro/EKS public contribution',
    url: 'https://github.com/EternisAI/nitriding-daemon/pull/1',
    verificationStatus: 'verified',
  },
  {
    accessedAt: SNAPSHOT,
    allowedSurfaces: ['homepage', 'work', 'about'],
    internalVerificationNotes:
      'Supports a scoped personal-original open-source implementation claim only; it does not establish an audit, production deployment, adoption, customer use, or the broader Spiral Safe relationship.',
    permissionStatus: 'public',
    publisherOrOwner: 'AmirSaber Sharifi',
    sourceType: 'repository',
    strength: 'first-party-public',
    supports:
      'The public personal-original repository implements a HashiCorp Vault plugin prototype for Solana account creation and signing.',
    title: 'solana-secrets-engine public repository',
    url: 'https://github.com/saberistic/solana-secrets-engine',
    verificationStatus: 'verified',
  },
]

const careerSeeds: readonly CareerSeed[] = [
  {
    body: 'This experience profile covers public, claim-specific evidence from Brave. It intentionally excludes throughput, fraud, revenue, user, and transaction metrics.',
    capabilities: ['Privacy-preserving systems', 'Payments', 'Backend and product engineering'],
    claims: [
      {
        claimId: 'brave-relationship',
        claimStatus: 'publicly_corroborated',
        claimType: 'relationship',
        evidenceURLs: ['https://web.archive.org/web/20190531130820/https://brave.com/about/'],
        permissionStatus: 'public',
        relationshipValue: 'employment',
        statement: 'Prior employer role at Brave.',
      },
      {
        claimId: 'brave-role',
        claimStatus: 'publicly_corroborated',
        claimType: 'role',
        evidenceURLs: ['https://web.archive.org/web/20190531130820/https://brave.com/about/'],
        permissionStatus: 'public',
        statement: 'Served as a Senior Software Engineer.',
      },
      {
        claimId: 'brave-contributions',
        claimStatus: 'publicly_corroborated',
        claimType: 'contribution',
        evidenceURLs: [
          'https://github.com/brave/ads-ui/pull/1',
          'https://github.com/brave-intl/bat-go/pull/1049',
        ],
        permissionStatus: 'public',
        statement:
          'Public contribution history includes advertiser workflow and reporting work in ads-ui plus credential-support changes in bat-go.',
      },
    ],
    organization: 'Brave',
    publicContentType: 'experience_profile',
    responsibility:
      'Worked across backend services and product interfaces supporting privacy-aligned advertising and rewards systems.',
    role: 'Senior Software Engineer',
    slug: 'brave-privacy-aligned-advertising-and-rewards',
    summary: 'Privacy-aligned advertising and rewards infrastructure.',
    title: 'Privacy-aligned advertising and rewards infrastructure',
  },
  {
    body: 'This profile separates a founder-provided role statement from public contribution history and a named former-colleague recommendation. It does not attribute the complete current BAXUS product or architecture to one person.',
    capabilities: ['Distributed workflows', 'Marketplace architecture', 'Cloud infrastructure'],
    claims: [
      {
        claimId: 'baxus-relationship',
        claimStatus: 'founder_provided',
        claimType: 'relationship',
        evidenceURLs: ['https://www.linkedin.com/in/saberistic'],
        permissionStatus: 'public',
        relationshipValue: 'employment',
        statement: 'Prior employer role at BAXUS.',
      },
      {
        claimId: 'baxus-role',
        claimStatus: 'founder_provided',
        claimType: 'role',
        evidenceURLs: ['https://www.linkedin.com/in/saberistic'],
        permissionStatus: 'public',
        statement: 'Held the role of VP of Engineering.',
      },
      {
        claimId: 'baxus-contribution',
        claimStatus: 'publicly_corroborated',
        claimType: 'contribution',
        evidenceURLs: [
          'https://www.linkedin.com/in/saberistic',
          'https://github.com/BAXUSNFT/baxus-temporal/commit/393bf8c137a1a98b3380effab7f371176ad2480a',
        ],
        permissionStatus: 'public',
        statement:
          'Public evidence supports early platform architecture and Temporal-based transaction-workflow contributions.',
      },
    ],
    organization: 'BAXUS',
    publicContentType: 'experience_profile',
    responsibility:
      'Contributed to early marketplace architecture, durable transaction workflows, and deployment foundations.',
    role: 'VP of Engineering · founder-provided',
    slug: 'baxus-early-marketplace-architecture',
    summary: 'Early architecture for a marketplace joining physical assets and digital ownership.',
    title: 'Early marketplace architecture and durable workflows',
  },
  {
    body: 'This contribution profile uses the neutral team-role label supported by public maintainer and contribution evidence. It does not assert an employer relationship, formal title, performance multiplier, or named customer integration.',
    capabilities: ['Trusted execution', 'Load testing', 'Cloud deployment'],
    claims: [
      {
        claimId: 'eternis-relationship',
        claimStatus: 'publicly_corroborated',
        claimType: 'relationship',
        evidenceURLs: [
          'https://www.npmjs.com/package/@eternis/tlsn-js',
          'https://github.com/EternisAI/notary-k6/commit/98466c3242354f0fe9538f62ae8252d8bcfb7546',
        ],
        permissionStatus: 'public',
        relationshipValue: 'team_role',
        statement: 'Team role supported by public Eternis maintainer and contribution records.',
      },
      {
        claimId: 'eternis-contributions',
        claimStatus: 'publicly_corroborated',
        claimType: 'contribution',
        evidenceURLs: [
          'https://www.npmjs.com/package/@eternis/tlsn-js',
          'https://github.com/EternisAI/notary-k6/commit/98466c3242354f0fe9538f62ae8252d8bcfb7546',
          'https://github.com/EternisAI/nitriding-daemon/pull/1',
        ],
        permissionStatus: 'public',
        statement:
          'Contributed to TLSNotary tooling, load testing, and Nitro Enclave/EKS deployment components.',
      },
    ],
    organization: 'Eternis',
    publicContentType: 'contribution_profile',
    responsibility:
      'Contributed to secure data-workflow tooling, load testing, and enclave deployment components.',
    role: 'Team contributor',
    slug: 'eternis-trusted-execution-data-workflows',
    summary: 'Trusted execution for auditable data workflows.',
    title: 'Trusted execution for auditable data workflows',
  },
  {
    body: 'This independent contribution profile is deliberately limited to what the public personal-original repository supports. It does not claim a security audit, production use, adoption, customer usage, or a separately verified Spiral Safe founder relationship.',
    capabilities: ['Key management', 'Trusted execution', 'Open-source security tooling'],
    claims: [
      {
        claimId: 'solana-secrets-relationship',
        claimStatus: 'publicly_corroborated',
        claimType: 'relationship',
        evidenceURLs: ['https://github.com/saberistic/solana-secrets-engine'],
        permissionStatus: 'public',
        relationshipValue: 'independent',
        statement: 'Independent open-source project, not a Saberistic client engagement.',
      },
      {
        claimId: 'solana-secrets-contribution',
        claimStatus: 'publicly_corroborated',
        claimType: 'contribution',
        evidenceURLs: ['https://github.com/saberistic/solana-secrets-engine'],
        permissionStatus: 'public',
        statement:
          'Published a HashiCorp Vault plugin prototype for creating Solana accounts and signing with them.',
      },
    ],
    organization: 'Independent open-source work',
    publicContentType: 'contribution_profile',
    responsibility: 'Designed and published a security-focused key-management prototype.',
    role: 'Open-source contributor',
    slug: 'solana-secrets-engine-key-management',
    summary: 'Enclave-oriented key-management foundations for Solana signing.',
    title: 'Open-source key management for Solana signing',
  },
]

const log = (message: string) => process.stdout.write(`${message}\n`)

const findOne = async (
  payload: SeedPayload,
  collection: string,
  field: string,
  value: string,
  req?: unknown,
): Promise<SeedDocument | undefined> => {
  const result = await payload.find({
    collection,
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
    where: {
      [field]: {
        equals: value,
      },
    },
  })

  return result.docs[0]
}

const upsertEvidence = async (payload: SeedPayload, req?: unknown) => {
  const records = new Map<string, SeedDocument>()

  for (const seed of evidenceSeeds) {
    const existing = await findOne(payload, 'evidence-sources', 'url', seed.url, req)
    const record =
      existing ??
      (await payload.create({
        collection: 'evidence-sources',
        context: { allowEvidenceSeed: true },
        data: seed,
        overrideAccess: true,
        req,
      }))

    records.set(seed.url, record)
  }

  return records
}

const claimData = (
  claims: readonly ClaimSeed[],
  evidence: Map<string, SeedDocument>,
  allowedSurfaces: readonly string[],
) =>
  claims.map(({ evidenceURLs, ...claim }) => ({
    ...claim,
    allowedSurfaces,
    evidenceSources: evidenceURLs.map((url) => {
      const source = evidence.get(url)
      if (!source) throw new Error(`Missing career evidence seed for ${url}.`)
      return source.id
    }),
  }))

const upsertDraft = async (
  payload: SeedPayload,
  collection: 'case-studies' | 'experience',
  data: Record<string, unknown>,
  req?: unknown,
): Promise<SeedDocument> => {
  const existing = await findOne(payload, collection, 'slug', String(data.slug), req)
  if (existing) return existing

  const operation = {
    collection,
    data: {
      ...data,
      ...deriveProofReviewState(data),
      _status: 'draft',
      publicationApproval: 'not-reviewed',
    },
    overrideAccess: true,
    req,
  }

  return payload.create(operation)
}

export const seedCareerContent = async (payload: SeedPayload, req?: unknown): Promise<void> => {
  const evidence = await upsertEvidence(payload, req)
  const caseStudies = new Map<string, SeedDocument>()

  for (const [index, seed] of careerSeeds.entries()) {
    const claims = claimData(seed.claims, evidence, ['work'])
    const evidenceSources = [...new Set(claims.flatMap((claim) => claim.evidenceSources))]
    const caseStudy = await upsertDraft(
      payload,
      'case-studies',
      {
        body: seed.body,
        capabilities: seed.capabilities.map((name) => ({ name })),
        claims,
        evidenceSources,
        featured: false,
        organization: seed.organization,
        publicContentType: seed.publicContentType,
        responsibility: seed.responsibility,
        role: seed.role,
        relationship: seed.claims.find((claim) => claim.claimType === 'relationship')
          ?.relationshipValue,
        seo: { noIndex: true },
        slug: seed.slug,
        sortOrder: index + 1,
        summary: seed.summary,
        title: seed.title,
      },
      req,
    )

    caseStudies.set(seed.slug, caseStudy)
  }

  for (const [index, seed] of careerSeeds.entries()) {
    const claims = claimData(seed.claims, evidence, ['about'])
    const evidenceSources = [...new Set(claims.flatMap((claim) => claim.evidenceSources))]
    const caseStudy = caseStudies.get(seed.slug)
    if (!caseStudy) throw new Error(`Missing case-study seed for ${seed.slug}.`)

    await upsertDraft(
      payload,
      'experience',
      {
        claims,
        displayOrder: index + 1,
        evidenceSources,
        organization: seed.organization,
        relatedCaseStudy: caseStudy.id,
        relationship: seed.claims.find((claim) => claim.claimType === 'relationship')
          ?.relationshipValue,
        role: seed.role,
        selectedWork: [{ text: seed.responsibility }],
        slug: seed.slug,
        summary: seed.summary,
        title: `${seed.organization} — ${seed.role}`,
        visibility: 'about',
      },
      req,
    )
  }

  log(
    `Seeded ${evidenceSeeds.length} reviewed career evidence sources, ${careerSeeds.length} case-study drafts, and ${careerSeeds.length} experience drafts.`,
  )
}
