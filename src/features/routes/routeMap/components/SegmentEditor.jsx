import ContentVideoManager from '../../../video/ContentVideoManager.jsx'

function getWaypointLabel(waypoint) {
  if (!waypoint) return 'Select a saved Waypoint'
  return `${waypoint.order} · ${waypoint.type === 'start' ? 'Start' : waypoint.type === 'finish' ? 'Finish' : 'Via'} · ${waypoint.label || `${waypoint.latitude}, ${waypoint.longitude}`}`
}

function SegmentEditor({ segment, routeId, waypoints, validation, canRegenerate, onChange, onRegenerate, onSave, saving = false }) {
  if (!segment) {
    return (
      <section className="route-map-panel">
        <p className="eyebrow">Segment editor</p>
        <div className="management-empty route-map-empty">Select or add a Segment to edit its details.</div>
      </section>
    )
  }

  const isNewSegment = String(segment.id).startsWith('new-')
  const update = (name, value) => onChange({ ...segment, [name]: value })
  const startWaypoint = waypoints.find((waypoint) => waypoint.id === segment.start_waypoint_id)
  const endWaypoint = waypoints.find((waypoint) => waypoint.id === segment.end_waypoint_id)

  return (
    <section className="route-map-panel">
      <div className="route-map-panel-header">
        <div>
          <p className="eyebrow">Segment editor</p>
          <h2>{isNewSegment ? 'New Segment' : `Editing Segment ${segment.order}`}</h2>
        </div>
        {segment.needs_review && <span className="segment-review-badge">Needs geometry review</span>}
      </div>
      {segment.needs_review && <p className="route-map-muted">Accepted Route geometry changed after this Segment geometry was saved.</p>}
      <div className="route-map-form-grid">
        <div className="form-field route-map-wide-field">
          <label htmlFor="segment-title">Title</label>
          <input id="segment-title" value={segment.title} onChange={(event) => update('title', event.target.value)} className="form-input" />
        </div>
        <div className="form-field route-map-wide-field">
          <label htmlFor="segment-summary">Summary</label>
          <textarea id="segment-summary" value={segment.summary} onChange={(event) => update('summary', event.target.value)} className="form-input" rows="3" />
        </div>
        <div className="form-field">
          <label htmlFor="segment-start">Start Waypoint</label>
          <select id="segment-start" value={segment.start_waypoint_id} onChange={(event) => update('start_waypoint_id', event.target.value)} className="form-input">
            <option value="">Select start</option>
            {waypoints.map((waypoint) => <option key={waypoint.id} value={waypoint.id}>{getWaypointLabel(waypoint)}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="segment-end">End Waypoint</label>
          <select id="segment-end" value={segment.end_waypoint_id} onChange={(event) => update('end_waypoint_id', event.target.value)} className="form-input">
            <option value="">Select end</option>
            {waypoints.map((waypoint) => <option key={waypoint.id} value={waypoint.id}>{getWaypointLabel(waypoint)}</option>)}
          </select>
        </div>
      </div>
      {!validation.valid && <p className="field-error-text segment-validation-message">{validation.message}</p>}
      <div className="segment-editor-actions">
        <button type="button" className="secondary-button small-button" onClick={onRegenerate} disabled={!canRegenerate}>Regenerate geometry from accepted Route</button>
      </div>
      {startWaypoint && endWaypoint && validation.valid && <p className="route-map-muted">Geometry follows the accepted Route between the selected boundaries.</p>}
      <div className="route-map-edit-actions">
        <button type="button" className="secondary-button small-button" onClick={() => onChange({ ...segment, id: segment.id })}>Cancel</button>
        <button type="button" className="primary-button small-button" onClick={onSave} disabled={saving}>
          {saving ? (isNewSegment ? 'Adding Segment...' : 'Saving Segment...') : isNewSegment ? 'Add Segment' : 'Save Segment'}
        </button>
      </div>
      <ContentVideoManager
        resourceKey="segment"
        resourceId={segment.id}
        routeId={routeId}
        segmentId={segment.id}
        attachedVideoIds={segment.media_ids || []}
        onAttachmentsChange={(nextIds) => onChange({ ...segment, media_ids: nextIds })}
      />
    </section>
  )
}

export default SegmentEditor
