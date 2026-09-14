import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import RouteAuthoringMap from '../../../features/map/components/RouteAuthoringMap.jsx'
import RouteCandidateSummary from '../../../features/routes/routeMap/components/RouteCandidateSummary.jsx'
import RouteGeometryLegend from '../../../features/routes/routeMap/components/RouteGeometryLegend.jsx'
import RouteMapActions from '../../../features/routes/routeMap/components/RouteMapActions.jsx'
import SegmentActions from '../../../features/routes/routeMap/components/SegmentActions.jsx'
import SegmentEditor from '../../../features/routes/routeMap/components/SegmentEditor.jsx'
import SegmentList from '../../../features/routes/routeMap/components/SegmentList.jsx'
import WaypointEditor from '../../../features/routes/routeMap/components/WaypointEditor.jsx'
import WaypointList from '../../../features/routes/routeMap/components/WaypointList.jsx'
import { buildWaypointPayload, createEmptySegment, createEmptyWaypoint, deriveSegmentGeometry, getPlaceCoordinates, normalizeGeometry, normalizeRouteMap, normalizeSegments, normalizeWaypoints, validateSegment, validateSegments, validateWaypoints } from '../../../features/routes/routeMap/routeMapUtils.js'
import { managementApis } from '../../../services/management/index.js'
import { routeMapApi } from '../../../services/management/routeMapApi.js'

function getErrorMessage(err, fallback) {
  const responseData = err?.response?.data
  if (Array.isArray(responseData?.errors)) {
    const messages = responseData.errors.map((item) => item?.message).filter(Boolean)
    if (messages.length) {
      return messages.join(' ')
    }
  }
  if (typeof responseData?.detail === 'string') {
    return responseData.detail
  }
  if (Array.isArray(responseData?.non_field_errors)) {
    return responseData.non_field_errors.join(' ')
  }
  if (typeof responseData?.code === 'string') {
    return responseData.code.replace(/_/g, ' ')
  }
  return fallback
}

function getRouteMapRevision(route, waypointMap) {
  return waypointMap?.mapRevision || route?.map_revision || route?.mapRevision || route?.revision || ''
}

function getRouteAcceptedGeometry(route, waypointMap) {
  return waypointMap?.acceptedGeometry || normalizeGeometry(route?.accepted_geometry || route?.acceptedGeometry || route?.geometry)
}

function getWaypointSignature(waypoints) {
  return JSON.stringify(buildWaypointPayload(waypoints))
}

function getSegmentSignature(segments) {
  return JSON.stringify(segments)
}

