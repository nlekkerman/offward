function RouteMapActions({ calculating, saving, accepting, importingGpx, creatingWaypoints, canCalculate, canAccept, hasUnsavedChanges, onSave, onCalculate, onAccept, onImportGpx, showSave = false }) {
  return (
    <div className="route-map-actions" aria-label="Route map actions">
      <button type="button" className="secondary-button" onClick={onCalculate} disabled={!canCalculate || calculating || saving || accepting || creatingWaypoints}>
        {calculating ? 'Calculating...' : 'Calculate candidate'}
      </button>
      <button type="button" className="secondary-button" onClick={onImportGpx} disabled={calculating || saving || accepting || importingGpx || creatingWaypoints}>
        {importingGpx ? 'Importing GPX...' : 'Import GPX'}
      </button>
      <button type="button" className="secondary-button" onClick={onAccept} disabled={!canAccept || calculating || saving || accepting || creatingWaypoints}>
        {accepting ? 'Accepting...' : 'Accept candidate'}
      </button>
      {showSave && (
        <button type="button" className="primary-button" onClick={onSave} disabled={saving || calculating || accepting}>
          {saving ? 'Saving...' : hasUnsavedChanges ? 'Save waypoints' : 'Waypoints saved'}
        </button>
      )}
    </div>
  )
}

export default RouteMapActions
