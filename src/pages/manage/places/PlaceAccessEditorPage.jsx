import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { managementApis } from '../../../services/management/index.js'
import { placeAccessApi } from '../../../services/management/placeAccessApi.js'
import { isValidLatitude, isValidLongitude } from '../../../features/map/mapGeometry.js'
import { buildManualSegmentGeometry, normalizeGeometry } from '../../../features/routes/routeMap/routeMapUtils.js'
import PlaceAccessAuthoringMap from './PlaceAccessAuthoringMap.jsx'

function validCoordinates(latitude, longitude) {
  return isValidLatitude(latitude) && isValidLongitude(longitude)
}

function getAccessErrorMessage(error, operation = 'change') {
  const status = error?.response?.status
  const data = error?.response?.data
  const action = operation === 'load' ? 'loading' : 'changing'
  const responseCode = data?.code || data?.error || data?.detail_code || (typeof data?.detail === 'string' ? data.detail : '')
  const code = typeof responseCode === 'string' ? responseCode : ''

  if (status === 401) return 'Your management session has expired. Sign in again to access Place directions.'
  if (status === 403) return 'You do not have permission to access Place directions.'
  if (status === 409 && code === 'access_revision_mismatch') return 'Place access changed elsewhere. Reload the current access state before making another change.'
  if (status === 409 && code === 'place_access_start_missing') return 'Set a directions marker before saving a walking path.'
  if (status === 409) return 'Place access changed elsewhere. Reload the current access state before making another change.'
  if (status === 400 && code === 'access_endpoint_too_far') return 'The walking path endpoints are more than 100 metres from the saved directions marker or Place.'
  if (status === 400 && typeof code === 'string' && code.startsWith('geojson_')) {
    return data?.detail || `The walking path geometry is invalid (${code}). Review the candidate and try again.`
  }

  if (status === 400 && data && typeof data === 'object') {
    const collectDetails = (value, field = '') => {
      if (typeof value === 'string') return [`${field.startsWith('geojson_') ? 'Geometry' : field || 'Request'}: ${value}`]
      if (Array.isArray(value)) return value.flatMap((item) => collectDetails(item, field))
      if (!value || typeof value !== 'object') return []
      return Object.entries(value).flatMap(([key, item]) => collectDetails(item, field ? `${field}.${key}` : key))
    }
    const details = collectDetails(data)
    if (details.length) return details.join(' ')
  }

  if (!error?.response && (error?.request || ['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT'].includes(error?.code))) {
    return `A network error prevented ${action} Place access. Check your connection and try again.`
  }
  if (!error?.response && error?.message) return error.message
  return data?.detail || data?.message || error?.message || `Unable to ${operation} Place access.`
}

function getPlaceAccessLoadErrorMessage(error, requestStage) {
  const status = error?.response?.status

  if (requestStage === 'access' && (status === 404 || status === 405)) {
    return `The Place access endpoint returned HTTP ${status}. The deployed backend appears not to provide the required Place access GET endpoint yet.`
  }

  if (requestStage === 'access' && !error?.response && error?.message) {
    return `Unable to load Place access state: ${error.message}`
  }

  return getAccessErrorMessage(error, 'load')
}

function getPlaceAccessState(place, accessState = place) {
  if (accessState?.access_revision === null || accessState?.access_revision === undefined || accessState?.access_revision === '') {
    throw new Error('The Place access response does not include a valid access_revision.')
  }
  const revision = Number(accessState?.access_revision)
  if (!Number.isSafeInteger(revision) || revision < 0) {
    throw new Error('The Place access response does not include a valid access_revision.')
  }
  const accessGeometry = normalizeGeometry(accessState.access_geometry)
  if (accessState.access_geometry != null && !accessGeometry) {
    throw new Error('The Place access response contains invalid access_geometry.')
  }
  return {
    id: place.id,
    name: place.name || place.title || 'Place',
    latitude: place.latitude,
    longitude: place.longitude,
    access_start_latitude: accessState.access_start_latitude ?? null,
    access_start_longitude: accessState.access_start_longitude ?? null,
    access_geometry: accessGeometry,
    access_revision: revision,
  }
}

