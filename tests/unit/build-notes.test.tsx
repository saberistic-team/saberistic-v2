import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { HarnessFromScratchArticle } from '@/content/build-notes/HarnessFromScratch'
import { buildNotes, getBuildNote } from '@/lib/build-notes'
import { createBuildNotesRSS } from '@/lib/build-notes-feed'

describe('Git-authored build notes', () => {
  it('publishes an explicit, unique, newest-first manifest', () => {
    expect(buildNotes.length).toBeGreaterThan(0)

    const slugs = buildNotes.map((note) => note.slug)
    expect(new Set(slugs).size).toBe(slugs.length)

    for (const note of buildNotes) {
      expect(note.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      expect(note.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(note.modifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(Date.parse(note.modifiedAt)).toBeGreaterThanOrEqual(Date.parse(note.publishedAt))
      expect(note.readingMinutes).toBeGreaterThan(0)
      expect(note.repositoryCommit).toMatch(/^[a-f0-9]{40}$/)
      expect(`${note.seoTitle} — Saberistic`.length).toBeLessThanOrEqual(60)
      expect(note.summary.length).toBeLessThanOrEqual(200)
    }

    expect([...buildNotes].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))).toEqual(
      buildNotes,
    )
    expect(getBuildNote('harness-from-scratch')?.repositoryCommit.slice(0, 7)).toBe('88ef2f4')
  })

  it('renders the article with labeled code, accessible diagrams, and explicit limits', () => {
    const html = renderToStaticMarkup(createElement(HarnessFromScratchArticle))

    expect(html).toContain('The harness’s best moment was refusing its own work.')
    expect(html).toContain('M0 is a foundation, not the finished platform.')
    expect(html).toContain('tabindex="0"')
    expect(html.match(/<figure class="article-code">/g)?.length).toBeGreaterThanOrEqual(8)
    expect(html.match(/<svg aria-labelledby=/g)?.length).toBe(4)
    expect(html.match(/<title id=/g)?.length).toBe(4)
    expect(html.match(/<desc id=/g)?.length).toBe(4)
    expect(html).toContain('40 / 40')
    expect(html).toContain('does not invoke Pi, Qwen')
  })

  it('emits a valid RSS item for every published note', () => {
    const rss = createBuildNotesRSS()

    expect(rss).toContain('<rss version="2.0"')
    expect(rss).toContain('<title>Saberistic Build Notes</title>')
    for (const note of buildNotes) {
      expect(rss).toContain(`<link>https://saberistic.com/build-notes/${note.slug}/</link>`)
      expect(rss).toContain(
        `<guid isPermaLink="true">https://saberistic.com/build-notes/${note.slug}/</guid>`,
      )
    }
  })
})
