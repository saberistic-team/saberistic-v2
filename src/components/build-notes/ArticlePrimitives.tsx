import type { ReactNode } from 'react'

export function CodeBlock({
  code,
  label,
  language,
  sourceHref,
}: {
  code: string
  label: string
  language: string
  sourceHref?: string
}) {
  return (
    <figure className="article-code">
      <figcaption>
        <span>{label}</span>
        {sourceHref ? (
          <a href={sourceHref} rel="external">
            {language} · source <span aria-hidden="true">↗</span>
          </a>
        ) : (
          <span>{language}</span>
        )}
      </figcaption>
      <pre tabIndex={0}>
        <code>{code}</code>
      </pre>
    </figure>
  )
}

export function ArticleCallout({
  children,
  title,
  tone = 'note',
}: {
  children: ReactNode
  title: string
  tone?: 'note' | 'warning' | 'success'
}) {
  return (
    <aside className={`article-callout article-callout--${tone}`}>
      <p className="eyebrow">{title}</p>
      <div>{children}</div>
    </aside>
  )
}

export function DiagramFrame({
  children,
  description,
  title,
}: {
  children: ReactNode
  description: string
  title: string
}) {
  return (
    <figure className="article-diagram">
      <div className="article-diagram__canvas">{children}</div>
      <figcaption>
        <strong>{title}</strong>
        <span>{description}</span>
      </figcaption>
    </figure>
  )
}
