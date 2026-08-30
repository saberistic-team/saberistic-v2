export type BuildNote = {
  eyebrow: string
  footerSummary: string
  footerTitle: string
  modifiedAt: string
  publishedAt: string
  readingMinutes: number
  repositoryCommit: string
  repositoryLabel: string
  repositoryUrl: string
  sections: readonly (readonly [id: string, label: string])[]
  seoTitle: string
  slug: string
  summary: string
  tags: readonly string[]
  title: string
}

export const buildNotes = [
  {
    eyebrow: 'STAGE 1 / MILESTONE 1',
    footerSummary:
      'The pinned public commit contains the five task manifests, SQLite store, terminal viewer, eval runner, rule compiler, and CI workflow described here.',
    footerTitle: 'Inspect the operator loop and its evidence boundaries.',
    modifiedAt: '2026-08-30',
    publishedAt: '2026-08-30',
    readingMinutes: 25,
    repositoryCommit: 'a596fc54af8b4581ac9619d01b6ad364cfde25cb',
    repositoryLabel: 'Harness Platform',
    repositoryUrl: 'https://github.com/saberistic-team/harness-platform',
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
    repositoryCommit: 'f18da5682c80fb1afe08348187e4c2f39bd4714a',
    repositoryLabel: 'TurboPass',
    repositoryUrl: 'https://github.com/saberistic-team/turbopass',
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
    repositoryCommit: '88ef2f4030ea7cb07a7d183032dc23a43eea734e',
    repositoryLabel: 'Harness Platform',
    repositoryUrl: 'https://github.com/saberistic-team/harness-platform',
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
