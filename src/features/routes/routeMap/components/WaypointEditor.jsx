import { INTERMEDIATE_WAYPOINT_TYPES, getPlaceCoordinates, getWaypointErrors } from '../routeMapUtils.js'
import ContentVideoManager from '../../../video/ContentVideoManager.jsx'

function WaypointEditor({ waypoint, places, routeId, onChange, onSave, onCancel }) {
  if (!waypoint) {
    return (
      <section className="route-map-panel">
        <p className="eyebrow">Waypoint editor</p>
        <div className="management-empty route-map-empty">Select or add a waypoint to edit its route-shaping details.</div>
      </section>
    )
  }

  const isNewWaypoint = String(waypoint.id).startsWith('new-')
  const fieldErrors = getWaypointErrors(waypoint)

  const handleChange = (event) => {
    const { name, value } = event.target
    if (name === 'place_id') {
      const place = places.find((item) => item.id === value)
      const coordinates = value ? getPlaceCoordinates(place) : null
      onChange({
        ...waypoint,
        place_id: value,
        place_name: place?.name || place?.title || '',
        label: value && !waypoint.label ? place?.name || place?.title || waypoint.label : waypoint.label,
        latitude: coordinates?.latitude ?? waypoint.latitude,
        longitude: coordinates?.longitude ?? waypoint.longitude,
      })
      return
    }
    onChange({ ...waypoint, [name]: value })
  }

  const typeLocked = waypoint.type === 'start' || waypoint.type === 'finish'

  return (
    <section className="route-map-panel">
      <div className="route-map-panel-header">
        <div>
          <p className="eyebrow">Waypoint editor</p>
          <h2>{isNewWaypoint ? 'New Waypoint' : `Editing Waypoint ${waypoint.order}`}</h2>
        </div>
      </div>

      <div className="route-map-form-grid">
        <div className="form-field route-map-wide-field">
          <label htmlFor="waypoint-name">Name</label>
          <input id="waypoint-name" name="name" value={waypoint.name} onChange={handleChange} className="form-input" />
        </div>

        <div className="form-field">
          <label htmlFor="waypoint-label">Label</label>
          <input id="waypoint-label" name="label" value={waypoint.label} onChange={handleChange} className="form-input" />
        </div>

        <div className="form-field">
          <label htmlFor="waypoint-type">Type</label>
          <select id="waypoint-type" name="type" value={waypoint.type} onChange={handleChange} className={fieldErrors.type ? 'form-input field-error' : 'form-input'} disabled={typeLocked}>
            {typeLocked ? <option value={waypoint.type}>{waypoint.type}</option> : INTERMEDIATE_WAYPOINT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          {fieldErrors.type && <span className="field-error-text">{fieldErrors.type}</span>}
        </div>

        <div className="form-field route-map-wide-field">
          <label htmlFor="waypoint-place">Linked Place</label>
          <select id="waypoint-place" name="place_id" value={waypoint.place_id || ''} onChange={handleChange} className="form-input">
            <option value="">No linked Place</option>
            {places.map((place) => (
              <option key={place.id} value={place.id}>{place.name || place.title || place.slug || place.id}</option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="waypoint-latitude">Latitude</label>
          <input id="waypoint-latitude" name="latitude" type="number" step="any" value={waypoint.latitude} onChange={handleChange} className={fieldErrors.latitude ? 'form-input field-error' : 'form-input'} />
          {fieldErrors.latitude && <span className="field-error-text">{fieldErrors.latitude}</span>}
        </div>

        <div className="form-field">
          <label htmlFor="waypoint-longitude">Longitude</label>
          <input id="waypoint-longitude" name="longitude" type="number" step="any" value={waypoint.longitude} onChange={handleChange} className={fieldErrors.longitude ? 'form-input field-error' : 'form-input'} />
          {fieldErrors.longitude && <span className="field-error-text">{fieldErrors.longitude}</span>}
        </div>
      </div>

      <div className="route-map-edit-actions">
        <button type="button" className="secondary-button small-button" onClick={onCancel}>Cancel</button>
        <button type="button" className="primary-button small-button" onClick={onSave} disabled={Boolean(fieldErrors.latitude || fieldErrors.longitude)}>
          {isNewWaypoint ? 'Add Waypoint' : 'Save Waypoint'}
        </button>
      </div>

      {isNewWaypoint ? (
        <p className="route-map-muted">Save this Waypoint before attaching videos.</p>
      ) : (
        <ContentVideoManager
          resourceKey="waypoint"
          resourceId={waypoint.id}
          routeId={routeId}
          waypointId={waypoint.id}
          attachedVideoIds={waypoint.media_ids || []}
          onAttachmentsChange={(nextIds) => onChange({ ...waypoint, media_ids: nextIds })}
        />
      )}
    </section>
  )
}

export default WaypointEditor