function RouteMapEditorPage() {
  const { routeId } = useParams()
  const navigate = useNavigate()
  const [route, setRoute] = useState(null)
  const [places, setPlaces] = useState([])
  const [waypoints, setWaypoints] = useState([])
  const [acceptedGeometry, setAcceptedGeometry] = useState(null)
  const [candidate, setCandidate] = useState(null)
  const [mapRevision, setMapRevision] = useState('')
  const [updatedAt, setUpdatedAt] = useState('')
  const [selectedWaypointId, setSelectedWaypointId] = useState('')
  const [savedWaypointSignature, setSavedWaypointSignature] = useState('[]')
  const [segments, setSegments] = useState([])
  const [persistedSegmentIds, setPersistedSegmentIds] = useState([])
  const [savedSegmentSignature, setSavedSegmentSignature] = useState('[]')
  const [selectedSegmentId, setSelectedSegmentId] = useState('')
  const [segmentsLoading, setSegmentsLoading] = useState(true)
  const [segmentsError, setSegmentsError] = useState('')
  const [segmentsSaving, setSegmentsSaving] = useState(false)
  const [addMode, setAddMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    let active = true

    async function loadSegments() {
      try {
        const loadedSegments = await routeMapApi.getSegments(routeId)
        if (!active) return
        setSegments(loadedSegments)
        setPersistedSegmentIds(loadedSegments.map((segment) => segment.id))
        setSavedSegmentSignature(getSegmentSignature(loadedSegments))
        setSelectedSegmentId(loadedSegments[0]?.id || '')
      } catch (segmentError) {
        if (active) {
          setSegmentsError(getErrorMessage(segmentError, 'Unable to load Route Segments.'))
        }
      } finally {
        if (active) setSegmentsLoading(false)
      }
    }

    async function load() {
      try {
        setLoading(true)
        setError('')
        const [routeData, routeMapData, placesData] = await Promise.all([
          managementApis.routes.getById(routeId),
          routeMapApi.getWaypoints(routeId),
          managementApis.places.list(),
        ])

        if (!active) return

        const normalizedMap = normalizeRouteMap(routeMapData)
        const nextWaypoints = normalizedMap.waypoints
        setRoute(routeData)
        setPlaces(placesData)
        setWaypoints(nextWaypoints)
        setSavedWaypointSignature(getWaypointSignature(nextWaypoints))
        setAcceptedGeometry(getRouteAcceptedGeometry(routeData, normalizedMap))
        setCandidate(normalizedMap.candidate)
        setMapRevision(getRouteMapRevision(routeData, normalizedMap))
        setUpdatedAt(normalizedMap.updatedAt)
        setSelectedWaypointId(nextWaypoints[0]?.id || '')

      } catch (err) {
        if (active) {
          setError(getErrorMessage(err, 'Unable to load this route map.'))
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadSegments()
    load()

    return () => {
      active = false
    }
  }, [routeId])

  const selectedWaypoint = useMemo(
    () => waypoints.find((waypoint) => waypoint.id === selectedWaypointId),
    [selectedWaypointId, waypoints],
  )

  const hasUnsavedChanges = savedWaypointSignature !== getWaypointSignature(waypoints)
  const hasUnsavedSegmentChanges = savedSegmentSignature !== getSegmentSignature(segments)
  const savedWaypoints = useMemo(() => waypoints.filter((waypoint) => !String(waypoint.id).startsWith('new-')), [waypoints])
  const waypointValidation = validateWaypoints(waypoints)
  const canCalculate = waypointValidation.valid && !hasUnsavedChanges
  const canAccept = Boolean(candidate?.geometry && mapRevision && !hasUnsavedChanges)
  const selectedSegment = useMemo(() => segments.find((segment) => segment.id === selectedSegmentId), [segments, selectedSegmentId])
  const selectedSegmentValidation = selectedSegment ? validateSegment(selectedSegment, savedWaypoints) : { valid: false, message: '' }
  const segmentValidation = validateSegments(segments, savedWaypoints)
  const canAddSegment = waypointValidation.valid && !hasUnsavedChanges && Boolean(acceptedGeometry)
  const canEditSegments = !hasUnsavedChanges

  const applyRouteMap = (routeMapData, { updateWaypoints = true } = {}) => {
    const normalizedMap = normalizeRouteMap(routeMapData)
    if (updateWaypoints && normalizedMap.hasWaypoints) {
      setWaypoints(normalizedMap.waypoints)
      setSavedWaypointSignature(getWaypointSignature(normalizedMap.waypoints))
    }
    if (normalizedMap.acceptedGeometry) {
      setAcceptedGeometry(normalizedMap.acceptedGeometry)
    }
    setCandidate(normalizedMap.candidate)
    if (normalizedMap.mapRevision) {
      setMapRevision(normalizedMap.mapRevision)
    }
    setUpdatedAt(normalizedMap.updatedAt)
    if (updateWaypoints && normalizedMap.hasWaypoints) {
      setSelectedWaypointId((current) => normalizedMap.waypoints.some((waypoint) => waypoint.id === current) ? current : normalizedMap.waypoints[0]?.id || '')
    }
  }

  const changeWaypoints = (updater) => {
    setWaypoints((current) => normalizeWaypoints(typeof updater === 'function' ? updater(current) : updater))
    setCandidate(null)
    setNotice('')
    setError('')
  }

  const updateWaypoint = (nextWaypoint) => {
    changeWaypoints((current) => current.map((waypoint) => waypoint.id === nextWaypoint.id ? nextWaypoint : waypoint))
  }

  const addBlankWaypoint = () => {
    changeWaypoints((current) => {
      const nextWaypoint = createEmptyWaypoint(current.length + 1)
      setSelectedWaypointId(nextWaypoint.id)
      return [...current, nextWaypoint]
    })
  }

  const addWaypointFromPlace = (placeId) => {
    if (!placeId) {
      return
    }

    const place = places.find((item) => item.id === placeId)
    const coordinates = getPlaceCoordinates(place)
    if (!coordinates) {
      setError('Selected Place does not have valid coordinates.')
      return
    }

    setError('')
    changeWaypoints((current) => {
      const nextWaypoint = createEmptyWaypoint(current.length + 1, {
        place_id: place.id,
        label: place.name || place.title || '',
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      })
      setSelectedWaypointId(nextWaypoint.id)
      return [...current, nextWaypoint]
    })
  }

  const addWaypointFromMap = (coordinates) => {
    changeWaypoints((current) => {
      const nextWaypoint = createEmptyWaypoint(current.length + 1, coordinates)
      setSelectedWaypointId(nextWaypoint.id)
      return [...current, nextWaypoint]
    })
  }

  const removeWaypoint = (waypointId) => {
    if (segments.some((segment) => segment.start_waypoint_id === waypointId || segment.end_waypoint_id === waypointId)) {
      const confirmed = window.confirm('A local Segment uses this Waypoint. Remove the Waypoint anyway? The Segment will need new boundaries before it can be saved.')
      if (!confirmed) return
    }
    changeWaypoints((current) => {
      const nextWaypoints = normalizeWaypoints(current.filter((waypoint) => waypoint.id !== waypointId))
      if (selectedWaypointId === waypointId) {
        setSelectedWaypointId(nextWaypoints[0]?.id || '')
      }
      return nextWaypoints
    })
  }

  const changeSegments = (updater) => {
    setSegments((current) => normalizeSegments(typeof updater === 'function' ? updater(current) : updater))
    setNotice('')
    setError('')
  }

  const addSegment = () => {
    if (!canAddSegment) return
    const startWaypoint = waypoints[0]
    const endWaypoint = waypoints[1]
    const geometry = deriveSegmentGeometry(acceptedGeometry, startWaypoint, endWaypoint)
    const nextSegment = createEmptySegment(segments.length + 1, startWaypoint.id, endWaypoint.id, geometry)
    changeSegments((current) => [...current, nextSegment])
    setSelectedSegmentId(nextSegment.id)
  }

  const updateSegment = (nextSegment) => {
    const previous = segments.find((segment) => segment.id === nextSegment.id)
    const boundaryChanged = previous && (previous.start_waypoint_id !== nextSegment.start_waypoint_id || previous.end_waypoint_id !== nextSegment.end_waypoint_id)
    const startWaypoint = savedWaypoints.find((waypoint) => waypoint.id === nextSegment.start_waypoint_id)
    const endWaypoint = savedWaypoints.find((waypoint) => waypoint.id === nextSegment.end_waypoint_id)
    changeSegments((current) => current.map((segment) => segment.id === nextSegment.id
      ? { ...nextSegment, geometry: boundaryChanged ? deriveSegmentGeometry(acceptedGeometry, startWaypoint, endWaypoint) : nextSegment.geometry }
      : segment))
  }

  const regenerateSegment = () => {
    if (!selectedSegment || !canEditSegments) return
    const startWaypoint = savedWaypoints.find((waypoint) => waypoint.id === selectedSegment.start_waypoint_id)
    const endWaypoint = savedWaypoints.find((waypoint) => waypoint.id === selectedSegment.end_waypoint_id)
    changeSegments((current) => current.map((segment) => segment.id === selectedSegment.id
      ? { ...segment, geometry: deriveSegmentGeometry(acceptedGeometry, startWaypoint, endWaypoint) }
      : segment))
  }

  const moveSegment = (index, direction) => {
    changeSegments((current) => {
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= current.length) return current
      const nextSegments = [...current]
      const movingSegment = nextSegments[index]
      nextSegments[index] = nextSegments[targetIndex]
      nextSegments[targetIndex] = movingSegment
      return nextSegments
    })
  }

  const removeSegment = (segmentId) => {
    const index = segments.findIndex((segment) => segment.id === segmentId)
    const nextSegments = segments.filter((segment) => segment.id !== segmentId)
    changeSegments(nextSegments)
    if (selectedSegmentId === segmentId) {
      setSelectedSegmentId(nextSegments[Math.min(index, nextSegments.length - 1)]?.id || '')
    }
  }

  const saveSegments = async () => {
    if (hasUnsavedChanges) {
      setError('Save Waypoints before saving Segments.')
      return
    }
    if (!segmentValidation.valid) {
      setError(segmentValidation.message)
      return
    }
    const submittedSegmentIds = new Set(segments.map((segment) => segment.id))
    const deletedSegmentCount = persistedSegmentIds.filter((segmentId) => !submittedSegmentIds.has(segmentId)).length
    const confirmationMessages = []
    if (deletedSegmentCount > 0) {
      confirmationMessages.push(`Saving will permanently delete ${deletedSegmentCount} Segment(s). Continue?`)
    }
    if (segments.some((segment) => segment.needs_review)) {
      confirmationMessages.push('Saving confirms that all Segment geometries have been reviewed against the accepted Route.')
    }
    if (confirmationMessages.length > 0) {
      const confirmed = window.confirm(confirmationMessages.join('\n\n'))
      if (!confirmed) return
    }
    try {
      setSegmentsSaving(true)
      setError('')
      setNotice('')
      const savedSegments = await routeMapApi.updateSegments(routeId, segments)
      setSegments(savedSegments)
      setPersistedSegmentIds(savedSegments.map((segment) => segment.id))
      setSavedSegmentSignature(getSegmentSignature(savedSegments))
      setSelectedSegmentId((current) => savedSegments.some((segment) => segment.id === current) ? current : savedSegments[0]?.id || '')
      setNotice('Segments saved.')
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to save Route Segments.'))
    } finally {
      setSegmentsSaving(false)
    }
  }

  const moveWaypoint = (index, direction) => {
    changeWaypoints((current) => {
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= current.length) {
        return current
      }
      const nextWaypoints = [...current]
      const movingWaypoint = nextWaypoints[index]
      nextWaypoints[index] = nextWaypoints[targetIndex]
      nextWaypoints[targetIndex] = movingWaypoint
      return nextWaypoints
    })
  }

  const saveRouteMap = async () => {
    const validation = validateWaypoints(waypoints)
    if (!validation.valid) {
      setError(validation.message)
      return
    }

    try {
      setSaving(true)
      setError('')
      setNotice('')
      const routeMapData = await routeMapApi.updateWaypoints(routeId, waypoints)
      applyRouteMap(routeMapData)
      setNotice('Route map saved.')
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to save this route map.'))
    } finally {
      setSaving(false)
    }
  }

  const calculateCandidate = async () => {
    if (!canCalculate) {
      setError(hasUnsavedChanges ? 'Save valid waypoints before calculating a candidate.' : waypointValidation.message)
      return
    }

    try {
      setCalculating(true)
      setError('')
      setNotice('')
      const routeMapData = await routeMapApi.calculateCandidate(routeId, waypoints)
      setCandidate(routeMapData.candidate)
      if (routeMapData.mapRevision) {
        setMapRevision(routeMapData.mapRevision)
      }
      setNotice('Candidate route calculated.')
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to calculate a candidate route.'))
    } finally {
      setCalculating(false)
    }
  }

  const acceptCandidate = async () => {
    if (!candidate?.geometry) {
      return
    }

    const confirmed = window.confirm('Accept this candidate as the saved route geometry?')
    if (!confirmed) {
      return
    }

    try {
      setAccepting(true)
      setError('')
      setNotice('')
      const routeMapData = await routeMapApi.acceptGeometry(routeId, candidate.geometry, mapRevision)
      applyRouteMap(routeMapData, { updateWaypoints: false })
      setNotice('Candidate accepted as route geometry.')
    } catch (err) {
      const responseErrors = err?.response?.data?.errors
      const isStaleAcceptance = err?.response?.status === 400
        && Array.isArray(responseErrors)
        && responseErrors.some((item) => item?.code === 'stale_acceptance_request')
      if (isStaleAcceptance) {
        try {
          const routeData = await managementApis.routes.getById(routeId)
          setRoute(routeData)
          setAcceptedGeometry(getRouteAcceptedGeometry(routeData, null))
          setMapRevision(getRouteMapRevision(routeData, null))
          setCandidate(null)
        } catch {
          // Keep the original stale error visible if refresh also fails.
        }
      }
      setError(getErrorMessage(err, 'Unable to accept this candidate route.'))
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return <section className="management-page"><h1>Route map</h1><div className="management-empty">Loading route map...</div></section>
  }

  if (error && !route) {
    return (
      <section className="management-page">
        <h1>Route map</h1>
        <div className="management-error">{error}</div>
      </section>
    )
  }

  return (
    <section className="management-page route-map-editor-page">
      <div className="management-page-header route-map-editor-header">
        <div>
          <p className="eyebrow">Management / Routes</p>
          <h1>{route?.title || 'Route map'}</h1>
        </div>
        <div className="route-map-header-actions">
          <Link to={`/manage/routes/${routeId}/edit`} className="secondary-button">Back to route details</Link>
          <button type="button" className="secondary-button" onClick={() => navigate('/manage/routes')}>Routes</button>
        </div>
      </div>

      {error && <div className="management-error" role="alert">{error}</div>}
      {notice && <div className="management-empty route-map-notice" role="status">{notice}</div>}
      {hasUnsavedChanges && <div className="management-empty route-map-notice" role="status">Waypoint changes are not saved. Candidate calculation is disabled until you save them.</div>}
      {hasUnsavedSegmentChanges && <div className="management-empty route-map-notice" role="status">Segment changes are not saved.</div>}
      {addMode && <div className="management-empty route-map-notice" role="status">Map click mode is active. Click the map to add the next waypoint.</div>}

      <div className="route-map-editor-layout">
        <div className="route-map-main-column">
          <RouteAuthoringMap
            waypoints={waypoints}
            acceptedGeometry={acceptedGeometry}
            candidateGeometry={candidate?.geometry}
            segments={segments}
            selectedSegmentId={selectedSegmentId}
            selectedWaypointId={selectedWaypointId}
            addMode={addMode}
            onWaypointSelect={setSelectedWaypointId}
            onSegmentSelect={setSelectedSegmentId}
            onMapAddWaypoint={addWaypointFromMap}
          />
          <RouteGeometryLegend />
          <RouteCandidateSummary acceptedGeometry={acceptedGeometry} candidate={candidate} mapRevision={mapRevision} updatedAt={updatedAt} />
        </div>

        <div className="route-map-side-column">
          <WaypointList
            waypoints={waypoints}
            places={places}
            selectedWaypointId={selectedWaypointId}
            addMode={addMode}
            onAddBlank={addBlankWaypoint}
            onAddModeChange={setAddMode}
            onAddFromPlace={addWaypointFromPlace}
            onSelect={setSelectedWaypointId}
            onMove={moveWaypoint}
            onRemove={removeWaypoint}
          />
          <WaypointEditor waypoint={selectedWaypoint} places={places} onChange={updateWaypoint} />
          <RouteMapActions
            calculating={calculating}
            saving={saving}
            accepting={accepting}
            canCalculate={canCalculate}
            canAccept={canAccept}
            hasUnsavedChanges={hasUnsavedChanges}
            onSave={saveRouteMap}
            onCalculate={calculateCandidate}
            onAccept={acceptCandidate}
          />
          <section className="route-map-segments-section">
            {segmentsLoading && <div className="management-empty route-map-notice">Loading Segments...</div>}
            {segmentsError && <div className="management-error" role="alert">{segmentsError}</div>}
            {!segmentsLoading && <>
              <SegmentList
                segments={segments}
                waypoints={savedWaypoints}
                selectedSegmentId={selectedSegmentId}
                canAdd={canAddSegment}
                onAdd={addSegment}
                onSelect={setSelectedSegmentId}
                onMove={moveSegment}
                onRemove={removeSegment}
              />
              <SegmentEditor
                segment={selectedSegment}
                waypoints={savedWaypoints}
                validation={selectedSegmentValidation}
                canRegenerate={canEditSegments && Boolean(acceptedGeometry) && Boolean(selectedSegment)}
                onChange={updateSegment}
                onRegenerate={regenerateSegment}
              />
              <SegmentActions saving={segmentsSaving} disabled={!canEditSegments || !segmentValidation.valid || !hasUnsavedSegmentChanges} dirty={hasUnsavedSegmentChanges} onSave={saveSegments} />
            </>}
          </section>
        </div>
      </div>
    </section>
  )
}

export default RouteMapEditorPage
