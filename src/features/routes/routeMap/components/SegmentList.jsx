function SegmentList({ pairs, waypoints, selectedPairKey, canDrawManually, manualDrawing, onStartManualDrawing, onUndoManualPoint, onFinishManualDrawing, onCancelManualDrawing }) {
  return (
    <section className="route-map-panel candidate-section-controls">
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
            const drawingThisPair = manualDrawing?.pairKey === pair.key
            return (
              <div key={pair.key} className={pair.key === selectedPairKey ? 'waypoint-list-item is-selected' : 'waypoint-list-item'}>
                <div className="candidate-section-row">
                  <strong>{start?.order ?? pair.order} → {end?.order ?? pair.order + 1}</strong>
                  {!drawingThisPair && (
                    <button type="button" className="secondary-button small-button" onClick={() => onStartManualDrawing(pair.key)} disabled={!canDrawManually || Boolean(manualDrawing)}>
                      Draw manually
                    </button>
                  )}
                </div>
                {drawingThisPair && (
                  <div className="segment-drawing-controls" role="group" aria-label={`Editing ${start?.order ?? pair.order} to ${end?.order ?? pair.order + 1}`}>
                    <strong>Editing {start?.order ?? pair.order} → {end?.order ?? pair.order + 1}</strong>
                    <span className="route-map-muted">Click the map to add intermediate points. Start and end are fixed.</span>
                    <button type="button" className="secondary-button small-button" onClick={onUndoManualPoint} disabled={manualDrawing.points.length === 0}>Undo</button>
                    <button type="button" className="primary-button small-button" onClick={onFinishManualDrawing}>Finish</button>
                    <button type="button" className="secondary-button small-button" onClick={onCancelManualDrawing}>Cancel</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      {!canDrawManually && <p className="route-map-muted">Calculate a candidate route before drawing a section manually.</p>}
    </section>
  )
}

export default SegmentList
