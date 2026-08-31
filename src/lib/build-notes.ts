export type BuildNote = {
  eyebrow: string
  footerSummary: string
  footerTitle: string
  modifiedAt: string
  publishedAt: string
  readingMinutes: number
  repositories: readonly {
    commit: string
    label: string
    url: string
  }[]
  sections: readonly (readonly [id: string, label: string])[]
  seoTitle: string
  slug: string
  summary: string
  tags: readonly string[]
  title: string
}

export const buildNotes = [
  {
    eyebrow: 'STAGE 1 / MILESTONE 2',
    footerSummary:
      'The pinned public commit contains the five M2 task manifests, golden repository, shared scenario contract, read-only board, opt-in telemetry bridge, and hardened MCP stdio client described here.',
    footerTitle: 'Inspect the evaluator—and the boundaries that keep its evidence honest.',
    modifiedAt: '2026-08-31',
    publishedAt: '2026-08-31',
    readingMinutes: 26,
    repositories: [
      {
        commit: '8f18f6dce437a9b580d5aa5f52c42f5ab66f05bd',
        label: 'Harness Platform',
        url: 'https://github.com/saberistic-team/harness-platform',
      },
    ],
    sections: [
      ['brief', 'Milestone contract'],
      ['m1-to-m2', 'From loop to credibility'],
      ['dogfood-chain', 'Five dogfooded tasks'],
      ['golden-repository', 'Golden repository'],
      ['scenario-dsl', 'SDK-owned scenario DSL'],
      ['task-board', 'Read-only task board'],
      ['telemetry', 'OpenTelemetry bridge'],
      ['mcp-stdio', 'Live MCP client'],
      ['credibility-loop', 'Two verification lanes'],
      ['debugging', 'What broke'],
      ['verification', 'Verified result'],
      ['limits', 'Current truth'],
      ['files', 'File guide'],
      ['next', 'What is next'],
      ['sources', 'Evidence ledger'],
    ],
    seoTitle: 'Harness M2: making evaluation evidence credible',
    slug: 'harness-eval-credibility-m2',
    summary:
      'How Stage 1, Milestone 2 adds a golden HTTP repository, SDK-owned scenarios, a read-only task board, opt-in OpenTelemetry, and a hardened live MCP stdio client.',
    tags: ['Agent harnesses', 'Evaluations', 'OpenTelemetry', 'MCP'],
    title: 'Harness Platform M2: making evaluation evidence credible',
  },
  {
    eyebrow: 'DAY 006 / GROWTH PROGRAM',
    footerSummary:
      'The pinned repository separates sanitized live-state evidence, an undeployed v2 program, a no-network browser playground, and a real loopback-only validator lab.',
    footerTitle: 'Inspect the replacement—and the gates that keep it off public networks.',
    modifiedAt: '2026-08-30',
    publishedAt: '2026-08-30',
    readingMinutes: 30,
    repositories: [
      {
        commit: 'd944ee75cbb06d6eabdbd7075a88a15bb15e5936',
        label: 'Growth Program',
        url: 'https://github.com/saberistic-team/growth-program',
      },
    ],
    sections: [
      ['brief', 'The product primitive'],
      ['legacy-audit', 'What was inherited'],
      ['containment', 'Containment first'],
      ['v2-contract', 'The v2 contract'],
      ['score-model', 'Scores and rubrics'],
      ['lifecycle', 'Consent and corrections'],
      ['authority', 'Authority model'],
      ['migration', 'Legacy migration'],
      ['website', 'The evidence website'],
      ['browser-demo', 'Browser-local playground'],
      ['local-validator', 'Local-validator lab'],
      ['security-boundaries', 'Demo boundaries'],
      ['debugging', 'What broke'],
      ['verification', 'Verified result'],
      ['limits', 'Current truth'],
      ['files', 'File guide'],
      ['next', 'What is next'],
      ['sources', 'Evidence ledger'],
    ],
    seoTitle: 'Growth Program v2: hardening a Solana scorecard',
    slug: 'growth-program-v2-scorecards',
    summary:
      'How I turned a live-but-unsafe Solana growth contract into a hardened v2, an evidence-led website, and safety-gated browser-local and local-validator demos without mutating legacy accounts.',
    tags: ['Solana', 'Anchor', 'Score credentials', 'Security hardening'],
    title: 'Growth Program v2: replacing a live score contract without mutating it',
  },
  {
    eyebrow: 'DAY 005 / CRYPTOPAL',
    footerSummary:
      'Three pinned repositories separate the original idea, runnable Solana demonstrator, and blinded-token service; the embedded recording makes the complete local journey inspectable.',
    footerTitle: 'Inspect both privacy hops—and every boundary they do not hide.',
    modifiedAt: '2026-08-30',
    publishedAt: '2026-08-30',
    readingMinutes: 33,
    repositories: [
      {
        commit: '55f7f00e55c6e915f7ad85c5669eb7c01fe020c5',
        label: 'CryptoPal',
        url: 'https://github.com/saberistic-team/cryptopal',
      },
      {
        commit: 'de7c055e459167f66f39d56e4feceaa92caf12aa',
        label: 'Original spec',
        url: 'https://github.com/saberistic/cryptopal-spec',
      },
      {
        commit: 'f18da5682c80fb1afe08348187e4c2f39bd4714a',
        label: 'TurboPass',
        url: 'https://github.com/saberistic-team/turbopass',
      },
    ],
    sections: [
      ['brief', 'The product idea'],
      ['scope', 'What shipped'],
      ['original-sketch', 'Original sketch'],
      ['architecture', 'Architecture'],
      ['local-demo', 'Interface and recording'],
      ['hop-one', 'Wallet to email'],
      ['hop-two', 'Email to wallet'],
      ['zkp-precision', 'What ZKP means'],
      ['browser-boundary', 'Browser boundary'],
      ['retry-safety', 'State and retries'],
      ['anychain', 'The anychain seam'],
      ['debugging', 'What broke'],
      ['verification', 'Verified result'],
      ['load-testing', 'Load and replay'],
      ['limits', 'Current truth'],
      ['files', 'File guide'],
      ['next', 'What is next'],
      ['sources', 'Evidence ledger'],
    ],
    seoTitle: 'CryptoPal: private crypto claims by email',
    slug: 'cryptopal-wallet-email-wallet',
    summary:
      'How I turned a 2022 PlantUML sketch into a local Solana demo that moves one cUSD from wallet to email to wallet through two independent blinded-token hops.',
    tags: ['Privacy Pass', 'Solana', 'Rust/Wasm', 'Email payments'],
    title: 'CryptoPal: two blind-token hops from wallet to email to wallet',
  },
  {
    eyebrow: 'DAY 004 / THREE LOVABLE PROTOTYPES',
    footerSummary:
      'The three pinned repositories show the working product loops, server boundaries, and unresolved launch gates described here.',
    footerTitle: 'Inspect the systems—and the evidence that keeps two launch buttons closed.',
    modifiedAt: '2026-08-30',
    publishedAt: '2026-08-30',
    readingMinutes: 22,
    repositories: [
      {
        commit: '169df55cec710c269ddbf4cfc98a8e41a6d37392',
        label: 'The Last Press',
        url: 'https://github.com/saberistic-team/the-last-press',
      },
      {
        commit: 'b47cfa4690e389ca5119ded54c509c434f23d583',
        label: 'Psych Lab',
        url: 'https://github.com/saberistic-team/psych-test-forge',
      },
      {
        commit: 'dadf92f699ff47f95e4f274463ea4b0ed0e8e92b',
        label: 'Borrowed Brain',
        url: 'https://github.com/saberistic-team/borrowed-thinking-lab',
      },
    ],
    sections: [
      ['brief', 'Three product questions'],
      ['shared-pattern', 'Shared build pattern'],
      ['last-press', 'The Last Press'],
      ['psych-lab', 'Psych Lab'],
      ['borrowed-brain', 'Borrowed Brain'],
      ['ai-boundaries', 'AI boundaries'],
      ['data-boundaries', 'Data boundaries'],
      ['verification', 'Verified result'],
      ['launch-gates', 'Launch gates'],
      ['files', 'File guide'],
      ['next', 'What is next'],
    ],
    seoTitle: 'Three Lovable prototypes, audited',
    slug: 'three-lovable-prototypes',
    summary:
      'How The Last Press, Psych Lab, and Borrowed Brain turn game state, questionnaire authoring, and decision support into deployed products—and what their audits still block.',
    tags: ['Lovable', 'Product prototypes', 'Supabase', 'AI systems'],
    title: 'Three Lovable prototypes: turning product questions into working systems',
  },
  {
    eyebrow: 'STAGE 1 / MILESTONE 1',
    footerSummary:
      'The pinned public commit contains the five task manifests, SQLite store, terminal viewer, eval runner, rule compiler, and CI workflow described here.',
    footerTitle: 'Inspect the operator loop and its evidence boundaries.',
    modifiedAt: '2026-08-30',
    publishedAt: '2026-08-30',
    readingMinutes: 25,
    repositories: [
      {
        commit: 'a596fc54af8b4581ac9619d01b6ad364cfde25cb',
        label: 'Harness Platform',
        url: 'https://github.com/saberistic-team/harness-platform',
      },
    ],
    sections: [
      ['brief', 'Milestone contract'],
      ['m0-to-m1', 'From foundation to loop'],
      ['dogfood-chain', 'Five dogfooded tasks'],
      ['sqlite-evidence', 'Durable event evidence'],
      ['operator-view', 'Operator view'],
      ['golden-eval', 'First golden evaluation'],
      ['rule-compiler', 'Policy rule compiler'],
      ['ci-gate', 'CI exit gate'],
      ['pull-request-evidence', 'Delivery evidence'],
      ['closed-loop', 'The completed loop'],
      ['debugging', 'What broke'],
      ['verification', 'Verified result'],
      ['limits', 'Current truth'],
      ['files', 'File guide'],
      ['next', 'What is next'],
    ],
    seoTitle: 'Harness M1: closing the operator loop',
    slug: 'harness-operator-loop-m1',
    summary:
      'How Stage 1, Milestone 1 turned the Harness Platform foundation into an operator loop with durable events, offline evals, policy compilation, a terminal viewer, and a CI exit gate.',
    tags: ['Agent harnesses', 'CI', 'SQLite', 'Evaluations'],
    title: 'Harness Platform M1: closing the operator loop',
  },
  {
    eyebrow: 'DAY 002 / TURBOPASS',
    footerSummary:
      'The public repository contains the compatible API, durable rotation worker, complete local stack, and lifecycle load harness described here.',
    footerTitle: 'Inspect the bridge removal and follow one token end to end.',
    modifiedAt: '2026-08-30',
    publishedAt: '2026-08-30',
    readingMinutes: 24,
    repositories: [
      {
        commit: 'f18da5682c80fb1afe08348187e4c2f39bd4714a',
        label: 'TurboPass',
        url: 'https://github.com/saberistic-team/turbopass',
      },
    ],
    sections: [
      ['brief', 'The rebuild brief'],
      ['archaeology', 'Repository archaeology'],
      ['ffi-bridge', 'The FFI bridge'],
      ['native-rust', 'The native Rust boundary'],
      ['token-lifecycle', 'Token lifecycle'],
      ['compatibility', 'Compatibility contract'],
      ['storage', 'Postgres + DynamoDB'],
      ['temporal-boundary', 'Temporal boundary'],
      ['rotation-activity', 'Retry-safe rotation'],
      ['full-stack', 'Complete local stack'],
      ['load-testing', 'Lifecycle load testing'],
      ['verification', 'Verified result'],
      ['production-gates', 'Production gates'],
      ['files', 'File guide'],
      ['next', 'What is next'],
    ],
    seoTitle: 'TurboPass: Rust tokens and Temporal rotation',
    slug: 'turbopass-rust-temporal',
    summary:
      'How I rebuilt a Privacy Pass-style token server in Rust, targeted its documented API and storage contracts, and moved issuer-key rotation into durable Temporal workflows.',
    tags: ['Rust', 'Temporal', 'Privacy Pass', 'FFI'],
    title: 'TurboPass: removing the FFI bridge without changing the cryptography',
  },
  {
    eyebrow: 'DAY 001 / HARNESS FROM SCRATCH',
    footerSummary:
      'The repository is public, and the next milestone will become another source-verified build note.',
    footerTitle: 'See the system, then watch it change.',
    modifiedAt: '2026-08-30',
    publishedAt: '2026-08-30',
    readingMinutes: 18,
    repositories: [
      {
        commit: '88ef2f4030ea7cb07a7d183032dc23a43eea734e',
        label: 'Harness Platform',
        url: 'https://github.com/saberistic-team/harness-platform',
      },
    ],
    sections: [
      ['why-a-harness', 'Why a harness'],
      ['mental-model', 'Mental model'],
      ['scope-m0', 'M0 scope'],
      ['bootstrap', 'Pi + Qwen'],
      ['repository', 'Repository'],
      ['task-contract', 'Task contract'],
      ['events', 'Events'],
      ['kernel', 'Kernel'],
      ['policy-and-gate', 'Policy + gate'],
      ['debugging', 'What broke'],
      ['verification', 'Verification'],
      ['limits', 'Current truth'],
      ['files', 'File guide'],
      ['next', 'What is next'],
    ],
    seoTitle: 'Harness from Scratch: a self-checking harness',
    slug: 'harness-from-scratch',
    summary:
      'How I used Pi and a local Qwen model to bootstrap a TypeScript agent harness whose own task contract can block unsafe changes and produce evidence.',
    tags: ['Agent harnesses', 'TypeScript', 'Local AI', 'Dogfooding'],
    title: 'Harness from Scratch: building the system that checks its own work',
  },
] as const satisfies readonly BuildNote[]

const buildNoteSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const publishedBuildNoteSlugs = new Set<string>(buildNotes.map((note) => note.slug))

export function getBuildNote(slug: string): BuildNote | undefined {
  return buildNotes.find((note) => note.slug === slug)
}

export function isPublishedBuildNoteSlug(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 120 &&
    buildNoteSlugPattern.test(value) &&
    publishedBuildNoteSlugs.has(value)
  )
}

export function formatBuildNoteDate(value: string): string {
  const date = new Date(`${value}T12:00:00Z`)

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(date)
}
