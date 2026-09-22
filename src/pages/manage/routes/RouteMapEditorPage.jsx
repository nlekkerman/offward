import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import RouteAuthoringMap from '../../../features/map/components/RouteAuthoringMap.jsx'
import RouteCandidateSummary from '../../../features/routes/routeMap/components/RouteCandidateSummary.jsx'
import RouteGeometryLegend from '../../../features/routes/routeMap/components/RouteGeometryLegend.jsx'
import RouteMapActions from '../../../features/routes/routeMap/components/RouteMapActions.jsx'
import SegmentEditor from '../../../features/routes/routeMap/components/SegmentEditor.jsx'
import SegmentList from '../../../features/routes/routeMap/components/SegmentList.jsx'
import WaypointEditor from '../../../features/routes/routeMap/components/WaypointEditor.jsx'
import WaypointList from '../../../features/routes/routeMap/components/WaypointList.jsx'
import ContentVideoManager from '../../../features/video/ContentVideoManager.jsx'
import { buildWaypointPayload, createEmptyWaypoint, deriveWaypointPairs, getPlaceCoordinates, normalizeGeometry, normalizeRouteMap, normalizeWaypoints, reorderWaypoints, replaceCandidateSectionGeometry, validateWaypoints } from '../../../features/routes/routeMap/routeMapUtils.js'
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

