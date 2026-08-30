import { TrackedLink } from '@/components/analytics/TrackedLink'
import { formatBuildNoteDate, type BuildNote } from '@/lib/build-notes'

export function BuildNoteCard({
  note,
  placement,
}: {
  note: BuildNote
  placement: 'home' | 'index'
}) {
  return (
    <article className="build-note-card">
      <div className="build-note-card__meta">
        <time dateTime={note.publishedAt}>{formatBuildNoteDate(note.publishedAt)}</time>
        <span>{note.readingMinutes} min read</span>
      </div>
      <p className="eyebrow">{note.eyebrow}</p>
      <h3>
        <TrackedLink
          analyticsEvent={{
            data: { note: note.slug, placement },
            name: 'build_note_card_clicked',
          }}
          href={`/build-notes/${note.slug}`}
        >
          {note.title}
        </TrackedLink>
      </h3>
      <p>{note.summary}</p>
      <ul aria-label="Topics" className="tag-list">
        {note.tags.map((tag) => (
          <li key={tag}>{tag}</li>
        ))}
      </ul>
      <TrackedLink
        analyticsEvent={{
          data: { note: note.slug, placement },
          name: 'build_note_card_clicked',
        }}
        className="text-link"
        href={`/build-notes/${note.slug}`}
      >
        Read the build note <span aria-hidden="true">→</span>
      </TrackedLink>
    </article>
  )
}
