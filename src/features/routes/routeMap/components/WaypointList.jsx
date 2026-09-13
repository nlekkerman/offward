function WaypointList({ waypoints, selectedWaypointId, onAdd, onSelect, onMove, onRemove }) {
  return (
    <section className="route-map-panel">
      <div className="route-map-panel-header">
        <div>
          <p className="eyebrow">Waypoints</p>
          <h2>Route order</h2>
        </div>
        <button type="button" className="secondary-button small-button" onClick={onAdd}>Add waypoint</button>
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
                <span>{waypoint.latitude || 'lat'} / {waypoint.longitude || 'lng'}</span>
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
