function CatalogStatus({ catalog, label, disabled = false }) {
  return (
    <div className="management-catalog-status">
      {catalog.loading && <p role="status">Loading {label}...</p>}
      {catalog.error && <p className="management-error" role="alert">{catalog.error} <button type="button" className="secondary-button small-button" onClick={catalog.next ? catalog.loadMore : catalog.retry} disabled={disabled || catalog.loadingMore}>Retry</button></p>}
      {!catalog.loading && !catalog.error && catalog.items.length === 0 && <p>No {label} found.</p>}
      {catalog.resolving && <p role="status">Resolving selected {label}...</p>}
      {catalog.unresolvedErrors.length > 0 && <div className="management-error" role="alert"><p>Some selected {label} could not be resolved. Their IDs remain attached.</p><ul>{catalog.unresolvedErrors.map((error) => <li key={error}>{error}</li>)}</ul><button type="button" className="secondary-button small-button" onClick={catalog.retry} disabled={disabled}>Retry selected records</button></div>}
      {catalog.next && <div><p role="status">More {label} are available. Search covers loaded records only.</p><button type="button" className="secondary-button small-button" onClick={catalog.loadMore} disabled={disabled || catalog.loadingMore}>{catalog.loadingMore ? 'Loading more...' : `Load more ${label}`}</button></div>}
    </div>
  )
}

export default CatalogStatus
