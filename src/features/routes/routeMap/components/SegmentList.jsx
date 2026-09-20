import { getWaypointDisplayName } from '../routeMapUtils.js'

function getWaypointLabel(waypoint) {
  return waypoint ? getWaypointDisplayName(waypoint) : 'Waypoint'
}

function SegmentList({ segments, waypoints, selectedSegmentId, canAdd, onAdd, onSelect, onMove, onRemove }) {
  return (
    <section className="route-map-panel">
      <div className="route-map-panel-header">
        <div>
          <p className="eyebrow">Segments</p>
          <h2>Route sections</h2>
        </div>
        <button type="button" className="secondary-button small-button" onClick={onAdd} disabled={!canAdd}>Add segment</button>
      </div>
      {!canAdd && <p className="route-map-muted">Save at least two valid Waypoints and an accepted Route before adding a Segment.</p>}
      {!segments.length ? (
        <div className="management-empty route-map-empty">No Segments yet.</div>
      ) : (
        <div className="waypoint-list">
          {segments.map((segment, index) => {
            const start = waypoints.find((waypoint) => waypoint.id === segment.start_waypoint_id)
            const end = waypoints.find((waypoint) => waypoint.id === segment.end_waypoint_id)
            return (
              <div key={segment.id} className={segment.id === selectedSegmentId ? 'waypoint-list-item is-selected' : 'waypoint-list-item'}>
                <button type="button" className="waypoint-select-button" onClick={() => onSelect(segment.id)}>
                  <span className="waypoint-order">{segment.order}</span>
                  <span className="waypoint-list-copy">
                    <strong>{segment.title || `Segment ${segment.order}`}</strong>
                    <span>{getWaypointLabel(start)} to {getWaypointLabel(end)}</span>
                    {segment.needs_review && <span className="segment-review-badge">Needs geometry review</span>}
                  </span>
                </button>
                <span className="waypoint-inline-actions">
                  <button type="button" className="secondary-button small-button" onClick={() => onMove(index, -1)} disabled={index === 0}>Up</button>
                  <button type="button" className="secondary-button small-button" onClick={() => onMove(index, 1)} disabled={index === segments.length - 1}>Down</button>
                  <button type="button" className="danger-button small-button" onClick={() => onRemove(segment.id)}>Remove</button>
                </span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default SegmentList
