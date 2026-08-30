export const LOVABLE_PROTOTYPE_VERIFIED_AT = '2026-08-30T16:05:00.000Z'

export type LovablePrototypeDocument = Record<string, unknown> & {
  id: number | string
}

export type LovablePrototypePayload = {
  create: (args: Record<string, unknown>) => Promise<LovablePrototypeDocument>
  find: (args: Record<string, unknown>) => Promise<{ docs: LovablePrototypeDocument[] }>
  update: (args: Record<string, unknown>) => Promise<LovablePrototypeDocument>
}

export type PublishLovablePrototypesArgs = {
  payload: LovablePrototypePayload
  req?: unknown
}

type EvidenceSeed = {
  data: Record<string, unknown>
  prototypeSlug: string
}

type PrototypeSeed = {
  data: Record<string, unknown>
  evidenceURLs: string[]
}

const evidenceSeeds: EvidenceSeed[] = [
  {
    prototypeSlug: 'the-last-press',
    data: {
      accessedAt: LOVABLE_PROTOTYPE_VERIFIED_AT,
      allowedSurfaces: ['prototype-hub'],
      internalVerificationNotes:
        "Reviewed at commit 169df55cec710c269ddbf4cfc98a8e41a6d37392. The repository has no declared license. Source review found unrestricted UPDATE access to each authenticated user's profile row, no scheduled season-settlement route, no test suite, and a failing lint baseline.",
      permissionStatus: 'public',
      publisherOrOwner: 'saberistic-team',
      sourceType: 'commit',
      strength: 'first-party-public',
      supports:
        'The pinned source implements a shared countdown game with Supabase Auth, Postgres, Realtime, an atomic press function, Paddle membership, player profiles, season history, and administrative demo controls.',
      title: 'The Last Press source at reviewed commit',
      url: 'https://github.com/saberistic-team/the-last-press/commit/169df55cec710c269ddbf4cfc98a8e41a6d37392',
      verificationStatus: 'verified',
    },
  },
  {
    prototypeSlug: 'the-last-press',
    data: {
      accessedAt: LOVABLE_PROTOTYPE_VERIFIED_AT,
      allowedSurfaces: ['prototype-hub'],
      internalVerificationNotes:
        "HTTP 200 was observed, but the public season remained at 00:00:00 with “Time's up. Settling the season…” roughly six days after the last press. The 390 px view overflowed horizontally and the public player profile rendered an invalid Infinity/NaN duration.",
      permissionStatus: 'public',
      publisherOrOwner: 'Saberistic',
      sourceType: 'official-product',
      strength: 'first-party-public',
      supports:
        'The public Lovable deployment exposes the global timer, join flow, live activity, season history, public player profiles, and legal pages while also demonstrating the currently degraded settlement state.',
      title: 'The Last Press public Lovable deployment',
      url: 'https://the-last-press.lovable.app',
      verificationStatus: 'verified',
    },
  },
  {
    prototypeSlug: 'psych-lab',
    data: {
      accessedAt: LOVABLE_PROTOTYPE_VERIFIED_AT,
      allowedSurfaces: ['prototype-hub'],
      internalVerificationNotes:
        'Reviewed at commit b47cfa4690e389ca5119ded54c509c434f23d583. The repository has no declared license. Six open HIGH-severity CodeQL alerts remain, so this evidence does not establish production or data-safety readiness.',
      permissionStatus: 'public',
      publisherOrOwner: 'saberistic-team',
      sourceType: 'commit',
      strength: 'first-party-public',
      supports:
        'The pinned source implements AI-assisted questionnaire authoring, schema validation and repair, human review, join-code participation, deterministic scoring, account flows, analytics, and Stripe-backed payments.',
      title: 'Psych Lab source at reviewed commit',
      url: 'https://github.com/saberistic-team/psych-test-forge/commit/b47cfa4690e389ca5119ded54c509c434f23d583',
      verificationStatus: 'verified',
    },
  },
  {
    prototypeSlug: 'psych-lab',
    data: {
      accessedAt: LOVABLE_PROTOTYPE_VERIFIED_AT,
      allowedSurfaces: ['prototype-hub'],
      internalVerificationNotes:
        'The custom domain was reachable and treated as canonical; the Lovable origin redirects to it. Reachability does not approve collection of questionnaire responses, account data, or payment state.',
      permissionStatus: 'public',
      publisherOrOwner: 'Saberistic',
      sourceType: 'official-product',
      strength: 'first-party-public',
      supports:
        'The canonical Psych Lab site presents questionnaire authoring, join-code participation, fixed arithmetic scoring, explicit non-clinical boundaries, creator plans, and participant report purchases.',
      title: 'Psych Lab canonical public deployment',
      url: 'https://getpsychlab.app',
      verificationStatus: 'verified',
    },
  },
  {
    prototypeSlug: 'borrowed-brain',
    data: {
      accessedAt: LOVABLE_PROTOTYPE_VERIFIED_AT,
      allowedSurfaces: ['prototype-hub'],
      internalVerificationNotes:
        'Reviewed at commit dadf92f699ff47f95e4f274463ea4b0ed0e8e92b. The repository has no declared license. Public approval is limited to fictional sample decisions; entered text is sent to the Lovable AI gateway and authenticated saves can persist decision records.',
      permissionStatus: 'public',
      publisherOrOwner: 'saberistic-team',
      sourceType: 'commit',
      strength: 'first-party-public',
      supports:
        'The pinned source implements explicit thinking-style contracts and a staged AI roundtable: context, interrogation, independent positions, cross-examination, revised positions, decision board, assumption tests, and later review.',
      title: 'Borrowed Brain source at reviewed commit',
      url: 'https://github.com/saberistic-team/borrowed-thinking-lab/commit/dadf92f699ff47f95e4f274463ea4b0ed0e8e92b',
      verificationStatus: 'verified',
    },
  },
  {
    prototypeSlug: 'borrowed-brain',
    data: {
      accessedAt: LOVABLE_PROTOTYPE_VERIFIED_AT,
      allowedSurfaces: ['prototype-hub'],
      internalVerificationNotes:
        'The Lovable deployment was reachable. Availability approval covers a sample-data-only demonstration and does not approve personal, medical, legal, employment, relationship, or financial decision content.',
      permissionStatus: 'public',
      publisherOrOwner: 'Saberistic',
      sourceType: 'official-product',
      strength: 'first-party-public',
      supports:
        'The public deployment exposes the problem-first decision flow, selectable thinking styles, structured roundtables, and decision-board experience described by the reviewed source.',
      title: 'Borrowed Brain public Lovable deployment',
      url: 'https://borrowed-thinking-lab.lovable.app',
      verificationStatus: 'verified',
    },
  },
]

