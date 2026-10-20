import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import RouteAuthoringMap from '../../../features/map/components/RouteAuthoringMap.jsx'
import RouteGeometryLegend from '../../../features/routes/routeMap/components/RouteGeometryLegend.jsx'
import SegmentList from '../../../features/routes/routeMap/components/SegmentList.jsx'
import WaypointEditor from '../../../features/routes/routeMap/components/WaypointEditor.jsx'
import WaypointList from '../../../features/routes/routeMap/components/WaypointList.jsx'
import ContentVideoManager from '../../../features/video/ContentVideoManager.jsx'
import { buildManualSegmentGeometry, buildWaypointPayload, createEmptyWaypoint, deriveWaypointPairs, getPlaceCoordinates, normalizeRouteMap, normalizeWaypoints, reorderWaypoints, validateWaypoints } from '../../../features/routes/routeMap/routeMapUtils.js'
import { managementApis } from '../../../services/management/index.js'
import { routeMapApi } from '../../../services/management/routeMapApi.js'

function getErrorMessage(err, fallback) {
  const status = err?.response?.status
  if (status === 400) return 'The request is invalid. Check the entered values and try again.'
  if (status === 404) return 'The requested waypoint or connection is no longer available. Refresh the route map and try again.'
  if (status === 409) return 'The route changed or this preview expired. The latest route map has been refreshed; calculate a fresh preview.'
  if (status === 410) return 'This route operation is no longer supported. Refresh the editor and try again.'
  if (status === 502) return 'The routing provider returned an invalid route. Try calculating this connection again.'
  if (status === 503) return 'The routing provider is temporarily unavailable. Please try again later.'

  return fallback
}

function getRouteMapRevision(route, waypointMap) {
  return [waypointMap?.mapRevision, route?.map_revision, route?.mapRevision, route?.revision]
    .find((revision) => revision !== undefined && revision !== null && revision !== '') ?? ''
}

function getCandidateExpiry(candidate) {
  const expiry = new Date(candidate.expiresAt).getTime()
  return Number.isFinite(expiry) ? expiry : Date.now() + 15 * 60 * 1000
}

function getWaypointSignature(waypoints) {
  return JSON.stringify(buildWaypointPayload(waypoints))
}

function getPlaceCreateErrors(err) {
  const data = err?.response?.data
  const fieldErrors = {}
  ;['slug', 'name'].forEach((field) => {
    const value = data?.[field]
    if (typeof value === 'string') fieldErrors[field] = value
    else if (Array.isArray(value)) fieldErrors[field] = value.filter(Boolean).join(' ')
  })

  return {
    fieldErrors,
    error: getErrorMessage(err, fieldErrors.slug || fieldErrors.name ? '' : 'Unable to create a Place from this Waypoint.'),
  }
}

