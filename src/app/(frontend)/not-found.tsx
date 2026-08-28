import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="page-shell shell error-state">
      <p className="eyebrow">404 / NOT FOUND</p>
      <h1>There’s nothing at this address.</h1>
      <p>It may have moved, or the prototype may no longer be public.</p>
      <div className="action-row">
        <Link className="button" href="/prototypes">
          Explore prototypes
        </Link>
        <Link className="button button--quiet" href="/">
          Return home
        </Link>
      </div>
    </div>
  )
}