const prototypeSeeds: PrototypeSeed[] = [
  {
    evidenceURLs: [
      'https://github.com/saberistic-team/the-last-press/commit/169df55cec710c269ddbf4cfc98a8e41a6d37392',
      'https://the-last-press.lovable.app',
    ],
    data: {
      _status: 'published',
      appUrl: 'https://the-last-press.lovable.app',
      availabilityCheckedAt: LOVABLE_PROTOTYPE_VERIFIED_AT,
      availabilityMessage:
        'The site responds, but the observed season is stuck at zero and key mobile and profile views are degraded. The application link remains withheld.',
      availabilityStatus: 'degraded',
      dataClassification: 'none',
      dataHandlingNotes:
        'This publication is a source-reviewed concept record, not an invitation to use the deployed account or payment flows. The implementation includes Supabase Auth profiles and Paddle subscription state. Do not register, pay, or enter personal information until profile permissions and operational settlement are repaired and re-reviewed.',
      decisions: [
        {
          detail:
            'Clients derive the visible countdown from a Postgres expiration timestamp, correct local clock drift through a server-time endpoint, subscribe to Supabase Realtime, and retain polling as a recovery path.',
          title: 'Keep the timer server-authoritative',
        },
        {
          detail:
            'One PL/pgSQL operation locks the profile and season, applies a two-second per-user rate limit, consumes a press, resets the deadline, and records the event before committing.',
          title: 'Make every press atomic',
        },
        {
          detail:
            'A free account receives one monthly press, membership adds ten, and the winner moves the next season clock one duration bucket shorter, longer, or unchanged.',
          title: 'Turn scarcity into the mechanic',
        },
        {
          detail:
            'Oversized countdown typography, synthesized WebAudio, vibration, reset overlays, and rising urgency make a one-button interaction feel like a live event.',
          title: 'Let presentation carry the drama',
        },
      ],
      featured: false,
      lastVerifiedAt: LOVABLE_PROTOTYPE_VERIFIED_AT,
      launchApproval: 'blocked',
      limitations: [
        {
          text: 'Authenticated users can currently update every field on their own profile row, including presses_remaining, is_member, and banned, so game and billing integrity are not launch-safe.',
        },
        {
          text: 'No scheduled settlement route or job was found; the verified public season remained at 00:00:00 until another press or an administrator triggers settlement.',
        },
        {
          text: 'At 390 px the oversized timer caused horizontal overflow, and the public Saber profile displayed Infinity:NaN:NaN:NaN for its closest press.',
        },
        {
          text: 'The source has no automated tests, its lint baseline fails, and documented purge and membership-only sniper behavior are not fully implemented.',
        },
      ],
      operationalNotes:
        'Launch blocked after review of commit 169df55cec710c269ddbf4cfc98a8e41a6d37392 and the public deployment. Require column-restricted profile writes, an authenticated scheduled settlement path, regression tests, mobile overflow fixes, profile aggregate fixes, and a fresh security review before changing lifecycle or approval.',
      problem:
        'Most multiplayer experiences hide tension behind complex rules. The Last Press asks whether one shared deadline and one scarce action can turn collective waiting into a legible global game of chicken.',
      safetyNotice:
        'Concept record only. Do not create an account, buy a membership, or submit personal information; the reviewed build has unresolved authorization and season-settlement defects.',
      seo: {
        metaDescription:
          'How The Last Press turns one shared countdown and scarce presses into a real-time social game—and why the current build remains launch-blocked.',
        metaTitle: 'The Last Press — Shared Countdown Game Concept',
        noIndex: false,
      },
      slug: 'the-last-press',
      sourceProvenance: {
        licenseSpdxExpression: 'NOASSERTION',
        relation: 'organization_owned',
        repositoryName: 'the-last-press',
        repositoryOwner: 'saberistic-team',
        repositoryUrl: 'https://github.com/saberistic-team/the-last-press',
        sourceLastCheckedAt: LOVABLE_PROTOTYPE_VERIFIED_AT,
        sourceReviewStatus: 'reviewed',
      },
      sourceUrl: 'https://github.com/saberistic-team/the-last-press',
      status: 'concept',
      story:
        'The Last Press reduces a multiplayer game to a timer, a scarce button, and a question: will somebody else act first? Spectators watch one global deadline while signed-in players spend a limited monthly allowance to reset it. A successful press becomes the new public event, and the final presser wins when the clock is allowed to expire.\n\nThe implementation is more substantial than the interface suggests. TanStack Start renders the experience, Supabase supplies Auth, Postgres, and Realtime, a database function serializes competing presses, and Paddle-backed membership expands the monthly allowance. Client-side clock correction, realtime invalidation, polling, sound, haptics, public profiles, season history, and an administrative control room complete the event loop.\n\nThat loop is not safe to present as a playable launch today. The public deployment was reachable but visibly stuck after expiration, mobile layouts overflowed, a profile aggregate rendered invalid output, and profile-row permissions allow a signed-in player to modify fields that determine game and membership integrity. The prototype is therefore published here as an architecture and product concept with its deployment URL retained for review, not exposed as a launch action.',
      summary:
        'A shared-timer social game in which every scarce press resets one global countdown and the last player to act before time expires wins the season.',
      title: 'The Last Press',
    },
  },
  {
    evidenceURLs: [
      'https://github.com/saberistic-team/psych-test-forge/commit/b47cfa4690e389ca5119ded54c509c434f23d583',
      'https://getpsychlab.app',
    ],
    data: {
      _status: 'published',
      appUrl: 'https://getpsychlab.app',
      availabilityCheckedAt: LOVABLE_PROTOTYPE_VERIFIED_AT,
      availabilityMessage:
        'The canonical domain is reachable and the Lovable origin redirects to it, but security and data-handling review blocks an application launch link.',
      availabilityStatus: 'available',
      dataClassification: 'none',
      dataHandlingNotes:
        'This page publishes a reviewed product concept without launching the application. The implementation can collect questionnaire answers, participant identifiers, creator accounts, analytics, subscription state, and payment-webhook data. Do not create instruments, answer questionnaires, authenticate, or purchase reports until the six HIGH CodeQL findings and complete privacy, retention, deletion, payment, and incident-response controls are resolved and re-reviewed.',
      decisions: [
        {
          detail:
            'AI drafts questionnaire wording and structure before participation; respondent answers are scored with fixed arithmetic and are not sent back to the model for profiling or automated decisions.',
          title: 'Confine AI to authoring',
        },
        {
          detail:
            'Established and novel drafting paths both produce a strict JSON contract with response scales, subscales, reverse scoring, attention checks, interpretation bands, and non-clinical disclaimers.',
          title: 'Use one validated specification',
        },
        {
          detail:
            'Invalid model output is returned with schema errors for repair, while every valid draft still waits for a creator to edit and approve it before publication.',
          title: 'Keep a human publication gate',
        },
        {
          detail:
            'Short join codes separate creator authoring from the participant flow, while deterministic sums or means make reported scores reproducible.',
          title: 'Separate authoring from participation',
        },
      ],
      featured: false,
      lastVerifiedAt: LOVABLE_PROTOTYPE_VERIFIED_AT,
      launchApproval: 'blocked',
      limitations: [
        {
          text: 'Six open HIGH-severity CodeQL alerts were present at the reviewed commit; production use is blocked until they are resolved and independently rechecked.',
        },
        {
          text: 'The application handles questionnaire responses, participant identifiers, creator accounts, analytics, subscriptions, and payment events, but those data paths have not passed launch review.',
        },
        {
          text: 'Generated questionnaires are drafts, not validated clinical or diagnostic instruments, and must not drive healthcare, hiring, credit, insurance, admissions, or similar decisions.',
        },
        {
          text: 'Reproducing established instruments can raise copyright, licensing, fidelity, and commercial-use questions that schema validation cannot resolve.',
        },
      ],
      operationalNotes:
        'Launch blocked after review of commit b47cfa4690e389ca5119ded54c509c434f23d583. Resolve all six HIGH CodeQL alerts, threat-model authoring and participant boundaries, verify RLS and webhook idempotency, document retention/export/deletion, complete payment and privacy reviews, and rerun end-to-end security testing before approval.',
      problem:
        'Turning a research or self-reflection idea into a coherent questionnaire requires item design, response scales, reverse scoring, validity checks, interpretation text, publishing, distribution, and reproducible scoring.',
      safetyNotice:
        'Concept record only. Do not enter questionnaire answers, account information, or payment details; the reviewed build has six unresolved HIGH-severity security alerts.',
      seo: {
        metaDescription:
          'Psych Lab explores AI-assisted questionnaire drafting, human review, join-code participation, and deterministic scoring within strict safety boundaries.',
        metaTitle: 'Psych Lab — AI Questionnaire Authoring Concept',
        noIndex: false,
      },
      slug: 'psych-lab',
      sourceProvenance: {
        licenseSpdxExpression: 'NOASSERTION',
        relation: 'organization_owned',
        repositoryName: 'psych-test-forge',
        repositoryOwner: 'saberistic-team',
        repositoryUrl: 'https://github.com/saberistic-team/psych-test-forge',
        sourceLastCheckedAt: LOVABLE_PROTOTYPE_VERIFIED_AT,
        sourceReviewStatus: 'reviewed',
      },
      sourceUrl: 'https://github.com/saberistic-team/psych-test-forge',
      status: 'concept',
      story:
        "Psych Lab explores the full path from an author's idea to a structured self-report questionnaire. A creator can ask for a familiar format or describe a new topic, receive an AI-assisted draft, repair it against a strict schema, edit every word, and publish it behind a join code. Participants answer without interacting with the model; reverse scoring, attention checks, sums or means, and prewritten interpretation bands make the result deterministic.\n\nThe product deliberately draws a boundary between authoring assistance and evaluating a person. It presents itself for research, education, entertainment, and self-reflection—not diagnosis, screening, treatment, or consequential automated decisions. The repository also explores creator plans, participant report purchases, analytics, marketplace mechanics, and administrative oversight.\n\nThose wider capabilities make the current safety bar much higher. The reviewed source has six open HIGH-severity CodeQL alerts and includes questionnaire, identity, account, analytics, subscription, and payment paths. The canonical domain is retained as reviewed provenance, but this publication does not expose it as a launch action. Psych Lab remains a concept until the security findings and the complete data lifecycle are resolved and independently verified.",
      summary:
        'An AI-assisted questionnaire workshop where creators draft, review, publish, distribute, and score self-report instruments through join-code participant flows.',
      title: 'Psych Lab',
    },
  },
  {
    evidenceURLs: [
      'https://github.com/saberistic-team/borrowed-thinking-lab/commit/dadf92f699ff47f95e4f274463ea4b0ed0e8e92b',
      'https://borrowed-thinking-lab.lovable.app',
    ],
    data: {
      _status: 'published',
      appUrl: 'https://borrowed-thinking-lab.lovable.app',
      availabilityCheckedAt: LOVABLE_PROTOTYPE_VERIFIED_AT,
      availabilityMessage:
        'The public Lovable prototype is available. Approval is limited to fictional sample decisions with no personal or sensitive context.',
      availabilityStatus: 'available',
      dataClassification: 'synthetic-only',
      dataHandlingNotes:
        'Use only fictional sample decisions and invented context. Submitted prompts are sent to the Lovable AI gateway; browser sessions use localStorage, and authenticated save/share features can persist decision records in Supabase. Do not enter personal, confidential, medical, legal, employment, relationship, or financial information.',
      decisions: [
        {
          detail:
            'Each brain carries explicit priorities, beliefs, decision rules, characteristic questions, blind spots, change-of-mind conditions, risk tolerance, evidence orientation, and time horizon.',
          title: 'Make thinking styles executable',
        },
        {
          detail:
            'The flow moves from context and one question per brain to independent positions, cross-examination, revised positions, and a decision board instead of collapsing immediately into one answer.',
          title: 'Stage disagreement before synthesis',
        },
        {
          detail:
            'Every AI step returns schema-validated JSON and receives one structured repair attempt when its response is malformed or violates the required shape.',
          title: 'Validate every model turn',
        },
        {
          detail:
            'A session begins in browser storage and can later become an authenticated saved decision with a user choice, confidence, review date, outcome, and configurable sharing boundary.',
          title: 'Keep the user as decision owner',
        },
      ],
      featured: false,
      lastVerifiedAt: LOVABLE_PROTOTYPE_VERIFIED_AT,
      launchApproval: 'approved',
      launchApprovedAt: LOVABLE_PROTOTYPE_VERIFIED_AT,
      limitations: [
        {
          text: 'The sample-data approval does not cover real personal, confidential, medical, legal, employment, relationship, or financial decisions.',
        },
        {
          text: 'Prompts and context are transmitted to an external AI gateway, and authenticated save/share features can persist decision content in Supabase.',
        },
        {
          text: 'Structured disagreement can clarify assumptions, but model output remains probabilistic and may be incomplete, inconsistent, or confidently wrong.',
        },
        {
          text: 'The roundtable is not professional advice and must not make medical, legal, financial, employment, or other consequential decisions for a visitor.',
        },
      ],
      operationalNotes:
        'Launch approval is limited to the public sample-data demonstration verified at commit dadf92f699ff47f95e4f274463ea4b0ed0e8e92b. Keep the synthetic-only warning prominent, do not encourage sensitive scenarios, and revoke approval if the public route, AI provider, persistence boundary, or sharing defaults materially change without review.',
      problem:
        'A generic assistant often compresses a difficult choice into one smooth answer. People making decisions need distinct reasoning systems that expose assumptions, trade-offs, disagreements, and reversible next steps.',
      safetyNotice:
        'Sample scenarios only. Never enter a real personal, confidential, medical, legal, employment, relationship, or financial decision; AI output may be wrong and is not professional advice.',
      seo: {
        metaDescription:
          'Borrowed Brain stages a structured debate among distinct thinking styles so one sample decision can be examined through competing assumptions.',
        metaTitle: 'Borrowed Brain — Structured AI Decision Roundtables',
        noIndex: false,
      },
      slug: 'borrowed-brain',
      sourceProvenance: {
        licenseSpdxExpression: 'NOASSERTION',
        relation: 'organization_owned',
        repositoryName: 'borrowed-thinking-lab',
        repositoryOwner: 'saberistic-team',
        repositoryUrl: 'https://github.com/saberistic-team/borrowed-thinking-lab',
        sourceLastCheckedAt: LOVABLE_PROTOTYPE_VERIFIED_AT,
        sourceReviewStatus: 'reviewed',
      },
      sourceUrl: 'https://github.com/saberistic-team/borrowed-thinking-lab',
      status: 'prototype',
      story:
        'Borrowed Brain starts from a different premise than a normal chatbot: a hard decision rarely needs one more fluent answer; it needs several incompatible ways of thinking. The visitor states a problem, adds context, and seats up to five explicit reasoning styles around a virtual table. Each brain asks the question most likely to change its recommendation, forms an independent position, challenges a real disagreement, and gets a final chance to update.\n\nThe orchestration is the product. A Skeptic hunts for load-bearing assumptions, an Operator favors reversible action, an Investor prices opportunity cost, a Scientist asks for falsifiable evidence, and other brains carry equally explicit rules and blind spots. Schema-constrained model calls produce interrogation items, positions, challenges, updated recommendations, and a decision board that separates agreement, disagreement, uncertainty, and the next useful test. The visitor still records the decision and can schedule a later outcome review.\n\nThe public prototype is approved only as a sample-data experience. Text entered into the flow reaches the Lovable AI gateway, browser sessions are stored locally, and signed-in save or share flows can persist records. Use one of the fictional prompts provided by the interface, treat every output as a thinking aid rather than advice, and keep real sensitive context out of the application.',
      summary:
        'A structured AI decision room where distinct thinking styles interrogate one problem, debate their assumptions, and assemble a decision board.',
      title: 'Borrowed Brain',
    },
  },
]

