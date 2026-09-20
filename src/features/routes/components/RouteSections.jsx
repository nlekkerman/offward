import { isRenderableRoute } from '../../map/mapGeometry.js'
import { getWaypointDisplayName } from '../routeMap/routeMapUtils.js'

function getOrderedSegments(segments) {
  if (!Array.isArray(segments)) {
    return []
  }

  return segments
    .filter((segment) => segment && typeof segment === 'object')
    .map((segment, index) => ({
      ...segment,
      order: Number.isFinite(Number(segment.order)) ? Number(segment.order) : index + 1,
      title: typeof segment.title === 'string' ? segment.title.trim() : '',
      summary: typeof segment.summary === 'string' ? segment.summary.trim() : '',
    }))
    .sort((a, b) => a.order - b.order)
}

function getWaypointLabel(waypoint) {
  return getWaypointDisplayName(waypoint)
}

function RouteSections({ segments, waypoints, selectedSegmentId, onSegmentSelect, mediaCountById = new Map() }) {
  const orderedSegments = getOrderedSegments(segments)

  if (orderedSegments.length === 0) {
    return null
  }

  const waypointById = new Map(waypoints.map((waypoint) => [waypoint.id, waypoint]))

  return (
    <ol className="route-sections-chip-list">
      {orderedSegments.map((segment) => {
        const available = typeof segment.id === 'string' && isRenderableRoute(segment)
        const expanded = segment.id === selectedSegmentId
        const title = segment.title || `Section ${segment.order}`
        const startWaypoint = segment.start_waypoint_id ? waypointById.get(segment.start_waypoint_id) : null
        const endWaypoint = segment.end_waypoint_id ? waypointById.get(segment.end_waypoint_id) : null
        const compactSummary = startWaypoint && endWaypoint ? `${getWaypointLabel(startWaypoint)} → ${getWaypointLabel(endWaypoint)}` : ''
        const mediaCount = mediaCountById.get(segment.id) || 0

        return (
          <li
            key={segment.id || `${segment.order}-${segment.title || segment.summary}`}
            className={expanded ? 'route-section-card is-selected' : 'route-section-card'}
          >
            <button
              type="button"
              className="route-section-toggle"
              aria-expanded={expanded}
              aria-disabled={!available}
              disabled={!available}
              onClick={() => onSegmentSelect(segment.id)}
            >
              <span className="route-section-order">Section {segment.order}</span>
              <span className="route-section-copy">
                <strong>{title}</strong>
                {compactSummary && <span className="route-section-compact-summary">{compactSummary}</span>}
                {mediaCount > 0 && <span className="route-section-media-badge">Media {mediaCount}</span>}
                {!available && <span className="route-section-unavailable">Map geometry unavailable</span>}
              </span>
              {available && (
                <span className="route-section-toggle-label" aria-hidden="true">
                  {expanded ? 'Selected' : 'View on map'}
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ol>
  )
}

export default RouteSections