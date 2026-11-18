import { SEGMENT_ACTIVITY_TYPES } from '../routeMapUtils.js'

function getConnectionState(segment) {
  if (!segment.geometry) return 'Unresolved'
  if (segment.mode === 'manual') return 'Resolved manually'
  if (segment.mode === 'straight') return 'Resolved straight'
  return 'Resolved calculated'
}

function formatActivityOption(value) {
  return value.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function getConnectionMode(segment) {
  return segment.mode || (segment.geometry ? 'calculated' : 'unresolved')
}

function formatPreviewMetrics(preview) {
  const distance = preview.distance_meters
  const duration = preview.duration_seconds
  const metrics = []
  if (distance !== null && distance !== undefined && Number.isFinite(Number(distance))) {
    metrics.push(`${(Number(distance) / 1000).toFixed(1)} km`)
  }
  if (duration !== null && duration !== undefined && Number.isFinite(Number(duration))) {
    metrics.push(`${Math.round(Number(duration) / 60)} min`)
  }
  return metrics.length ? ` · ${metrics.join(' · ')}` : ''
}

function SegmentList({
  connections,
  routeComplete,
  selectedConnectionId,
  profile,
  editingDisabled,
  calculating,
  saving,
  drawing,
  preview,
  waypointMovePreview,
  onSelect,
  onProfileChange,
  onActivityChange,
  onCalculate,
  onStartManual,
  onUndoManualPoint,
  onFinishManual,
  onCancelManual,
  onStraight,
  onAcceptPreview,
  onCancelPreview,
  onRecalculate,
  onSaveWaypointMove,
  onCancelWaypointMove,
}) {
  const selected = connections.find((connection) => connection.id === selectedConnectionId)
  const startOrder = selected?.start?.order
  const endOrder = selected?.end?.order
  // Review status is tracked separately from the renderability-based completion badge.
  const reviewCount = connections.filter((connection) => connection.segment.needs_review === true).length

  return (
    <section className="route-map-panel route-connection-editor" aria-label="Connection editor">
      <div className="route-map-panel-header">
        <div>
          <p className="eyebrow">Connections</p>
          <h2>{connections.length ? `${connections.length} waypoint connections` : 'No connections yet'}</h2>
        </div>
        <div className="route-connection-badges">
          {reviewCount > 0 && (
            <span className="route-review-flag">{reviewCount === 1 ? '1 needs review' : `${reviewCount} need review`}</span>
          )}
          <span className={routeComplete ? 'route-completion-state is-complete' : 'route-completion-state'}>
            {routeComplete ? 'Complete' : 'Incomplete'}
          </span>
        </div>
      </div>

      {connections.length > 0 && (
        <div className="route-connection-list" role="listbox" aria-label="Select a waypoint connection">
          {connections.map((connection) => {
            const label = `Waypoint ${connection.start.order} → Waypoint ${connection.end.order}`
            return (
              <button
                key={connection.id}
                type="button"
                role="option"
                aria-selected={connection.id === selectedConnectionId}
                className={connection.id === selectedConnectionId ? 'route-connection-option is-selected' : 'route-connection-option'}
                onClick={() => onSelect(connection.id)}
              >
                <span>{label}</span>
                <small>{getConnectionState(connection.segment)}</small>
                {connection.segment.needs_review === true && <small className="route-review-flag">Needs review</small>}
              </button>
            )
          })}
        </div>
      )}

      {selected && (
        <div className="route-connection-controls">
          <div className="route-connection-summary">
            <strong>Waypoint {startOrder} → Waypoint {endOrder}</strong>
            <span>
              {getConnectionState(selected.segment)} · {getConnectionMode(selected.segment)}
              {selected.segment.activity_type ? ` · ${formatActivityOption(selected.segment.activity_type)}` : ''}
            </span>
            {selected.segment.needs_review === true && <span className="route-review-flag">Needs review</span>}
          </div>
          {selected.segment.needs_review === true && !preview && !drawing && (
            <span className="route-map-muted">
              The accepted Route geometry changed after this connection was saved. To approve it, re-save its path: Calculate then Accept, or save a manual or straight path.
            </span>
          )}
          {!preview && !drawing && (
            <div className="route-connection-actions">
              <label className="route-connection-profile">
                <span>Activity</span>
                <select
                  value={selected.segment.activity_type || ''}
                  onChange={(event) => onActivityChange(event.target.value)}
                  disabled={editingDisabled || calculating || saving}
                  aria-label="Segment activity"
                >
                  <option value="">Not specified</option>
                  {SEGMENT_ACTIVITY_TYPES.map((value) => <option key={value} value={value}>{formatActivityOption(value)}</option>)}
                </select>
              </label>
              <span className="route-map-muted">Semantic activity shown publicly; independent from the routing profile below.</span>
            </div>
          )}
          {!preview && !drawing && (
            <div className="route-connection-actions">
              <label className="route-connection-profile">
                <span>Routing</span>
                <select value={profile} onChange={(event) => onProfileChange(event.target.value)} disabled={calculating || saving}>
                  <option value="walking">Walking</option>
                  <option value="driving">Driving</option>
                </select>
              </label>
              <button type="button" className="primary-button small-button" onClick={onCalculate} disabled={editingDisabled || calculating || saving}>
                {calculating ? 'Calculating…' : 'Calculate'}
              </button>
              <button type="button" className="secondary-button small-button" onClick={onStartManual} disabled={editingDisabled || calculating || saving}>Draw manually</button>
              <button type="button" className="secondary-button small-button" onClick={onStraight} disabled={editingDisabled || calculating || saving}>Straight</button>
            </div>
          )}
          {drawing && (
            <div className="segment-drawing-controls" role="group" aria-label="Manual connection drawing controls">
              <span className="route-map-muted">Tap or click the map to add points between the fixed endpoints.</span>
              <button type="button" className="secondary-button small-button" onClick={onUndoManualPoint} disabled={!drawing.points.length}>Undo</button>
              <button type="button" className="primary-button small-button" onClick={onFinishManual} disabled={saving}>Preview path</button>
              <button type="button" className="secondary-button small-button" onClick={onCancelManual}>Cancel</button>
            </div>
          )}
          {preview && (
            <div className="segment-drawing-controls" role="group" aria-label="Connection preview controls">
              <span className="route-map-muted">
                Preview: {preview.mode === 'calculated' ? 'calculated' : preview.mode === 'manual' ? 'manual drawing' : 'straight'}
                {formatPreviewMetrics(preview)}
              </span>
              <button type="button" className="primary-button small-button" onClick={onAcceptPreview} disabled={saving || (preview.mode === 'calculated' && !preview.candidateToken)}>
                {saving ? 'Saving…' : preview.mode === 'calculated' ? 'Accept' : 'Save'}
              </button>
              {preview.mode === 'calculated' && <button type="button" className="secondary-button small-button" onClick={onRecalculate} disabled={editingDisabled || calculating || saving}>Recalculate</button>}
              <button type="button" className="secondary-button small-button" onClick={onCancelPreview} disabled={saving}>Cancel</button>
            </div>
          )}
          {editingDisabled && !preview && !drawing && <span className="route-map-muted">Save waypoint edits and refresh the route revision before editing this connection.</span>}
        </div>
      )}
      {waypointMovePreview && (
        <div className="segment-drawing-controls" role="group" aria-label="Waypoint movement controls">
          <span className="route-map-muted">Only the connections before and after this waypoint will be invalidated. Other connection geometry is preserved.</span>
          <button type="button" className="primary-button small-button" onClick={onSaveWaypointMove} disabled={saving}>{saving ? 'Saving…' : 'Save waypoint'}</button>
          <button type="button" className="secondary-button small-button" onClick={onCancelWaypointMove} disabled={saving}>Cancel move</button>
        </div>
      )}
    </section>
  )
}

export default SegmentList
