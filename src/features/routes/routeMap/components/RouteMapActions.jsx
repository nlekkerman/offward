function RouteMapActions({ calculating, saving, accepting, canCalculate, canAccept, hasUnsavedChanges, onSave, onCalculate, onAccept }) {
  return (
    <div className="route-map-actions" aria-label="Route map actions">
      <button type="button" className="secondary-button" onClick={onCalculate} disabled={!canCalculate || calculating || saving || accepting}>
        {calculating ? 'Calculating...' : 'Calculate candidate'}
      </button>
      <button type="button" className="secondary-button" onClick={onAccept} disabled={!canAccept || calculating || saving || accepting}>
        {accepting ? 'Accepting...' : 'Accept candidate'}
      </button>
      <button type="button" className="primary-button" onClick={onSave} disabled={saving || calculating || accepting}>
        {saving ? 'Saving...' : hasUnsavedChanges ? 'Save waypoints' : 'Waypoints saved'}
      </button>
    </div>
  )
}

export default RouteMapActions