function RouteMapEditorPage() {
  const { routeId } = useParams()
  const [route, setRoute] = useState(null)
  const [places, setPlaces] = useState([])
  const [waypoints, setWaypoints] = useState([])
  const [segments, setSegments] = useState([])
  const [mapRevision, setMapRevision] = useState('')
  const [isMapRenderable, setIsMapRenderable] = useState(false)
  const [selectedWaypointId, setSelectedWaypointId] = useState('')
  const [quickEditWaypointId, setQuickEditWaypointId] = useState('')
  const [quickEditSaving, setQuickEditSaving] = useState(false)
  const [advancedWaypointId, setAdvancedWaypointId] = useState('')
  const [mediaWaypointId, setMediaWaypointId] = useState('')
  const [foodWaypointId, setFoodWaypointId] = useState('')
  const [savedWaypointSignature, setSavedWaypointSignature] = useState('[]')
  const [selectedConnectionId, setSelectedConnectionId] = useState('')
  const [connectionPreview, setConnectionPreview] = useState(null)
  const [routingProfile, setRoutingProfile] = useState('walking')
  const [manualDrawing, setManualDrawing] = useState(null)
  const [waypointMovePreview, setWaypointMovePreview] = useState(null)
  const [addMode, setAddMode] = useState(false)
  const [activePanel, setActivePanel] = useState('connections')
  const [quickAddPlaceId, setQuickAddPlaceId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [calculating, setCalculating] = useState(false)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        setLoading(true)
        setError('')
        const [routeData, routeMapData, placesData] = await Promise.all([
          managementApis.routes.getById(routeId),
          routeMapApi.getCanonicalMap(routeId),
          managementApis.places.list(),
        ])

        if (!active) return

        const normalizedMap = normalizeRouteMap(routeMapData)
        const nextWaypoints = normalizedMap.waypoints
        setRoute({ ...routeData, ...(routeMapData.route || {}) })
        setPlaces(placesData)
        setWaypoints(nextWaypoints)
        setSegments(routeMapData.segments)
        setSavedWaypointSignature(getWaypointSignature(nextWaypoints))
        setMapRevision(getRouteMapRevision(routeData, normalizedMap))
        setIsMapRenderable(routeMapData.isMapRenderable)
        setSelectedWaypointId(nextWaypoints[0]?.id || '')
        if (nextWaypoints.length > 1) {
          const firstPair = deriveWaypointPairs(nextWaypoints)[0]
          const firstSegment = routeMapData.segments.find((segment) => segment.start_waypoint_id === firstPair.start_waypoint_id && segment.end_waypoint_id === firstPair.end_waypoint_id)
          setSelectedConnectionId(firstSegment?.id || firstPair.key)
        }
        setQuickEditWaypointId('')
        setAdvancedWaypointId('')
        setMediaWaypointId('')
        setFoodWaypointId('')

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
  const connections = useMemo(() => waypointPairs.map((pair, index) => {
    const segment = segments.find((item) => item.start_waypoint_id === pair.start_waypoint_id && item.end_waypoint_id === pair.end_waypoint_id)
      || segments[index]
      || { id: pair.key, geometry: null, mode: '' }
    return {
      ...pair,
      id: segment.id || pair.key,
      segment,
      start: savedWaypoints.find((waypoint) => waypoint.id === pair.start_waypoint_id),
      end: savedWaypoints.find((waypoint) => waypoint.id === pair.end_waypoint_id),
    }
  }), [segments, savedWaypoints, waypointPairs])
  const selectedConnection = useMemo(() => connections.find((connection) => connection.id === selectedConnectionId), [connections, selectedConnectionId])
  const drawingConnection = useMemo(() => connections.find((connection) => connection.id === manualDrawing?.connectionId), [connections, manualDrawing?.connectionId])
  const editingDisabled = hasUnsavedChanges
    || mapRevision === ''
    || mapRevision === null
    || mapRevision === undefined
    || !selectedConnection
    || String(selectedConnection.id).includes(':')
    || String(selectedConnection.segment.id || '').startsWith('new-')
  const editingContextLabel = useMemo(() => {
    const parts = []
    if (selectedWaypoint) parts.push(`Waypoint ${selectedWaypoint.order}`)
    if (selectedConnection) parts.push(`Connection ${selectedConnection.start.order} → ${selectedConnection.end.order}`)
    return parts.length ? parts.join(' · ') : 'No selection'
  }, [selectedConnection, selectedWaypoint])

  const togglePanel = (panel) => {
    setActivePanel((current) => current === panel ? '' : panel)
  }

  const cancelMapClickMode = () => {
    setAddMode(false)
  }

  const selectConnection = (connectionId) => {
    setSelectedConnectionId(connectionId)
    setActivePanel('connections')
    setConnectionPreview(null)
    setManualDrawing(null)
  }

  const finishWaypointDrag = (waypointId, coordinates) => {
    setWaypointMovePreview({ id: waypointId, ...coordinates })
    setSelectedWaypointId(waypointId)
    const adjacentConnection = connections.find((connection) => connection.start_waypoint_id === waypointId || connection.end_waypoint_id === waypointId)
    if (adjacentConnection) setSelectedConnectionId(adjacentConnection.id)
    setActivePanel('connections')
    setConnectionPreview(null)
    setManualDrawing(null)
    setNotice('Waypoint move preview. Save or cancel to continue.')
  }

  const refreshCanonicalMap = async () => {
    const canonicalMap = await routeMapApi.getCanonicalMap(routeId)
    const normalizedMap = normalizeRouteMap(canonicalMap)
    setRoute((current) => ({ ...(current || {}), ...canonicalMap.route }))
    setWaypoints(normalizedMap.waypoints)
    setSavedWaypointSignature(getWaypointSignature(normalizedMap.waypoints))
    setSegments(canonicalMap.segments)
    setMapRevision(normalizedMap.mapRevision)
    setIsMapRenderable(canonicalMap.isMapRenderable)
    setConnectionPreview(null)
    setManualDrawing(null)
    setWaypointMovePreview(null)
    setSelectedWaypointId((current) => normalizedMap.waypoints.some((waypoint) => waypoint.id === current) ? current : normalizedMap.waypoints[0]?.id || '')
    const pairs = deriveWaypointPairs(normalizedMap.waypoints)
    const validConnectionIds = pairs.map((pair, index) => {
      const segment = canonicalMap.segments.find((item) => item.start_waypoint_id === pair.start_waypoint_id && item.end_waypoint_id === pair.end_waypoint_id)
        || canonicalMap.segments[index]
      return segment?.id || pair.key
    })
    setSelectedConnectionId((current) => validConnectionIds.includes(current) ? current : validConnectionIds[0] || '')
    return canonicalMap
  }

  const refreshAfterRevisionConflict = async (err) => {
    if (err?.response?.status !== 409) return false
    try {
      await refreshCanonicalMap()
      setError(getErrorMessage(err, 'The route changed. The latest map is shown.'))
    } catch (refreshErr) {
      setError(getErrorMessage(refreshErr, 'Unable to refresh the route after a revision conflict.'))
    }
    return true
  }

  const changeWaypoints = (updater) => {
    const nextWaypoints = normalizeWaypoints(typeof updater === 'function' ? updater(waypoints) : updater)
    setWaypoints(nextWaypoints)
    setManualDrawing(null)
    setConnectionPreview(null)
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
    setFoodWaypointId('')
    setMediaWaypointId((current) => current === waypointId ? '' : waypointId)
  }

  const openWaypointFood = (waypointId) => {
    setSelectedWaypointId(waypointId)
    setQuickEditWaypointId('')
    setAdvancedWaypointId('')
    setMediaWaypointId('')
    setFoodWaypointId((current) => current === waypointId ? '' : waypointId)
  }

  const updateWaypointFoodIds = (waypointId, nextIds) => {
    setWaypoints((current) => normalizeWaypoints(current.map((waypoint) => String(waypoint.id) === String(waypointId)
      ? { ...waypoint, food_ids: [...nextIds] }
      : waypoint)))
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
    try {
      const routeMapData = await routeMapApi.updateWaypoints(routeId, nextWaypoints)
      if (routeMapData.mapRevision !== undefined && routeMapData.mapRevision !== null) setMapRevision(routeMapData.mapRevision)
      await refreshCanonicalMap()
    } catch (err) {
      if (!(await refreshAfterRevisionConflict(err))) throw err
    }
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

  const startManualConnectionDrawing = () => {
    if (!selectedConnection) return
    setManualDrawing({ connectionId: selectedConnection.id, points: [] })
    setConnectionPreview(null)
    setAddMode(false)
    setNotice('')
    setError('')
  }

  const addManualCandidatePoint = (point) => {
    setManualDrawing((current) => current ? { ...current, points: [...current.points, point] } : current)
  }

  const undoManualPoint = () => {
    setManualDrawing((current) => current ? { ...current, points: current.points.slice(0, -1) } : current)
  }

  const cancelManualConnectionDrawing = () => {
    setManualDrawing(null)
  }

  const finishManualConnectionDrawing = () => {
    const drawing = manualDrawing
    if (!drawing || !drawingConnection) return
    const geometry = buildManualSegmentGeometry(drawingConnection.start, drawingConnection.end, drawing.points)
    if (!geometry) {
      setError('Unable to create this connection preview. Check the waypoint coordinates and try again.')
      return
    }

    setConnectionPreview({ mode: 'manual', geometry })
    setManualDrawing(null)
    setNotice('Manual connection preview is ready. Save it to update this connection.')
    setError('')
  }

  const calculateConnectionCandidate = async (segmentId = selectedConnection?.id, profile = routingProfile, revision = mapRevision) => {
    if (!segmentId || revision === '' || revision === null || revision === undefined || hasUnsavedChanges || !selectedConnection) {
      setError(hasUnsavedChanges ? 'Save waypoint changes before calculating a connection.' : 'Select a saved connection before calculating.')
      return
    }
    if (String(segmentId).includes(':') || String(segmentId).startsWith('new-')) {
      setError('This connection does not have a canonical connection ID. Refresh the route map and try again.')
      return
    }

    try {
      setCalculating(true)
      setError('')
      setNotice('')
      setConnectionPreview(null)
      const result = await routeMapApi.calculateSegmentCandidate(routeId, segmentId, profile, revision)
      if (!result.candidate?.candidateToken) {
        throw new Error('The routing preview response did not include a signed candidate token.')
      }
      setConnectionPreview({
        ...result.candidate,
        mode: 'calculated',
        expiresAt: getCandidateExpiry(result.candidate),
        profile,
      })
      if (result.mapRevision !== undefined && result.mapRevision !== null) setMapRevision(result.mapRevision)
      setManualDrawing(null)
      setNotice('Calculated connection preview is ready. Accept it to save.')
    } catch (err) {
      if (err?.response?.status === 409) {
        try {
          const freshMap = await refreshCanonicalMap()
          const freshRevision = normalizeRouteMap(freshMap).mapRevision
          const freshConnection = freshMap.segments.find((segment) => segment.id === segmentId)
          if (freshConnection && freshRevision) {
            const result = await routeMapApi.calculateSegmentCandidate(routeId, segmentId, profile, freshRevision)
            if (result.candidate?.candidateToken) {
              setConnectionPreview({
                ...result.candidate,
                mode: 'calculated',
                expiresAt: getCandidateExpiry(result.candidate),
                profile,
              })
              setNotice('The route changed. A fresh connection preview is ready.')
              return
            }
          }
          setError(getErrorMessage(err, 'The route changed; refresh the connection preview.'))
        } catch (refreshErr) {
          setError(getErrorMessage(refreshErr, 'Unable to refresh the route after a revision conflict.'))
        }
      } else {
        setError(getErrorMessage(err, 'Unable to calculate this connection.'))
      }
    } finally {
      setCalculating(false)
    }
  }

  const previewStraightConnection = () => {
    if (!selectedConnection) return
    const geometry = buildManualSegmentGeometry(selectedConnection.start, selectedConnection.end)
    if (!geometry) {
      setError('Unable to create a straight connection preview from these waypoint coordinates.')
      return
    }
    setConnectionPreview({ mode: 'straight', geometry })
    setManualDrawing(null)
    setNotice('Straight connection preview is ready. Save it to update this connection.')
    setError('')
  }

  const saveConnectionPreview = async () => {
    if (!selectedConnection || !connectionPreview) return
    if (String(selectedConnection.segment.id || '').startsWith('new-')) {
      setError('This connection does not have a canonical connection ID. Refresh the route map before saving.')
      return
    }
    if (mapRevision === '' || mapRevision === null || mapRevision === undefined) {
      setError('The current route revision is unavailable. Refresh the route map before saving this connection.')
      return
    }
    if (connectionPreview.mode === 'calculated' && Date.now() >= connectionPreview.expiresAt) {
      setConnectionPreview(null)
      setNotice('This routing preview expired. Requesting a fresh preview.')
      await calculateConnectionCandidate(selectedConnection.id, connectionPreview.profile || routingProfile, mapRevision)
      return
    }

    let payload
    if (connectionPreview.mode === 'manual') {
      payload = { action: 'save_manual', geometry: connectionPreview.geometry, expected_map_revision: mapRevision }
    } else if (connectionPreview.mode === 'straight') {
      payload = { action: 'generate_straight', expected_map_revision: mapRevision }
    } else {
      payload = { action: 'accept_calculated_candidate', candidate_token: connectionPreview.candidateToken, expected_map_revision: mapRevision }
    }

    try {
      setSaving(true)
      setError('')
      setNotice('')
      const result = await routeMapApi.updateSegment(routeId, selectedConnection.id, payload)
      if (result.mapRevision !== undefined && result.mapRevision !== null) setMapRevision(result.mapRevision)
      await refreshCanonicalMap()
      setNotice('Connection saved. The route map has been refreshed.')
    } catch (err) {
      if (err?.response?.status === 409) {
        try {
          const freshMap = await refreshCanonicalMap()
          if (connectionPreview.mode === 'calculated') {
            await calculateConnectionCandidate(selectedConnection.id, connectionPreview.profile || routingProfile, normalizeRouteMap(freshMap).mapRevision)
          } else {
            setError(getErrorMessage(err, 'The route changed. Review the refreshed map before trying again.'))
          }
        } catch (refreshErr) {
          setError(getErrorMessage(refreshErr, 'Unable to refresh the route after a revision conflict.'))
        }
      } else {
        setError(getErrorMessage(err, 'Unable to save this connection.'))
      }
    } finally {
      setSaving(false)
    }
  }

  const saveWaypointMove = async () => {
    if (!waypointMovePreview || hasUnsavedChanges) return
    const nextWaypoints = waypoints.map((waypoint) => waypoint.id === waypointMovePreview.id
      ? { ...waypoint, latitude: String(waypointMovePreview.latitude), longitude: String(waypointMovePreview.longitude) }
      : waypoint)
    try {
      setSaving(true)
      setError('')
      setNotice('')
      const routeMapData = await routeMapApi.updateWaypoints(routeId, nextWaypoints)
      if (routeMapData.mapRevision !== undefined && routeMapData.mapRevision !== null) setMapRevision(routeMapData.mapRevision)
      await refreshCanonicalMap()
      setNotice('Waypoint moved. Only its adjacent connections were invalidated; other saved connections were preserved.')
    } catch (err) {
      if (err?.response?.status === 409) {
        try {
          await refreshCanonicalMap()
        } catch (refreshErr) {
          setError(getErrorMessage(refreshErr, 'Unable to refresh the route after a revision conflict.'))
          return
        }
      }
      setError(getErrorMessage(err, 'Unable to save this waypoint movement.'))
    } finally {
      setSaving(false)
    }
  }

  const moveWaypoint = (index, direction) => {
    const nextWaypoints = reorderWaypoints(waypoints, index, direction)
    setWaypoints(nextWaypoints)
    setManualDrawing(null)
    setConnectionPreview(null)
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
      if (routeMapData.mapRevision !== undefined && routeMapData.mapRevision !== null) setMapRevision(routeMapData.mapRevision)
      await refreshCanonicalMap()
      setNotice('Route map saved.')
    } catch (err) {
      if (!(await refreshAfterRevisionConflict(err))) setError(getErrorMessage(err, 'Unable to save this route map.'))
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
      if (routeMapData.mapRevision !== undefined && routeMapData.mapRevision !== null) setMapRevision(routeMapData.mapRevision)
      await refreshCanonicalMap()
      setNotice('Waypoint name saved.')
      return true
    } catch (err) {
      if (!(await refreshAfterRevisionConflict(err))) setError(getErrorMessage(err, 'Unable to save this waypoint name.'))
      return false
    } finally {
      setQuickEditSaving(false)
    }
  }

  const createPlaceFromWaypoint = async (waypointId, payload) => {
    try {
      const result = await routeMapApi.createPlaceFromWaypoint(routeId, waypointId, payload)
      const returnedWaypointId = result?.waypoint?.id
      const placeId = result?.waypoint?.place_id
      const place = result?.place

      if (!returnedWaypointId || !placeId || !place?.id || String(returnedWaypointId) !== String(waypointId)) {
        throw new Error('The Place was created, but the response did not include the expected Waypoint and Place details.')
      }

      setWaypoints((current) => current.map((waypoint) => String(waypoint.id) === String(returnedWaypointId)
        ? {
            ...waypoint,
            place_id: placeId,
            place_name: place.name || place.title || '',
          }
        : waypoint))
      setSavedWaypointSignature((current) => {
        const savedWaypoints = JSON.parse(current)
        return JSON.stringify(savedWaypoints.map((waypoint) => String(waypoint.id) === String(returnedWaypointId)
          ? { ...waypoint, place_id: placeId }
          : waypoint))
      })
      setPlaces((current) => {
        const existingIndex = current.findIndex((item) => String(item.id) === String(place.id))
        if (existingIndex < 0) return [...current, place]
        return current.map((item, index) => index === existingIndex ? place : item)
      })
      await refreshCanonicalMap()
      setNotice('Place created and linked to the Waypoint.')
      setError('')
      return { success: true }
    } catch (err) {
      if (err?.response?.status === 409) await refreshAfterRevisionConflict(err)
      return getPlaceCreateErrors(err)
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
      if (routeMapData.mapRevision !== undefined && routeMapData.mapRevision !== null) setMapRevision(routeMapData.mapRevision)
      await refreshCanonicalMap()
      setNotice(String(selectedWaypoint.id).startsWith('new-') ? 'Waypoint added.' : 'Waypoint saved.')
      setQuickAddPlaceId('')
      setAddMode(false)
    } catch (err) {
      if (!(await refreshAfterRevisionConflict(err))) setError(getErrorMessage(err, 'Unable to save this waypoint.'))
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
      {hasUnsavedChanges && (
        <div className="management-empty route-map-notice" role="status">
          Waypoint changes are not saved. Save them before editing connections.
          <button type="button" className="primary-button small-button" onClick={saveRouteMap} disabled={saving}>Save waypoint changes</button>
        </div>
      )}
      {connections.length > 0 && (!isMapRenderable || connections.some(({ segment }) => !segment.geometry)) && (
        <div className="management-empty route-map-notice" role="status">Route incomplete — unresolved connections must be resolved before the Route geometry can be rendered.</div>
      )}
      {addMode && <div className="management-empty route-map-notice" role="status">Map click mode is active. Click the map to add the next waypoint.</div>}

      <div className="route-map-toolbar" role="toolbar" aria-label="Route map editor tools">
        <button type="button" className={activePanel === 'waypoints' ? 'route-map-tool is-active' : 'route-map-tool'} onClick={() => togglePanel('waypoints')} aria-expanded={activePanel === 'waypoints'}>
          Waypoints <span>{waypoints.length}</span>
        </button>
        <button type="button" className={activePanel === 'videos' ? 'route-map-tool is-active' : 'route-map-tool'} onClick={() => togglePanel('videos')} aria-expanded={activePanel === 'videos'}>
          + Add video
        </button>
        <button type="button" className={activePanel === 'connections' ? 'route-map-tool is-active' : 'route-map-tool'} onClick={() => togglePanel('connections')} aria-expanded={activePanel === 'connections'}>Connections <span>{connections.length}</span></button>
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
            foodWaypointId={foodWaypointId}
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
            onOpenFood={openWaypointFood}
            onFoodIdsChange={updateWaypointFoodIds}
            onMediaChange={updateWaypointMedia}
            onGalleryAttach={(waypointId, collection) => updateWaypointGallery(waypointId, collection, true)}
            onGalleryDetach={(waypointId, collection) => updateWaypointGallery(waypointId, collection, false)}
            onMove={moveWaypoint}
            onRemove={removeWaypoint}
            onCreatePlace={createPlaceFromWaypoint}
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

      {activePanel === 'connections' && (
        <SegmentList
          connections={connections}
        routeComplete={isMapRenderable && connections.length > 0 && connections.every(({ segment }) => Boolean(segment.geometry))}
          selectedConnectionId={selectedConnectionId}
          profile={routingProfile}
          editingDisabled={editingDisabled}
          calculating={calculating}
          saving={saving}
          drawing={manualDrawing}
          preview={connectionPreview}
          waypointMovePreview={waypointMovePreview}
          onSelect={selectConnection}
          onProfileChange={setRoutingProfile}
          onCalculate={() => calculateConnectionCandidate()}
          onStartManual={startManualConnectionDrawing}
          onUndoManualPoint={undoManualPoint}
          onFinishManual={finishManualConnectionDrawing}
          onCancelManual={cancelManualConnectionDrawing}
          onStraight={previewStraightConnection}
          onAcceptPreview={saveConnectionPreview}
          onCancelPreview={() => { setConnectionPreview(null); setNotice(''); setError('') }}
          onRecalculate={() => calculateConnectionCandidate(selectedConnection?.id, connectionPreview?.profile || routingProfile)}
          onSaveWaypointMove={saveWaypointMove}
          onCancelWaypointMove={() => { setWaypointMovePreview(null); setNotice('Waypoint movement cancelled.') }}
        />
      )}

      <div className="route-map-main-column">
        <RouteAuthoringMap
          waypoints={waypoints}
          places={places}
          connections={connections}
          candidateGeometry={connectionPreview?.mode === 'calculated' ? connectionPreview.geometry : null}
          previewGeometry={connectionPreview && connectionPreview.mode !== 'calculated' ? connectionPreview.geometry : null}
          selectedSegmentId={selectedConnectionId}
          selectedWaypointId={selectedWaypointId}
          addMode={addMode}
          onSegmentSelect={selectConnection}
          onWaypointSelect={selectWaypoint}
          manualDrawing={manualDrawing && drawingConnection ? { startWaypoint: drawingConnection.start, endWaypoint: drawingConnection.end, points: manualDrawing.points } : null}
          waypointMovePreview={waypointMovePreview}
          canDragWaypoints={!hasUnsavedChanges && !saving && !connectionPreview && !manualDrawing && !waypointMovePreview}
          onWaypointDragStart={() => { setConnectionPreview(null); setManualDrawing(null) }}
          onWaypointDragEnd={finishWaypointDrag}
          onMapAddWaypoint={addWaypointFromMap}
          onManualDrawPoint={addManualCandidatePoint}
        />
        <RouteGeometryLegend />
      </div>
    </section>
  )
}

export default RouteMapEditorPage
