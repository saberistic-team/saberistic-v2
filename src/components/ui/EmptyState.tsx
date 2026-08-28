import Link from 'next/link'

type EmptyStateProps = {
  action?: { href: string; label: string }
  description: string
  title: string
}

export function EmptyState({ action, description, title }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span aria-hidden="true" className="empty-state__mark">
        ○
      </span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
        {action ? (
          <Link className="text-link" href={action.href}>
            {action.label} <span aria-hidden="true">→</span>
          </Link>
        ) : null}
      </div>
    </div>
  )
}