function PlaceAccessEditorPage() {
  const { placeId } = useParams()
  const [place, setPlace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [pickingStart, setPickingStart] = useState(false)
  const [drawingPoints, setDrawingPoints] = useState(null)
  const [candidateGeometry, setCandidateGeometry] = useState(null)
  const [revisionConflict, setRevisionConflict] = useState(false)

  const applyPlaceResponse = useCallback((placeResponse, accessResponse = placeResponse) => {
    setPlace(getPlaceAccessState(placeResponse, accessResponse))
    setError('')
    setNotice('')
    setRevisionConflict(false)
    setCandidateGeometry(null)
    setDrawingPoints(null)
    setPickingStart(false)
  }, [])

  const loadPlace = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    let requestStage = 'place'
    try {
      const placeResponse = await managementApis.places.getById(placeId)
      if (!placeResponse?.id || String(placeResponse.id) !== String(placeId)) {
        throw new Error('The Place details response did not match the requested Place.')
      }
      requestStage = 'access'
      const accessResponse = await placeAccessApi.get(placeResponse.id)
      applyPlaceResponse(placeResponse, accessResponse)
    } catch (loadErr) {
      setLoadError(getPlaceAccessLoadErrorMessage(loadErr, requestStage))
    } finally {
      setLoading(false)
    }
  }, [applyPlaceResponse, placeId])

  useEffect(() => {
    loadPlace()
  }, [loadPlace])

  const actualPlaceValid = validCoordinates(place?.latitude, place?.longitude)
  const startValid = validCoordinates(place?.access_start_latitude, place?.access_start_longitude)
  const hasStartCoordinates = [
    place?.access_start_latitude,
    place?.access_start_longitude,
  ].some((coordinate) => coordinate !== null && coordinate !== undefined && coordinate !== '')
  const hasAcceptedGeometry = Boolean(normalizeGeometry(place?.access_geometry))
  const currentRevision = place?.access_revision
  const actualCoordinates = useMemo(() => actualPlaceValid ? {
    latitude: Number(place.latitude),
    longitude: Number(place.longitude),
  } : null, [actualPlaceValid, place?.latitude, place?.longitude])
  const startCoordinates = useMemo(() => startValid ? {
    latitude: Number(place.access_start_latitude),
    longitude: Number(place.access_start_longitude),
  } : null, [place?.access_start_latitude, place?.access_start_longitude, startValid])
  const placeForMap = useMemo(() => actualCoordinates ? {
    ...place,
    latitude: actualCoordinates.latitude,
    longitude: actualCoordinates.longitude,
  } : place, [actualCoordinates, place])

  const runMutation = async (payload, successMessage) => {
    if (!place?.id || !Number.isSafeInteger(currentRevision) || currentRevision < 0) {
      setError('A saved Place and current access revision are required before making changes.')
      return
    }
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const result = await placeAccessApi.update(place.id, {
        ...payload,
        expected_access_revision: currentRevision,
      })
      applyPlaceResponse(place, result)
      setNotice(successMessage)
    } catch (mutationError) {
      setRevisionConflict(mutationError?.response?.status === 409)
      setError(getAccessErrorMessage(mutationError))
    } finally {
      setSaving(false)
    }
  }

  const handleStartMarkerClick = (coordinates) => {
    setPickingStart(false)
    setDrawingPoints(null)
    setCandidateGeometry(null)
    runMutation({
      action: 'set_start',
      access_start_latitude: coordinates.latitude,
      access_start_longitude: coordinates.longitude,
    }, 'Directions marker saved. Any previous walking path was invalidated.')
  }

  const startMarkerPlacement = () => {
    if (hasAcceptedGeometry && !window.confirm('Moving the directions marker clears the accepted walking path. Continue?')) return
    setError('')
    setNotice('')
    setCandidateGeometry(null)
    setDrawingPoints(null)
    setPickingStart(true)
  }

  const beginDrawing = () => {
    if (!startCoordinates || !actualCoordinates) {
      setError('A valid directions marker and actual Place location are required before drawing.')
      return
    }
    setCandidateGeometry(null)
    setDrawingPoints([])
    setError('')
    setNotice('Click the map to add intermediate walking points, then preview the candidate.')
  }

  const previewCandidate = () => {
    if (!Array.isArray(drawingPoints) || !startCoordinates || !actualCoordinates) return
    const geometry = buildManualSegmentGeometry(
      { latitude: startCoordinates.latitude, longitude: startCoordinates.longitude },
      { latitude: actualCoordinates.latitude, longitude: actualCoordinates.longitude },
      drawingPoints,
    )
    if (!normalizeGeometry(geometry)) {
      setError('Unable to create the walking path preview. Check the Place and directions marker coordinates.')
      return
    }
    setCandidateGeometry(geometry)
    setDrawingPoints(null)
    setError('')
    setNotice('Candidate walking path preview is ready. Accept it to save, or cancel to keep the accepted path unchanged.')
  }

  const acceptCandidate = () => {
    if (!candidateGeometry) return
    if (hasAcceptedGeometry && !window.confirm('Accepting this candidate replaces the currently accepted walking path. Continue?')) return
    runMutation({ action: 'save_manual', geometry: candidateGeometry }, 'Walking path accepted.')
  }

  const clearWalkingPath = () => {
    if (!hasAcceptedGeometry || !window.confirm('Clear the accepted walking path? The directions marker will remain.')) return
    runMutation({ action: 'clear' }, 'Walking path cleared. The directions marker remains set.')
  }

  const removeDirectionsMarker = () => {
    if (!startValid || !window.confirm('Remove the directions marker and its accepted walking path?')) return
    runMutation({ action: 'clear_start' }, 'Directions marker and walking path removed.')
  }

  const cancelPreview = () => {
    setCandidateGeometry(null)
    setDrawingPoints(null)
    setError('')
    setNotice('Drawing cancelled. The accepted walking path is unchanged.')
  }

  if (loading) {
    return <section className="management-page"><h1>Place access directions</h1><div className="management-empty">Loading Place...</div></section>
  }

  if (loadError || !place) {
    return (
      <section className="management-page">
        <h1>Place access directions</h1>
        <div className="management-error" role="alert">{loadError || 'Place not found.'}</div>
        <div className="route-map-header-actions">
          <Link to={`/manage/places/${placeId}/edit`} className="secondary-button">Back to Place</Link>
          <button type="button" className="secondary-button" onClick={loadPlace}>Retry loading</button>
        </div>
      </section>
    )
  }

  return (
    <section className="management-page route-map-editor-page place-access-editor-page">
      <div className="management-page-header route-map-editor-header">
        <div>
          <p className="eyebrow">Management / Places</p>
          <h1>Access directions: {place.name}</h1>
        </div>
        <div className="route-map-header-actions">
          <Link to={`/manage/places/${placeId}/edit`} className="secondary-button">Back to Place details</Link>
          <Link to="/manage" className="secondary-button">Management</Link>
        </div>
      </div>

      {error && <div className="management-error" role="alert">{error}</div>}
      {revisionConflict && (
        <div className="management-empty route-map-notice" role="alert">
          Reload current Place access state before continuing.
          <button type="button" className="secondary-button small-button" onClick={loadPlace} disabled={loading || saving}>Reload access state</button>
        </div>
      )}
      {notice && <div className="management-empty route-map-notice" role="status">{notice}</div>}

      {!actualPlaceValid && (
        <div className="management-error" role="alert">
          This Place has invalid coordinates. Update its actual location in Place details before authoring access directions.
        </div>
      )}
      {hasStartCoordinates && !startValid && (
        <div className="management-error" role="alert">
          The saved directions marker has invalid coordinates. Set a new directions marker to continue.
        </div>
      )}

      <section className="route-map-editor-panel place-access-controls" aria-label="Place access actions">
        <div className="route-map-panel-header">
          <div>
            <p className="eyebrow">Access directions</p>
            <p>Place marker: {actualCoordinates ? `${actualCoordinates.latitude}, ${actualCoordinates.longitude}` : 'Invalid coordinates'}</p>
            <p>Directions marker: {startCoordinates ? `${startCoordinates.latitude}, ${startCoordinates.longitude}` : hasStartCoordinates ? 'Invalid coordinates' : 'Not set'}</p>
            <p>Access revision: {currentRevision}</p>
          </div>
          <div className="route-map-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                if (pickingStart) {
                  setPickingStart(false)
                  setNotice('Directions marker placement cancelled.')
                } else {
                  startMarkerPlacement()
                }
              }}
              disabled={saving || !actualPlaceValid}
            >
              {pickingStart ? 'Cancel marker placement' : 'Set directions marker'}
            </button>
            {startValid && !drawingPoints && !candidateGeometry && (
              <button type="button" className="primary-button" onClick={beginDrawing} disabled={saving || !actualPlaceValid}>Draw walking path</button>
            )}
            {startValid && (
              <>
                <button type="button" className="secondary-button" onClick={clearWalkingPath} disabled={saving || !hasAcceptedGeometry}>Clear walking path</button>
                <button type="button" className="secondary-button" onClick={removeDirectionsMarker} disabled={saving}>Remove directions marker</button>
              </>
            )}
          </div>
        </div>
        {pickingStart && <p className="place-access-instruction" role="status">Click the map where driving should end. This does not change the actual Place location.</p>}
        {drawingPoints && (
          <div className="place-access-drawing-actions" role="group" aria-label="Manual walking path tools">
            <p>Click anywhere on the map to add walking-path points. The path starts at the directions marker and ends at the Place marker.</p>
            <button type="button" className="secondary-button small-button" onClick={() => setDrawingPoints((points) => points.slice(0, -1))} disabled={!drawingPoints.length || saving}>Undo last point</button>
            <button type="button" className="primary-button small-button" onClick={previewCandidate} disabled={saving}>Preview candidate</button>
            <button type="button" className="secondary-button small-button" onClick={cancelPreview} disabled={saving}>Cancel drawing</button>
          </div>
        )}
        {candidateGeometry && (
          <div className="place-access-drawing-actions" role="group" aria-label="Candidate walking path actions">
            <p>Candidate preview — the accepted walking path remains unchanged until accepted.</p>
            <button type="button" className="primary-button small-button" onClick={acceptCandidate} disabled={saving}>{saving ? 'Saving...' : 'Accept Candidate'}</button>
            <button type="button" className="secondary-button small-button" onClick={cancelPreview} disabled={saving}>Cancel candidate</button>
          </div>
        )}
      </section>

      <div className="route-map-main-column">
        {actualPlaceValid ? (
          <PlaceAccessAuthoringMap
            place={placeForMap}
            start={startCoordinates}
            acceptedGeometry={place.access_geometry}
            candidateGeometry={candidateGeometry}
            drawingPoints={drawingPoints || []}
            pickingStart={pickingStart && !saving}
            drawing={Boolean(drawingPoints) && !saving}
            onStartClick={handleStartMarkerClick}
            onDrawPoint={(point) => setDrawingPoints((current) => Array.isArray(current) ? [...current, point] : current)}
          />
        ) : null}
        <div className="place-access-legend" aria-label="Map key">
          <span><i className="place-access-legend-place" /> Actual Place</span>
          <span><i className="place-access-legend-start" /> Directions marker</span>
          <span><i className="place-access-legend-accepted" /> Accepted walking path</span>
          <span><i className="place-access-legend-candidate" /> Candidate preview</span>
        </div>
      </div>
    </section>
  )
}

export default PlaceAccessEditorPage
