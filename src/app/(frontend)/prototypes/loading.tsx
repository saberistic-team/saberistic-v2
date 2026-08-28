export default function PrototypesLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="page-shell shell loading-state">
      <p className="eyebrow">PROTOTYPE LIBRARY</p>
      <p>Loading build notes…</p>
      <div aria-hidden="true" className="loading-card-grid">
        <span />
        <span />
        <span />
      </div>
    </div>
  )
}