const findOne = async (
  payload: LovablePrototypePayload,
  collection: string,
  field: string,
  value: string,
  req: unknown,
  draft?: boolean,
): Promise<LovablePrototypeDocument | undefined> => {
  const result = await payload.find({
    collection,
    depth: 0,
    ...(draft === undefined ? {} : { draft }),
    limit: 1,
    overrideAccess: true,
    pagination: false,
    req,
    where: {
      [field]: {
        equals: value,
      },
    },
  })

  return result.docs[0]
}

const findFirstAdmin = async (
  payload: LovablePrototypePayload,
  req: unknown,
): Promise<number | string> => {
  const result = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    req,
    sort: 'id',
    where: {
      role: {
        equals: 'admin',
      },
    },
  })
  const reviewerID = result.docs[0]?.id

  if (typeof reviewerID !== 'number' && typeof reviewerID !== 'string') {
    throw new Error('Publishing the Lovable prototypes requires at least one administrator.')
  }

  return reviewerID
}

const upsertEvidence = async (
  payload: LovablePrototypePayload,
  req: unknown,
): Promise<Map<string, LovablePrototypeDocument>> => {
  const records = new Map<string, LovablePrototypeDocument>()

  for (const seed of evidenceSeeds) {
    const url = String(seed.data.url)
    const existing = await findOne(payload, 'evidence-sources', 'url', url, req)
    const operation = {
      collection: 'evidence-sources',
      context: { allowEvidenceSeed: true },
      data: seed.data,
      overrideAccess: true,
      req,
    }
    const record = existing
      ? await payload.update({ ...operation, id: existing.id })
      : await payload.create(operation)

    records.set(url, record)
  }

  return records
}

export const publishLovablePrototypes = async ({
  payload,
  req,
}: PublishLovablePrototypesArgs): Promise<void> => {
  const reviewerID = await findFirstAdmin(payload, req)
  const evidence = await upsertEvidence(payload, req)

  for (const seed of prototypeSeeds) {
    const slug = String(seed.data.slug)
    const published = await findOne(payload, 'prototypes', 'slug', slug, req, false)

    if (published?._status === 'published') continue

    const evidenceSources = seed.evidenceURLs.map((url) => {
      const source = evidence.get(url)
      if (!source) throw new Error(`Missing evidence for ${slug}: ${url}`)
      return source.id
    })
    const existingDraft = await findOne(payload, 'prototypes', 'slug', slug, req, true)
    const operation = {
      collection: 'prototypes',
      context: {
        allowLovablePrototypePublicationMigrationAdmin: true,
        skipRevalidate: true,
      },
      data: {
        ...seed.data,
        evidenceSources,
        launchReviewer: reviewerID,
      },
      draft: false,
      overrideAccess: true,
      req,
    }

    if (existingDraft) {
      await payload.update({ ...operation, id: existingDraft.id })
    } else {
      await payload.create(operation)
    }
  }
}
