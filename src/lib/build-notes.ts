export type BuildNote = {
  eyebrow: string
  modifiedAt: string
  publishedAt: string
  readingMinutes: number
  repositoryCommit: string
  repositoryUrl: string
  seoTitle: string
  slug: string
  summary: string
  tags: readonly string[]
  title: string
}

export const buildNotes = [
  {
    eyebrow: 'DAY 001 / HARNESS FROM SCRATCH',
    modifiedAt: '2026-08-30',
    publishedAt: '2026-08-30',
    readingMinutes: 18,
    repositoryCommit: '88ef2f4030ea7cb07a7d183032dc23a43eea734e',
    repositoryUrl: 'https://github.com/saberistic-team/harness-platform',
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
