import { Fragment } from 'react'
import { getPlaceCoordinates, getWaypointDisplayName } from '../routeMapUtils.js'
import ContentVideoManager from '../../../video/ContentVideoManager.jsx'
import WaypointQuickEditor from './WaypointQuickEditor.jsx'

function WaypointList({ waypoints, places, routeId, selectedWaypointId, mediaWaypointId, quickEditWaypointId, quickEditSaving, addMode, selectedPlaceId, onPlaceIdChange, onAddBlank, onAddModeChange, onAddFromPlace, onSelect, onQuickSave, onQuickCancel, onOpenAdvanced, onOpenMedia, onMediaChange, onMove, onRemove }) {
  return (
    <section className="route-map-panel">
      <div className="route-map-panel-header">
        <div>
          <p className="eyebrow">Waypoints</p>
          <h2>Route order</h2>
        </div>
        <div className="waypoint-add-actions">
          <button type="button" className="secondary-button small-button" onClick={onAddBlank}>+ Blank</button>
          <button type="button" className={addMode ? 'primary-button small-button' : 'secondary-button small-button'} onClick={() => onAddModeChange(!addMode)} aria-pressed={addMode}>
            {addMode ? 'Map-click active' : '+ By map click'}
          </button>
        </div>
      </div>

      <div className="form-field waypoint-place-add-field">
        <label htmlFor="add-waypoint-place">Add Waypoint from Place</label>
        <div className="route-map-inline-select-row">
          <select id="add-waypoint-place" value={selectedPlaceId} onChange={(event) => onPlaceIdChange(event.target.value)} className="form-input">
            <option value="">Select Place with coordinates</option>
            {places.map((place) => {
              const hasCoordinates = Boolean(getPlaceCoordinates(place))
              return <option key={place.id} value={place.id} disabled={!hasCoordinates}>{place.name || place.title || place.slug || place.id}</option>
            })}
          </select>
          <button type="button" className="secondary-button small-button" onClick={() => onAddFromPlace(selectedPlaceId)} disabled={!selectedPlaceId}>Use Place</button>
        </div>
      </div>

      {!waypoints.length ? (
        <div className="management-empty route-map-empty">No waypoints yet.</div>
      ) : (
        <div className="waypoint-list">
          {waypoints.map((waypoint, index) => {
            const isSaved = !String(waypoint.id).startsWith('new-')
            const mediaCount = Array.isArray(waypoint.media_ids) ? waypoint.media_ids.length : 0
            const isMediaOpen = mediaWaypointId === waypoint.id
            const mediaPanelId = `waypoint-media-${waypoint.id}`

            return (
              <Fragment key={waypoint.id}>
                <div className={waypoint.id === selectedWaypointId ? 'waypoint-list-item is-selected' : 'waypoint-list-item'}>
                  <button type="button" className="waypoint-select-button" onClick={() => onSelect(waypoint.id)}>
                    <span className="waypoint-order">{index + 1}</span>
                    <span className="waypoint-list-copy">
                      <strong>{getWaypointDisplayName(waypoint)}</strong>
                      <span>{waypoint.type} · {waypoint.latitude || 'lat'} / {waypoint.longitude || 'lng'}</span>
                    </span>
                  </button>
                  <span className="waypoint-inline-actions">
                    <button type="button" className="secondary-button small-button" onClick={() => onOpenAdvanced(waypoint.id)}>Edit details</button>
                    {isSaved && (
                      <button
                        type="button"
                        className={isMediaOpen ? 'primary-button small-button' : 'secondary-button small-button'}
                        onClick={() => onOpenMedia(waypoint.id)}
                        aria-expanded={isMediaOpen}
                        aria-controls={mediaPanelId}
                      >
                        {mediaCount > 0 ? `Media ${mediaCount}` : '+ Media'}
                      </button>
                    )}
                    <button type="button" className="secondary-button small-button" onClick={() => onMove(index, -1)} disabled={index === 0}>Up</button>
                    <button type="button" className="secondary-button small-button" onClick={() => onMove(index, 1)} disabled={index === waypoints.length - 1}>Down</button>
                    <button type="button" className="danger-button small-button" onClick={() => onRemove(waypoint.id)}>Remove</button>
                  </span>
                  {!isSaved && <span className="route-map-muted">Save waypoint before adding media.</span>}
                  {quickEditWaypointId === waypoint.id && (
                    <WaypointQuickEditor
                      waypoint={waypoint}
                      saving={quickEditSaving}
                      onSave={(name) => onQuickSave(waypoint.id, name)}
                      onCancel={onQuickCancel}
                    />
                  )}
                </div>
                {isMediaOpen && (
                  <section id={mediaPanelId} className="waypoint-media-panel" aria-label={`Media for Waypoint ${index + 1}`}>
                    <h3>Waypoint {index + 1} — {getWaypointDisplayName(waypoint)}</h3>
                    <ContentVideoManager
                      resourceKey="waypoint"
                      resourceId={waypoint.id}
                      routeId={routeId}
                      waypointId={waypoint.id}
                      attachedVideoIds={waypoint.media_ids || []}
                      onAttachmentsChange={(nextIds) => onMediaChange(waypoint.id, nextIds)}
                    />
                  </section>
                )}
              </Fragment>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default WaypointList
