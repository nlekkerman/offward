import { getWaypointDisplayName } from '../routeMapUtils.js'

function getWaypointLabel(waypoint) {
  return waypoint ? `${waypoint.order} · ${getWaypointDisplayName(waypoint)}` : 'Waypoint'
}

function SegmentEditor({ pair, waypoints, canDrawManually, drawingManually, manualPointCount, onStartManualDrawing, onUndoManualPoint, onFinishManualDrawing, onCancelManualDrawing }) {
  if (!pair) {
    return (
      <section className="route-map-panel">
        <p className="eyebrow">Candidate section</p>
        <div className="management-empty route-map-empty">Select a consecutive Waypoint pair.</div>
      </section>
    )
  }

  const startWaypoint = waypoints.find((waypoint) => waypoint.id === pair.start_waypoint_id)
  const endWaypoint = waypoints.find((waypoint) => waypoint.id === pair.end_waypoint_id)

  return (
    <section className="route-map-panel">
      <div className="route-map-panel-header">
        <div>
          <p className="eyebrow">Candidate section</p>
          <h2>{getWaypointLabel(startWaypoint)} to {getWaypointLabel(endWaypoint)}</h2>
        </div>
      </div>
      {!canDrawManually && !drawingManually && <p className="route-map-muted">Calculate a candidate route before drawing this section manually.</p>}
      <div className="segment-editor-actions">
        {!drawingManually && <button type="button" className="secondary-button small-button" onClick={onStartManualDrawing} disabled={!canDrawManually}>Draw manually</button>}
        {drawingManually && (
          <div className="segment-drawing-controls" role="group" aria-label="Manual candidate section drawing controls">
            <span className="route-map-muted">Click the map to add intermediate points. Start and end are fixed.</span>
            <button type="button" className="secondary-button small-button" onClick={onUndoManualPoint} disabled={manualPointCount === 0}>Undo last point</button>
            <button type="button" className="primary-button small-button" onClick={onFinishManualDrawing}>Finish</button>
            <button type="button" className="secondary-button small-button" onClick={onCancelManualDrawing}>Cancel</button>
          </div>
        )}
      </div>
    </section>
  )
}

export default SegmentEditor
