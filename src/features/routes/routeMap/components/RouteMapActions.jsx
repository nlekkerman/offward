function RouteMapActions({ calculating, saving, accepting, hasCandidate, onSave, onCalculate, onAccept }) {
  return (
    <div className="route-map-actions">
      <button type="button" className="secondary-button" onClick={onCalculate} disabled={calculating || saving || accepting}>
        {calculating ? 'Calculating...' : 'Calculate candidate'}
      </button>
      <button type="button" className="secondary-button" onClick={onAccept} disabled={!hasCandidate || calculating || saving || accepting}>
        {accepting ? 'Accepting...' : 'Accept candidate'}
      </button>
      <button type="button" className="primary-button" onClick={onSave} disabled={saving || calculating || accepting}>
        {saving ? 'Saving...' : 'Save map revision'}
      </button>
    </div>
  )
}

export default RouteMapActions
