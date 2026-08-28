'use client'

import Link from 'next/link'

export default function FrontendError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="page-shell shell error-state" role="alert">
      <p className="eyebrow">RECOVERABLE ERROR</p>
      <h1>This page didn’t finish loading.</h1>
      <p>One part of the site failed to respond. Try again, or return to the homepage.</p>
      <div className="action-row">
        <button className="button" onClick={reset} type="button">
          Try again
        </button>
        <Link className="button button--quiet" href="/">
          Return home
        </Link>
      </div>
    </div>
  )
}