function RouteMapEditorPage() {
  const { routeId } = useParams()
  const [route, setRoute] = useState(null)
  const [places, setPlaces] = useState([])
  const [waypoints, setWaypoints] = useState([])
  const [acceptedGeometry, setAcceptedGeometry] = useState(null)
  const [candidate, setCandidate] = useState(null)
  const [mapRevision, setMapRevision] = useState('')
  const [updatedAt, setUpdatedAt] = useState('')
  const [selectedWaypointId, setSelectedWaypointId] = useState('')
  const [quickEditWaypointId, setQuickEditWaypointId] = useState('')
  const [quickEditSaving, setQuickEditSaving] = useState(false)
  const [advancedWaypointId, setAdvancedWaypointId] = useState('')
  const [mediaWaypointId, setMediaWaypointId] = useState('')
  const [savedWaypointSignature, setSavedWaypointSignature] = useState('[]')
  const [selectedPairKey, setSelectedPairKey] = useState('')
  const [manualDrawing, setManualDrawing] = useState(null)
  const [addMode, setAddMode] = useState(false)
  const [activePanel, setActivePanel] = useState('waypoints')
  const [quickAddPlaceId, setQuickAddPlaceId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    let active = true

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
        if (nextWaypoints.length > 1) {
          setSelectedPairKey((current) => current || `${nextWaypoints[0].id}:${nextWaypoints[1].id}`)
        }
        setQuickEditWaypointId('')
        setAdvancedWaypointId('')
        setMediaWaypointId('')

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

    load()

    return () => {
      active = false
    }
  }, [routeId])

  const selectedWaypoint = useMemo(
    () => waypoints.find((waypoint) => waypoint.id === selectedWaypointId),
    [selectedWaypointId, waypoints],
  )
  const advancedWaypoint = useMemo(
    () => waypoints.find((waypoint) => waypoint.id === advancedWaypointId),
    [advancedWaypointId, waypoints],
  )

  const hasUnsavedChanges = savedWaypointSignature !== getWaypointSignature(waypoints)
  const savedWaypoints = useMemo(() => waypoints.filter((waypoint) => !String(waypoint.id).startsWith('new-')), [waypoints])
  const waypointPairs = useMemo(() => deriveWaypointPairs(savedWaypoints), [savedWaypoints])
  const waypointValidation = validateWaypoints(waypoints)
  const canCalculate = waypointValidation.valid && !hasUnsavedChanges
  const canAccept = Boolean(candidate?.geometry && mapRevision && !hasUnsavedChanges)
  const selectedPair = useMemo(() => waypointPairs.find((pair) => pair.key === selectedPairKey), [selectedPairKey, waypointPairs])
  const manualDrawingPair = useMemo(() => waypointPairs.find((pair) => pair.key === manualDrawing?.pairKey), [manualDrawing?.pairKey, waypointPairs])
  const manualDrawingStartWaypoint = useMemo(() => savedWaypoints.find((waypoint) => waypoint.id === manualDrawingPair?.start_waypoint_id), [manualDrawingPair, savedWaypoints])
  const manualDrawingEndWaypoint = useMemo(() => savedWaypoints.find((waypoint) => waypoint.id === manualDrawingPair?.end_waypoint_id), [manualDrawingPair, savedWaypoints])
  const editingContextLabel = useMemo(() => {
    const parts = []
    if (selectedWaypoint) parts.push(`Waypoint ${selectedWaypoint.order}`)
    if (selectedPair) parts.push(`Section ${selectedPair.order} → ${selectedPair.order + 1}`)
    return parts.length ? parts.join(' · ') : 'No selection'
  }, [selectedPair, selectedWaypoint])
  const canDrawSelectedPair = Boolean(selectedPair && candidate?.geometry && !hasUnsavedChanges)

  const togglePanel = (panel) => {
    setActivePanel((current) => current === panel ? '' : panel)
  }

  const cancelMapClickMode = () => {
    setAddMode(false)
  }

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
    const nextWaypoints = normalizeWaypoints(typeof updater === 'function' ? updater(waypoints) : updater)
    setWaypoints(nextWaypoints)
    setManualDrawing(null)
    setCandidate(null)
    setNotice('')
    setError('')
  }

  const updateWaypoint = (nextWaypoint) => {
    changeWaypoints((current) => current.map((waypoint) => waypoint.id === nextWaypoint.id ? nextWaypoint : waypoint))
  }

  const selectWaypoint = (waypointId) => {
    const waypoint = waypoints.find((item) => item.id === waypointId)
    setSelectedWaypointId(waypointId)
    setAdvancedWaypointId('')
    setMediaWaypointId('')
    setQuickEditWaypointId(waypoint && !String(waypoint.id).startsWith('new-') ? waypointId : '')
  }

  const openAdvancedWaypoint = (waypointId) => {
    setSelectedWaypointId(waypointId)
    setQuickEditWaypointId('')
    setMediaWaypointId('')
    setAdvancedWaypointId(waypointId)
  }

  const openWaypointMedia = (waypointId) => {
    setSelectedWaypointId(waypointId)
    setQuickEditWaypointId('')
    setAdvancedWaypointId('')
    setMediaWaypointId((current) => current === waypointId ? '' : waypointId)
  }

  const updateWaypointMedia = (waypointId, nextIds) => {
    const mediaIds = Array.isArray(nextIds) ? [...nextIds] : []
    setWaypoints((current) => normalizeWaypoints(current.map((waypoint) => waypoint.id === waypointId
      ? { ...waypoint, media_ids: mediaIds }
      : waypoint)))
    setSavedWaypointSignature((current) => {
      const savedWaypoints = JSON.parse(current)
      return JSON.stringify(savedWaypoints.map((waypoint) => String(waypoint.id) === String(waypointId)
        ? { ...waypoint, media_ids: mediaIds }
        : waypoint))
    })
  }

  const updateWaypointGallery = async (waypointId, collection, attach) => {
    const nextWaypoints = normalizeWaypoints(waypoints.map((waypoint) => {
      if (String(waypoint.id) !== String(waypointId)) return waypoint
      const currentIds = Array.isArray(waypoint.image_collection_ids) ? waypoint.image_collection_ids.map(String) : []
      const collectionId = String(collection.id)
      const nextIds = attach
        ? [...currentIds, ...(currentIds.includes(collectionId) ? [] : [collectionId])]
        : currentIds.filter((value) => value !== collectionId)
      return { ...waypoint, image_collection_ids: nextIds }
    }))
    const routeMapData = await routeMapApi.updateWaypoints(routeId, nextWaypoints)
    applyRouteMap(routeMapData)
  }

  const addBlankWaypoint = () => {
    setActivePanel('waypoints')
    changeWaypoints((current) => {
      const nextWaypoint = createEmptyWaypoint(current.length + 1)
      setSelectedWaypointId(nextWaypoint.id)
      setQuickEditWaypointId('')
      setAdvancedWaypointId(nextWaypoint.id)
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
    setActivePanel('waypoints')
    changeWaypoints((current) => {
      const nextWaypoint = createEmptyWaypoint(current.length + 1, {
        place_id: place.id,
        label: place.name || place.title || '',
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      })
      setSelectedWaypointId(nextWaypoint.id)
      setQuickEditWaypointId('')
      setAdvancedWaypointId(nextWaypoint.id)
      return [...current, nextWaypoint]
    })
  }

  const addWaypointFromMap = (coordinates) => {
    setActivePanel('waypoints')
    changeWaypoints((current) => {
      const nextWaypoint = createEmptyWaypoint(current.length + 1, coordinates)
      setSelectedWaypointId(nextWaypoint.id)
      setQuickEditWaypointId('')
      setAdvancedWaypointId(nextWaypoint.id)
      return [...current, nextWaypoint]
    })
  }

  const removeWaypoint = (waypointId) => {
    changeWaypoints((current) => {
      const nextWaypoints = normalizeWaypoints(current.filter((waypoint) => waypoint.id !== waypointId))
      if (selectedWaypointId === waypointId) {
        setSelectedWaypointId(nextWaypoints[0]?.id || '')
      }
      return nextWaypoints
    })
    if (quickEditWaypointId === waypointId) setQuickEditWaypointId('')
    if (advancedWaypointId === waypointId) setAdvancedWaypointId('')
    if (mediaWaypointId === waypointId) setMediaWaypointId('')
  }

  const selectPair = (pairKey) => {
    setSelectedPairKey(pairKey)
    setManualDrawing((current) => current?.pairKey === pairKey ? current : null)
  }

  const startManualCandidateDrawing = () => {
    if (!selectedPair || !canDrawSelectedPair) return
    setAddMode(false)
    setManualDrawing({ pairKey: selectedPair.key, points: [] })
    setNotice('')
    setError('')
  }

  const addManualCandidatePoint = (point) => {
    setManualDrawing((current) => current ? { ...current, points: [...current.points, point] } : current)
  }

  const undoManualCandidatePoint = () => {
    setManualDrawing((current) => current ? { ...current, points: current.points.slice(0, -1) } : current)
  }

  const cancelManualCandidateDrawing = () => {
    setManualDrawing(null)
  }

  const finishManualCandidateDrawing = () => {
    const drawing = manualDrawing
    if (!drawing || !manualDrawingPair || !candidate?.geometry) return

    const geometry = replaceCandidateSectionGeometry(candidate.geometry, manualDrawingStartWaypoint, manualDrawingEndWaypoint, drawing.points)
    if (!geometry) {
      setError('Unable to replace this candidate section. Recalculate the candidate and try again.')
      return
    }

    setCandidate((current) => current ? { ...current, geometry } : current)
    setManualDrawing(null)
    setNotice('Candidate section replaced. Accept the candidate to persist this route geometry.')
    setError('')
  }

  const moveWaypoint = (index, direction) => {
    const nextWaypoints = reorderWaypoints(waypoints, index, direction)
    setWaypoints(nextWaypoints)
    setManualDrawing(null)
    setCandidate(null)
    setNotice('')
    setError('')
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

  const saveQuickWaypointName = async (waypointId, name) => {
    const nextWaypoints = normalizeWaypoints(waypoints.map((waypoint) => waypoint.id === waypointId ? { ...waypoint, name } : waypoint))
    const validation = validateWaypoints(nextWaypoints)
    if (!validation.valid) {
      setError(validation.message)
      return false
    }

    try {
      setQuickEditSaving(true)
      setError('')
      setNotice('')
      const routeMapData = await routeMapApi.updateWaypoints(routeId, nextWaypoints)
      applyRouteMap(routeMapData)
      setNotice('Waypoint name saved.')
      return true
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to save this waypoint name.'))
      return false
    } finally {
      setQuickEditSaving(false)
    }
  }

  const saveActiveWaypoint = async () => {
    if (!selectedWaypoint) {
      return
    }

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
      setNotice(String(selectedWaypoint.id).startsWith('new-') ? 'Waypoint added.' : 'Waypoint saved.')
      setQuickAddPlaceId('')
      setAddMode(false)
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to save this waypoint.'))
    } finally {
      setSaving(false)
    }
  }

  const cancelActiveWaypoint = () => {
    if (!selectedWaypoint) {
      return
    }

    setWaypoints((current) => {
      const currentSelection = current.find((waypoint) => waypoint.id === selectedWaypoint.id)
      if (!currentSelection) {
        return current
      }

      if (String(selectedWaypoint.id).startsWith('new-')) {
        const nextWaypoints = current.filter((waypoint) => waypoint.id !== selectedWaypoint.id)
        setSelectedWaypointId(nextWaypoints[0]?.id || '')
        return nextWaypoints
      }

      return current
    })

    setQuickAddPlaceId('')
    setAddMode(false)
    setAdvancedWaypointId('')
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
      setManualDrawing(null)
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
          <Link to="/manage" className="secondary-button">Management</Link>
        </div>
      </div>

      {error && <div className="management-error" role="alert">{error}</div>}
      {notice && <div className="management-empty route-map-notice" role="status">{notice}</div>}
      {hasUnsavedChanges && <div className="management-empty route-map-notice" role="status">Waypoint changes are not saved. Candidate calculation is disabled until you save them.</div>}
      {addMode && <div className="management-empty route-map-notice" role="status">Map click mode is active. Click the map to add the next waypoint.</div>}

      <div className="route-map-toolbar" role="toolbar" aria-label="Route map editor tools">
        <button type="button" className={activePanel === 'waypoints' ? 'route-map-tool is-active' : 'route-map-tool'} onClick={() => togglePanel('waypoints')} aria-expanded={activePanel === 'waypoints'}>
          Waypoints <span>{waypoints.length}</span>
        </button>
        <button type="button" className={activePanel === 'segments' ? 'route-map-tool is-active' : 'route-map-tool'} onClick={() => togglePanel('segments')} aria-expanded={activePanel === 'segments'}>
          Candidate sections <span>{waypointPairs.length}</span>
        </button>
        <button type="button" className={activePanel === 'videos' ? 'route-map-tool is-active' : 'route-map-tool'} onClick={() => togglePanel('videos')} aria-expanded={activePanel === 'videos'}>
          + Add video
        </button>
        <button type="button" className={activePanel === 'status' ? 'route-map-tool is-active' : 'route-map-tool'} onClick={() => togglePanel('status')} aria-expanded={activePanel === 'status'}>Route status</button>
        <span className="route-map-context-indicator" role="status">{editingContextLabel}</span>
        {activePanel && <button type="button" className="route-map-close-tool" onClick={() => setActivePanel('')} aria-label="Close editor panel">Close panel</button>}
      </div>

      {activePanel === 'waypoints' && (
        <section className="route-map-editor-panel route-map-panel-stack">
          <WaypointList
            waypoints={waypoints}
            places={places}
            routeId={routeId}
            selectedWaypointId={selectedWaypointId}
            mediaWaypointId={mediaWaypointId}
            quickEditWaypointId={quickEditWaypointId}
            quickEditSaving={quickEditSaving}
            addMode={addMode}
            selectedPlaceId={quickAddPlaceId}
            onPlaceIdChange={setQuickAddPlaceId}
            onAddBlank={addBlankWaypoint}
            onAddModeChange={setAddMode}
            onAddFromPlace={addWaypointFromPlace}
            onSelect={selectWaypoint}
            onQuickSave={saveQuickWaypointName}
            onQuickCancel={() => setQuickEditWaypointId('')}
            onOpenAdvanced={openAdvancedWaypoint}
            onOpenMedia={openWaypointMedia}
            onMediaChange={updateWaypointMedia}
            onGalleryAttach={(waypointId, collection) => updateWaypointGallery(waypointId, collection, true)}
            onGalleryDetach={(waypointId, collection) => updateWaypointGallery(waypointId, collection, false)}
            onMove={moveWaypoint}
            onRemove={removeWaypoint}
          />
          {addMode && (
            <div className="route-map-notice route-map-inline-message" role="status">
              <strong>Map-click mode active</strong>
              <span>Click the map to choose the waypoint location.</span>
              <button type="button" className="secondary-button small-button" onClick={cancelMapClickMode}>Cancel map-click mode</button>
            </div>
          )}
          {advancedWaypoint && (
            <WaypointEditor
              waypoint={advancedWaypoint}
              places={places}
              onChange={updateWaypoint}
              onSave={saveActiveWaypoint}
              onCancel={cancelActiveWaypoint}
            />
          )}
        </section>
      )}

      {activePanel === 'segments' && (
        <section className="route-map-editor-panel route-map-segments-section">
          <SegmentList pairs={waypointPairs} waypoints={savedWaypoints} selectedPairKey={selectedPairKey} onSelect={selectPair} />
          <SegmentEditor
            pair={selectedPair}
            waypoints={savedWaypoints}
            canDrawManually={canDrawSelectedPair}
            drawingManually={manualDrawing?.pairKey === selectedPair?.key}
            manualPointCount={manualDrawing?.pairKey === selectedPair?.key ? manualDrawing.points.length : 0}
            onStartManualDrawing={startManualCandidateDrawing}
            onUndoManualPoint={undoManualCandidatePoint}
            onFinishManualDrawing={finishManualCandidateDrawing}
            onCancelManualDrawing={cancelManualCandidateDrawing}
          />
        </section>
      )}

      {activePanel === 'videos' && (
        <section className="route-map-editor-panel">
          <div className="route-map-panel-header">
            <div>
              <p className="eyebrow">Videos</p>
              <h2>Videos for this Route</h2>
            </div>
          </div>
          <ContentVideoManager
            resourceKey="route"
            resourceId={routeId}
            routeId={routeId}
            attachedVideoIds={route?.video_ids || []}
            onAttachmentsChange={(nextIds) => setRoute((current) => ({ ...current, video_ids: nextIds }))}
          />
        </section>
      )}

      {activePanel === 'status' && (
        <section className="route-map-editor-panel">
          <div className="route-map-panel-header"><div><p className="eyebrow">Route status</p><h2>Route geometry</h2></div></div>
          <RouteCandidateSummary acceptedGeometry={acceptedGeometry} candidate={candidate} mapRevision={mapRevision} updatedAt={updatedAt} />
          <RouteMapActions calculating={calculating} saving={saving} accepting={accepting} canCalculate={canCalculate} canAccept={canAccept} hasUnsavedChanges={hasUnsavedChanges} onSave={saveRouteMap} onCalculate={calculateCandidate} onAccept={acceptCandidate} showSave={false} />
        </section>
      )}

      <div className="route-map-main-column">
        <RouteAuthoringMap
          waypoints={waypoints}
          acceptedGeometry={acceptedGeometry}
          candidateGeometry={candidate?.geometry}
          selectedWaypointId={selectedWaypointId}
          addMode={addMode}
          onWaypointSelect={selectWaypoint}
          manualDrawing={manualDrawing ? { startWaypoint: manualDrawingStartWaypoint, endWaypoint: manualDrawingEndWaypoint, points: manualDrawing.points } : null}
          onMapAddWaypoint={addWaypointFromMap}
          onManualDrawPoint={addManualCandidatePoint}
        />
        <RouteGeometryLegend />
      </div>
    </section>
  )
}

export default RouteMapEditorPage
