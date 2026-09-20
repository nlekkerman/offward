const WAYPOINT_TYPE_LABELS = {
  start: 'Start',
  via: 'Via',
  stop: 'Stop',
  finish: 'Finish',
}

import { getWaypointDisplayName } from '../routeMap/routeMapUtils.js'
import RouteMediaGrid from './RouteMediaGrid.jsx'
import { resolveAttachedVideos } from './routeMediaUtils.js'

function getWaypointTypeLabel(type) {
  return WAYPOINT_TYPE_LABELS[type] || 'Via'
}

function getWaypointLabel(waypoint) {
  return getWaypointDisplayName(waypoint)
}

function RouteItinerary({ waypoints, selectedWaypointId, onWaypointSelect, videoById = new Map() }) {
  if (waypoints.length === 0) {
    return <p className="route-detail-muted">Published waypoints will appear here when they are available.</p>
  }

  const selectedWaypoint = waypoints.find((waypoint) => waypoint.id === selectedWaypointId)
  const selectedWaypointVideos = selectedWaypoint ? resolveAttachedVideos(selectedWaypoint.media_ids, videoById) : []

  return (
    <>
      <ol className="route-waypoint-chip-list">
        {waypoints.map((waypoint) => {
          const selected = waypoint.id === selectedWaypointId
          const showType = waypoint.type === 'start' || waypoint.type === 'finish'
          const videoCount = resolveAttachedVideos(waypoint.media_ids, videoById).length
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
                {videoCount > 0 && <span className="route-waypoint-chip-media" aria-label={`${videoCount} video${videoCount === 1 ? '' : 's'}`}>▶ {videoCount}</span>}
              </button>
            </li>
          )
        })}
      </ol>

      {selectedWaypointVideos.length > 0 && (
        <div className="route-waypoint-media-panel">
          <p className="eyebrow">Videos</p>
          <RouteMediaGrid videos={selectedWaypointVideos} />
        </div>
      )}
    </>
  )
}

export default RouteItinerary