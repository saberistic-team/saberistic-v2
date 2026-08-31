import type { Metadata } from 'next'
import type { ComponentType } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { TrackEventOnMount } from '@/components/analytics/TrackEventOnMount'
import { TrackedAnchor } from '@/components/analytics/TrackedLink'
import { JsonLd } from '@/components/seo/JsonLd'
import { CryptoPalArticle } from '@/content/build-notes/CryptoPal'
import { GrowthProgramArticle } from '@/content/build-notes/GrowthProgram'
import { HarnessFromScratchArticle } from '@/content/build-notes/HarnessFromScratch'
import { HarnessOperatorLoopArticle } from '@/content/build-notes/HarnessOperatorLoop'
import { LovablePrototypeTrioArticle } from '@/content/build-notes/LovablePrototypeTrio'
import { TurboPassArticle } from '@/content/build-notes/TurboPass'
import { buildNotes, formatBuildNoteDate, getBuildNote } from '@/lib/build-notes'
import { createPageMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

type BuildNotePageProps = {
  params: Promise<{ slug: string }>
}

const articleBySlug = {
  'cryptopal-wallet-email-wallet': CryptoPalArticle,
  'growth-program-v2-scorecards': GrowthProgramArticle,
  'harness-from-scratch': HarnessFromScratchArticle,
  'harness-operator-loop-m1': HarnessOperatorLoopArticle,
  'three-lovable-prototypes': LovablePrototypeTrioArticle,
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
  const structuredData: Record<string, unknown>[] = [
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

  if (note.slug === 'cryptopal-wallet-email-wallet') {
    structuredData.push({
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      accessibilityFeature: 'transcript',
      accessibilitySummary:
        'This silent recording has an adjacent timestamped visual transcript describing every chapter.',
      accessMode: 'visual',
      author: {
        '@type': 'Person',
        name: 'AmirSaber Sharifi',
        url: 'https://saberistic.com/#about',
      },
      caption:
        'A complete local CryptoPal transfer from sender wallet through an email claim to a distinct receiver wallet.',
      contentSize: '8916669 bytes',
      contentUrl:
        'https://saberistic.com/media/build-notes/cryptopal/cryptopal-private-transfer.cafb08d2.mp4',
      description:
        'A silent 3:20 local demo of one cUSD moving through two independently blinded credential handoffs, Mailpit delivery, a fresh receiver wallet, and RPC-verified final balances.',
      duration: 'PT3M20S',
      encodingFormat: 'video/mp4',
      height: 900,
      inLanguage: 'en',
      isAccessibleForFree: true,
      name: 'CryptoPal private transfer: wallet to email to wallet',
      sha256: 'cafb08d2f0d0a718db3f3556416ee234a98075fd2155ed0fc0da10491c5d8e03',
      thumbnailUrl:
        'https://saberistic.com/media/build-notes/cryptopal/cryptopal-private-transfer-poster.b9a20494.webp',
      uploadDate: note.modifiedAt,
      width: 1440,
    })
  }

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
                <dt>{note.repositories.length === 1 ? 'Verified commit' : 'Verified sources'}</dt>
                <dd>
                  {note.repositories.length === 1 ? (
                    <code>{note.repositories[0].commit.slice(0, 7)}</code>
                  ) : (
                    `${note.repositories.length} pinned commits`
                  )}
                </dd>
              </div>
              <div>
                <dt>Author</dt>
                <dd>AmirSaber Sharifi</dd>
              </div>
            </dl>
            <div className="build-note__source-actions">
              {note.repositories.map((repository) => (
                <TrackedAnchor
                  analyticsEvent={{ data: { note: note.slug }, name: 'build_note_source_clicked' }}
                  className="button button--quiet"
                  href={repository.url}
                  key={repository.url}
                  rel="external"
                >
                  Open {repository.label} <span aria-hidden="true">↗</span>
                </TrackedAnchor>
              ))}
            </div>
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
        <div className="build-note__source-actions">
          {note.repositories.map((repository) => (
            <TrackedAnchor
              analyticsEvent={{ data: { note: note.slug }, name: 'build_note_source_clicked' }}
              className="button"
              href={repository.url}
              key={repository.url}
              rel="external"
            >
              Open {repository.label} <span aria-hidden="true">↗</span>
            </TrackedAnchor>
          ))}
        </div>
      </footer>
    </article>
  )
}
