import { getPlaceCoordinates } from '../routeMapUtils.js'

function WaypointList({ waypoints, places, selectedWaypointId, addMode, onAddBlank, onAddModeChange, onAddFromPlace, onSelect, onMove, onRemove }) {
  return (
    <section className="route-map-panel">
      <div className="route-map-panel-header">
        <div>
          <p className="eyebrow">Waypoints</p>
          <h2>Route order</h2>
        </div>
        <div className="waypoint-add-actions">
          <button type="button" className="secondary-button small-button" onClick={onAddBlank}>Add blank</button>
          <button type="button" className={addMode ? 'primary-button small-button' : 'secondary-button small-button'} onClick={() => onAddModeChange(!addMode)} aria-pressed={addMode}>
            {addMode ? 'Click map...' : 'Add by map click'}
          </button>
        </div>
      </div>

      <div className="form-field waypoint-place-add-field">
        <label htmlFor="add-waypoint-place">Add Waypoint from Place</label>
        <select id="add-waypoint-place" value="" onChange={(event) => onAddFromPlace(event.target.value)} className="form-input">
          <option value="">Select Place with coordinates</option>
          {places.map((place) => {
            const hasCoordinates = Boolean(getPlaceCoordinates(place))
            return <option key={place.id} value={place.id} disabled={!hasCoordinates}>{place.name || place.title || place.slug || place.id}</option>
          })}
        </select>
      </div>

      {!waypoints.length ? (
        <div className="management-empty route-map-empty">No waypoints yet.</div>
      ) : (
        <div className="waypoint-list">
          {waypoints.map((waypoint, index) => (
            <div
              key={waypoint.id}
              className={waypoint.id === selectedWaypointId ? 'waypoint-list-item is-selected' : 'waypoint-list-item'}
            >
              <button type="button" className="waypoint-select-button" onClick={() => onSelect(waypoint.id)}>
                <span className="waypoint-order">{index + 1}</span>
                <span className="waypoint-list-copy">
                  <strong>{waypoint.label || waypoint.type}</strong>
                  <span>{waypoint.type} · {waypoint.latitude || 'lat'} / {waypoint.longitude || 'lng'}</span>
                </span>
              </button>
              <span className="waypoint-inline-actions">
                <button type="button" className="secondary-button small-button" onClick={() => onMove(index, -1)} disabled={index === 0}>Up</button>
                <button type="button" className="secondary-button small-button" onClick={() => onMove(index, 1)} disabled={index === waypoints.length - 1}>Down</button>
                <button type="button" className="danger-button small-button" onClick={() => onRemove(waypoint.id)}>Remove</button>
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default WaypointList
