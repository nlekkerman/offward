const WAYPOINT_TYPE_LABELS = {
  start: 'Start',
  via: 'Via',
  stop: 'Stop',
  finish: 'Finish',
}

function getWaypointTypeLabel(type) {
  return WAYPOINT_TYPE_LABELS[type] || 'Via'
}

function getWaypointLabel(waypoint) {
  const label = typeof waypoint.label === 'string' ? waypoint.label.trim() : ''
  return label || `Waypoint ${waypoint.order}`
}

function RouteItinerary({ waypoints, selectedWaypointId, onWaypointSelect }) {
  if (waypoints.length === 0) {
    return (
      <section className="route-detail-panel" aria-labelledby="route-itinerary-title">
        <p className="eyebrow">ITINERARY</p>
        <h2 id="route-itinerary-title">Waypoints</h2>
        <p className="route-detail-muted">Published waypoints will appear here when they are available.</p>
      </section>
    )
  }

  return (
    <section className="route-detail-panel" aria-labelledby="route-itinerary-title">
      <p className="eyebrow">ITINERARY</p>
      <h2 id="route-itinerary-title">Waypoints</h2>
      <ol className="route-itinerary-list">
        {waypoints.map((waypoint) => {
          const selected = waypoint.id === selectedWaypointId
          return (
            <li key={waypoint.id}>
              <button
                type="button"
                className={selected ? 'route-itinerary-item is-selected' : 'route-itinerary-item'}
                aria-pressed={selected}
                onClick={() => onWaypointSelect(waypoint.id)}
              >
                <span className="waypoint-order">{waypoint.order}</span>
                <span className="route-itinerary-copy">
                  <span>{getWaypointTypeLabel(waypoint.type)}</span>
                  <strong>{getWaypointLabel(waypoint)}</strong>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

export default RouteItinerary