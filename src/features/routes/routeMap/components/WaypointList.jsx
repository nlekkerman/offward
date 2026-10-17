import { Fragment, useState } from 'react'
import { getPlaceCoordinates, getWaypointDisplayName } from '../routeMapUtils.js'
import ContentVideoManager from '../../../video/ContentVideoManager.jsx'
import GalleryAttachmentManager from '../../../management/GalleryAttachmentManager.jsx'
import FoodRelationshipManager from '../../../management/FoodRelationshipManager.jsx'
import WaypointQuickEditor from './WaypointQuickEditor.jsx'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function WaypointCreatePlaceForm({ waypoint, saving, onCreate, onCancel }) {
  const [slug, setSlug] = useState('')
  const [name, setName] = useState(waypoint.name || '')
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!slug.trim()) {
      setFieldErrors({ slug: 'Slug is required.' })
      setError('')
      return
    }

    const result = await onCreate(waypoint.id, {
      slug: slug.trim(),
      ...(name.trim() ? { name: name.trim() } : {}),
    })

    if (result?.success) return
    setFieldErrors(result?.fieldErrors || {})
    setError(result?.error || 'Unable to create a Place from this Waypoint.')
  }

  return (
    <form className="waypoint-create-place-form" onSubmit={handleSubmit}>
      <div className="form-field">
        <label htmlFor={`create-place-slug-${waypoint.id}`}>Slug *</label>
        <input
          id={`create-place-slug-${waypoint.id}`}
          name="slug"
          value={slug}
          onChange={(event) => {
            setSlug(event.target.value)
            setFieldErrors((current) => ({ ...current, slug: '' }))
          }}
          className={fieldErrors.slug ? 'form-input field-error' : 'form-input'}
          required
        />
        {fieldErrors.slug && <span className="field-error-text">{fieldErrors.slug}</span>}
      </div>
      <div className="form-field">
        <label htmlFor={`create-place-name-${waypoint.id}`}>Name</label>
        <input
          id={`create-place-name-${waypoint.id}`}
          name="name"
          value={name}
          onChange={(event) => {
            setName(event.target.value)
            setFieldErrors((current) => ({ ...current, name: '' }))
          }}
          className={fieldErrors.name ? 'form-input field-error' : 'form-input'}
        />
        {fieldErrors.name && <span className="field-error-text">{fieldErrors.name}</span>}
      </div>
      {error && <div className="management-error" role="alert">{error}</div>}
      <div className="waypoint-quick-actions">
        <button type="submit" className="primary-button small-button" disabled={saving}>
          {saving ? 'Creating...' : 'Create Place'}
        </button>
        <button type="button" className="secondary-button small-button" onClick={onCancel} disabled={saving}>Cancel</button>
      </div>
    </form>
  )
}

function WaypointList({ waypoints, places, routeId, selectedWaypointId, mediaWaypointId, foodWaypointId, quickEditWaypointId, quickEditSaving, addMode, selectedPlaceId, onPlaceIdChange, onAddBlank, onAddModeChange, onAddFromPlace, onSelect, onQuickSave, onQuickCancel, onOpenAdvanced, onOpenMedia, onOpenFood, onFoodIdsChange, onMediaChange, onGalleryAttach, onGalleryDetach, onMove, onRemove, onCreatePlace }) {
  const [createPlaceWaypointId, setCreatePlaceWaypointId] = useState('')
  const [createPlaceSaving, setCreatePlaceSaving] = useState(false)

  const createPlace = async (waypointId, payload) => {
    setCreatePlaceSaving(true)
    try {
      const result = await onCreatePlace(waypointId, payload)
      if (result?.success) setCreatePlaceWaypointId('')
      return result
    } finally {
      setCreatePlaceSaving(false)
    }
  }

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
            const canCreatePlace = UUID.test(String(waypoint.id)) && !waypoint.place_id
            const canAttachFood = UUID.test(String(waypoint.id))
            const mediaCount = Array.isArray(waypoint.media_ids) ? waypoint.media_ids.length : 0
            const foodCount = Array.isArray(waypoint.food_ids) ? waypoint.food_ids.length : 0
            const isMediaOpen = mediaWaypointId === waypoint.id
            const isFoodOpen = foodWaypointId === waypoint.id
            const mediaPanelId = `waypoint-media-${waypoint.id}`
            const foodPanelId = `waypoint-food-${waypoint.id}`

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
                    {canCreatePlace && (
                      <button
                        type="button"
                        className={createPlaceWaypointId === waypoint.id ? 'primary-button small-button' : 'secondary-button small-button'}
                        onClick={() => setCreatePlaceWaypointId((current) => current === waypoint.id ? '' : waypoint.id)}
                        aria-expanded={createPlaceWaypointId === waypoint.id}
                        aria-controls={`create-place-${waypoint.id}`}
                      >
                        Create Place
                      </button>
                    )}
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
                    {canAttachFood && (
                      <button
                        type="button"
                        className={isFoodOpen ? 'primary-button small-button' : 'secondary-button small-button'}
                        onClick={() => onOpenFood(waypoint.id)}
                        aria-expanded={isFoodOpen}
                        aria-controls={foodPanelId}
                      >
                        {foodCount ? `Food ${foodCount}` : '+ Food'}
                      </button>
                    )}
                    <button type="button" className="secondary-button small-button" onClick={() => onMove(index, -1)} disabled={index === 0}>Up</button>
                    <button type="button" className="secondary-button small-button" onClick={() => onMove(index, 1)} disabled={index === waypoints.length - 1}>Down</button>
                    <button type="button" className="danger-button small-button" onClick={() => onRemove(waypoint.id)}>Remove</button>
                  </span>
                  {!isSaved && <span className="route-map-muted">Save waypoint before adding media.</span>}
                  {!canAttachFood && <span className="route-map-muted">Save waypoint before adding Food.</span>}
                  {quickEditWaypointId === waypoint.id && (
                    <WaypointQuickEditor
                      waypoint={waypoint}
                      saving={quickEditSaving}
                      onSave={(name) => onQuickSave(waypoint.id, name)}
                      onCancel={onQuickCancel}
                    />
                  )}
                  {createPlaceWaypointId === waypoint.id && canCreatePlace && (
                    <div id={`create-place-${waypoint.id}`}>
                      <WaypointCreatePlaceForm
                        waypoint={waypoint}
                        saving={createPlaceSaving}
                        onCreate={createPlace}
                        onCancel={() => setCreatePlaceWaypointId('')}
                      />
                    </div>
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
                    <GalleryAttachmentManager
                      ownerType="RouteWaypoint"
                      ownerId={waypoint.id}
                      attachedCollectionIds={waypoint.image_collection_ids || []}
                      onAttach={(collection) => onGalleryAttach(waypoint.id, collection)}
                      onDetach={(collection) => onGalleryDetach(waypoint.id, collection)}
                      persistImmediately
                    />
                  </section>
                )}
                {isFoodOpen && canAttachFood && (
                  <section id={foodPanelId} className="waypoint-media-panel" aria-label={`Food for Waypoint ${index + 1}`}>
                    <FoodRelationshipManager
                      ownerId={waypoint.id}
                      field="waypoint_ids"
                      attachedIds={waypoint.food_ids || []}
                      onAttachedIdsChange={(nextIds) => onFoodIdsChange(waypoint.id, nextIds)}
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
