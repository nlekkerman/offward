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

function RouteSections({ segments, waypoints, selectedSegmentId, selectedSegment, onSegmentSelect, onDeselect }) {
  const orderedSegments = getOrderedSegments(segments)

  if (orderedSegments.length === 0) {
    return null
  }

  const waypointById = new Map(waypoints.map((waypoint) => [waypoint.id, waypoint]))
  const startWaypoint = selectedSegment?.start_waypoint_id ? waypointById.get(selectedSegment.start_waypoint_id) : null
  const endWaypoint = selectedSegment?.end_waypoint_id ? waypointById.get(selectedSegment.end_waypoint_id) : null
  const selectedTitle = selectedSegment?.title || (selectedSegment ? `Section ${selectedSegment.order}` : '')

  return (
    <section className="route-detail-panel route-sections-panel" aria-labelledby="route-sections-title">
      <p className="eyebrow">SECTIONS</p>
      <h2 id="route-sections-title">Journey sections</h2>
      <ol className="route-sections-list">
        {orderedSegments.map((segment) => {
          const available = typeof segment.id === 'string' && isRenderableRoute(segment)
          const selected = segment.id === selectedSegmentId
          const title = segment.title || `Section ${segment.order}`
          return (
          <li key={segment.id || `${segment.order}-${segment.title || segment.summary}`}>
            <button
              type="button"
              className={selected ? 'route-section-item is-selected' : 'route-section-item'}
              aria-pressed={selected}
              aria-disabled={!available}
              disabled={!available}
              onClick={() => onSegmentSelect(segment.id)}
            >
              <span className="route-section-order">Section {segment.order}</span>
              <span className="route-section-copy">
                <strong>{title}</strong>
                {segment.summary && <span>{segment.summary}</span>}
                {!available && <span className="route-section-unavailable">Map geometry unavailable</span>}
              </span>
            </button>
          </li>
          )
        })}
      </ol>
      {selectedSegment && (
        <div className="route-segment-detail" aria-labelledby="route-segment-detail-title">
          <div>
            <span className="route-section-order">Section {selectedSegment.order}</span>
            <h3 id="route-segment-detail-title">{selectedTitle}</h3>
          </div>
          {selectedSegment.summary && <p>{selectedSegment.summary}</p>}
          {(startWaypoint || endWaypoint) && (
            <dl className="route-segment-boundaries">
              {startWaypoint && <div><dt>Start</dt><dd>{getWaypointLabel(startWaypoint)}</dd></div>}
              {endWaypoint && <div><dt>End</dt><dd>{getWaypointLabel(endWaypoint)}</dd></div>}
            </dl>
          )}
          <button type="button" className="secondary-button small-button route-segment-deselect" onClick={onDeselect}>Show full route</button>
        </div>
      )}
    </section>
  )
}

export default RouteSections