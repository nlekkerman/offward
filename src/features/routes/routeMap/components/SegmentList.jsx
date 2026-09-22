import { getWaypointDisplayName } from '../routeMapUtils.js'

function getWaypointLabel(waypoint) {
  return waypoint ? `${waypoint.order} · ${getWaypointDisplayName(waypoint)}` : 'Waypoint'
}

function SegmentList({ pairs, waypoints, selectedPairKey, onSelect }) {
  return (
    <section className="route-map-panel">
      <div className="route-map-panel-header">
        <div>
          <p className="eyebrow">Candidate sections</p>
          <h2>{pairs.length} waypoint pairs</h2>
        </div>
      </div>
      {!pairs.length ? (
        <div className="management-empty route-map-empty">Save at least two Waypoints to create candidate sections.</div>
      ) : (
        <div className="waypoint-list">
          {pairs.map((pair) => {
            const start = waypoints.find((waypoint) => waypoint.id === pair.start_waypoint_id)
            const end = waypoints.find((waypoint) => waypoint.id === pair.end_waypoint_id)
            return (
              <div key={pair.key} className={pair.key === selectedPairKey ? 'waypoint-list-item is-selected' : 'waypoint-list-item'}>
                <button type="button" className="waypoint-select-button" onClick={() => onSelect(pair.key)}>
                  <span className="waypoint-order">{pair.order}</span>
                  <span className="waypoint-list-copy">
                    <strong>{getWaypointLabel(start)} to {getWaypointLabel(end)}</strong>
                  </span>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default SegmentList
