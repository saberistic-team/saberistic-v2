import { buildNotes } from './build-notes'

function escapeXML(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export function createBuildNotesRSS(): string {
  const items = buildNotes
    .map((note) => {
      const url = `https://saberistic.com/build-notes/${note.slug}/`
      const date = new Date(`${note.publishedAt}T12:00:00Z`).toUTCString()

      return `    <item>
      <title>${escapeXML(note.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${date}</pubDate>
      <description>${escapeXML(note.summary)}</description>
    </item>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Saberistic Build Notes</title>
    <link>https://saberistic.com/build-notes/</link>
    <atom:link href="https://saberistic.com/build-notes/feed.xml" rel="self" type="application/rss+xml" />
    <description>Daily engineering decisions, code, failures, diagrams, and verified results from Saberistic.</description>
    <language>en-us</language>
${items}
  </channel>
</rss>
`
}
