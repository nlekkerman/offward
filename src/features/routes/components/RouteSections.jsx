import { useEffect, useRef } from 'react'
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

function RouteSections({ segments, waypoints, selectedSegmentId, onSegmentSelect, onDeselect }) {
  const orderedSegments = getOrderedSegments(segments)
  const expandedNodeRefs = useRef(new Map())

  // Bring a newly expanded Segment card into view without jumping the page.
  useEffect(() => {
    if (!selectedSegmentId) {
      return
    }
    const node = expandedNodeRefs.current.get(selectedSegmentId)
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [selectedSegmentId])

  if (orderedSegments.length === 0) {
    return null
  }

  const waypointById = new Map(waypoints.map((waypoint) => [waypoint.id, waypoint]))

  return (
    <section className="route-detail-panel route-sections-panel" aria-labelledby="route-sections-title">
      <p className="eyebrow">SECTIONS</p>
      <h2 id="route-sections-title">Journey sections</h2>
      <ol className="route-sections-list">
        {orderedSegments.map((segment) => {
          const available = typeof segment.id === 'string' && isRenderableRoute(segment)
          const expanded = segment.id === selectedSegmentId
          const title = segment.title || `Section ${segment.order}`
          const startWaypoint = segment.start_waypoint_id ? waypointById.get(segment.start_waypoint_id) : null
          const endWaypoint = segment.end_waypoint_id ? waypointById.get(segment.end_waypoint_id) : null
          const compactSummary = startWaypoint && endWaypoint ? `${getWaypointLabel(startWaypoint)} → ${getWaypointLabel(endWaypoint)}` : ''

          return (
            <li
              key={segment.id || `${segment.order}-${segment.title || segment.summary}`}
              ref={(node) => {
                if (node) {
                  expandedNodeRefs.current.set(segment.id, node)
                } else {
                  expandedNodeRefs.current.delete(segment.id)
                }
              }}
              className={expanded ? 'route-section-item is-selected' : 'route-section-item'}
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
                  {!available && <span className="route-section-unavailable">Map geometry unavailable</span>}
                </span>
                {available && (
                  <span className="route-section-toggle-label" aria-hidden="true">
                    {expanded ? 'Hide details ▲' : 'Details ▼'}
                  </span>
                )}
              </button>
              {expanded && (
                <div className="route-segment-detail">
                  {segment.summary && <p>{segment.summary}</p>}
                  {(startWaypoint || endWaypoint) && (
                    <dl className="route-segment-boundaries">
                      {startWaypoint && <div><dt>Start</dt><dd>{getWaypointLabel(startWaypoint)}</dd></div>}
                      {endWaypoint && <div><dt>End</dt><dd>{getWaypointLabel(endWaypoint)}</dd></div>}
                    </dl>
                  )}
                  <button type="button" className="secondary-button small-button route-segment-deselect" onClick={onDeselect}>Show full route</button>
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

export default RouteSections