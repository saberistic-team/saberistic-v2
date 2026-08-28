export default function FrontendLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="page-shell shell loading-state">
      <p className="eyebrow">LOADING</p>
      <p>Preparing the page…</p>
      <div aria-hidden="true" className="loading-lines">
        <span />
        <span />
        <span />
      </div>
    </div>
  )
}
