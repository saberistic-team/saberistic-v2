import type { Metadata } from 'next'
import type { ComponentType } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { TrackEventOnMount } from '@/components/analytics/TrackEventOnMount'
import { TrackedAnchor } from '@/components/analytics/TrackedLink'
import { JsonLd } from '@/components/seo/JsonLd'
import { HarnessFromScratchArticle } from '@/content/build-notes/HarnessFromScratch'
import { TurboPassArticle } from '@/content/build-notes/TurboPass'
import { buildNotes, formatBuildNoteDate, getBuildNote } from '@/lib/build-notes'
import { createPageMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

type BuildNotePageProps = {
  params: Promise<{ slug: string }>
}

const articleBySlug = {
  'harness-from-scratch': HarnessFromScratchArticle,
  'turbopass-rust-temporal': TurboPassArticle,
} as const satisfies Record<(typeof buildNotes)[number]['slug'], ComponentType>

export async function generateMetadata({ params }: BuildNotePageProps): Promise<Metadata> {
  const { slug } = await params
  const note = getBuildNote(slug)

  if (!note) return { title: 'Build note' }

  return createPageMetadata({
    article: {
      modifiedTime: note.modifiedAt,
      publishedTime: note.publishedAt,
      tags: [...note.tags],
    },
    description: note.summary,
    path: `/build-notes/${note.slug}/`,
    title: note.seoTitle,
  })
}

export default async function BuildNotePage({ params }: BuildNotePageProps) {
  const { slug } = await params
  const note = getBuildNote(slug)
  const Article = articleBySlug[slug as keyof typeof articleBySlug]

  if (!note || !Article) notFound()

  const canonical = `https://saberistic.com/build-notes/${note.slug}/`
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          item: 'https://saberistic.com/build-notes/',
          name: 'Build notes',
          position: 1,
        },
        {
          '@type': 'ListItem',
          item: canonical,
          name: note.title,
          position: 2,
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      author: {
        '@type': 'Person',
        name: 'AmirSaber Sharifi',
        url: 'https://saberistic.com/#about',
      },
      dateModified: note.modifiedAt,
      datePublished: note.publishedAt,
      description: note.summary,
      headline: note.title,
      image: 'https://saberistic.com/brand/saberistic-mark.png',
      isPartOf: {
        '@type': 'Blog',
        name: 'Saberistic Build Notes',
        url: 'https://saberistic.com/build-notes/',
      },
      keywords: note.tags.join(', '),
      mainEntityOfPage: canonical,
      publisher: {
        '@type': 'Organization',
        logo: {
          '@type': 'ImageObject',
          url: 'https://saberistic.com/brand/saberistic-mark.png',
        },
        name: 'Saberistic',
      },
      url: canonical,
    },
  ]

  return (
    <article className="build-note">
      <JsonLd data={structuredData} id={`build-note-${note.slug}-structured-data`} />
      <TrackEventOnMount event={{ data: { note: note.slug }, name: 'build_note_view' }} />
      <header className="build-note__header shell">
        <nav aria-label="Breadcrumb">
          <ol className="breadcrumb">
            <li>
              <Link href="/build-notes" prefetch={false}>
                Build notes
              </Link>
            </li>
            <li aria-current="page">{note.title}</li>
          </ol>
        </nav>
        <div className="build-note__header-grid">
          <div>
            <p className="eyebrow">{note.eyebrow}</p>
            <h1>{note.title}</h1>
            <p className="build-note__dek">{note.summary}</p>
          </div>
          <aside aria-label="Article facts" className="build-note__facts">
            <dl>
              <div>
                <dt>Published</dt>
                <dd>
                  <time dateTime={note.publishedAt}>{formatBuildNoteDate(note.publishedAt)}</time>
                </dd>
              </div>
              <div>
                <dt>Reading time</dt>
                <dd>{note.readingMinutes} minutes</dd>
              </div>
              <div>
                <dt>Verified commit</dt>
                <dd>
                  <code>{note.repositoryCommit.slice(0, 7)}</code>
                </dd>
              </div>
              <div>
                <dt>Author</dt>
                <dd>AmirSaber Sharifi</dd>
              </div>
            </dl>
            <TrackedAnchor
              analyticsEvent={{ data: { note: note.slug }, name: 'build_note_source_clicked' }}
              className="button button--quiet"
              href={note.repositoryUrl}
              rel="external"
            >
              Inspect the repository <span aria-hidden="true">↗</span>
            </TrackedAnchor>
          </aside>
        </div>
      </header>

      <div className="build-note__layout shell">
        <aside className="build-note-toc">
          <p className="eyebrow">IN THIS NOTE</p>
          <nav aria-label="Article contents">
            <ol>
              {note.sections.map(([id, label], index) => (
                <li key={id}>
                  <a href={`#${id}`}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    {label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>
        <div className="build-note-content">
          <Article />
        </div>
      </div>

      <footer className="build-note__footer shell">
        <p className="eyebrow">CONTINUE EXPLORING</p>
        <div>
          <h2>{note.footerTitle}</h2>
          <p>{note.footerSummary}</p>
        </div>
        <TrackedAnchor
          analyticsEvent={{ data: { note: note.slug }, name: 'build_note_source_clicked' }}
          className="button"
          href={note.repositoryUrl}
          rel="external"
        >
          Open {note.repositoryLabel} <span aria-hidden="true">↗</span>
        </TrackedAnchor>
      </footer>
    </article>
  )
}
