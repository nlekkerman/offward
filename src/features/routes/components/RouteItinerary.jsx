const WAYPOINT_TYPE_LABELS = {
  start: 'Start',
  via: 'Via',
  stop: 'Stop',
  finish: 'Finish',
}

import { getWaypointDisplayName } from '../routeMap/routeMapUtils.js'

function getWaypointTypeLabel(type) {
  return WAYPOINT_TYPE_LABELS[type] || 'Via'
}

function getWaypointLabel(waypoint) {
  return getWaypointDisplayName(waypoint)
}

function RouteItinerary({ waypoints, selectedWaypointId, onWaypointSelect }) {
  if (waypoints.length === 0) {
    return <p className="route-detail-muted">Published waypoints will appear here when they are available.</p>
  }

  return (
    <ol className="route-waypoint-chip-list">
      {waypoints.map((waypoint) => {
        const selected = waypoint.id === selectedWaypointId
        const showType = waypoint.type === 'start' || waypoint.type === 'finish'
        return (
          <li key={waypoint.id}>
            <button
              type="button"
              className={selected ? 'route-waypoint-chip is-selected' : 'route-waypoint-chip'}
              aria-pressed={selected}
              onClick={() => onWaypointSelect(waypoint.id)}
            >
              <span className="route-waypoint-chip-order">{waypoint.order}</span>
              <span className="route-waypoint-chip-name">{getWaypointLabel(waypoint)}</span>
              {showType && <span className="route-waypoint-chip-type">{getWaypointTypeLabel(waypoint.type)}</span>}
            </button>
          </li>
        )
      })}
    </ol>
  )
}

export default RouteItinerary