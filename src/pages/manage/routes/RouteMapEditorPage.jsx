import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import RouteAuthoringMap from '../../../features/map/components/RouteAuthoringMap.jsx'
import RouteCandidateSummary from '../../../features/routes/routeMap/components/RouteCandidateSummary.jsx'
import RouteGeometryLegend from '../../../features/routes/routeMap/components/RouteGeometryLegend.jsx'
import RouteMapActions from '../../../features/routes/routeMap/components/RouteMapActions.jsx'
import WaypointEditor from '../../../features/routes/routeMap/components/WaypointEditor.jsx'
import WaypointList from '../../../features/routes/routeMap/components/WaypointList.jsx'
import { createEmptyWaypoint, normalizeRouteMap, normalizeWaypoints, validateWaypoints } from '../../../features/routes/routeMap/routeMapUtils.js'
import { managementApis } from '../../../services/management/index.js'
import { routeMapApi } from '../../../services/management/routeMapApi.js'

function getErrorMessage(err, fallback) {
  const responseData = err?.response?.data
  if (typeof responseData?.detail === 'string') {
    return responseData.detail
  }
  if (Array.isArray(responseData?.non_field_errors)) {
    return responseData.non_field_errors.join(' ')
  }
  return fallback
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
          routeMapApi.get(routeId),
          managementApis.places.list(),
        ])

        if (!active) return

        const normalizedMap = normalizeRouteMap(routeMapData)
        setRoute(routeData)
        setPlaces(placesData)
        setWaypoints(normalizedMap.waypoints)
        setAcceptedGeometry(normalizedMap.acceptedGeometry)
        setCandidate(normalizedMap.candidate)
        setMapRevision(normalizedMap.mapRevision)
        setUpdatedAt(normalizedMap.updatedAt)
        setSelectedWaypointId(normalizedMap.waypoints[0]?.id || '')
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

  const applyRouteMap = (routeMapData) => {
    const normalizedMap = normalizeRouteMap(routeMapData)
    setWaypoints(normalizedMap.waypoints)
    setAcceptedGeometry(normalizedMap.acceptedGeometry)
    setCandidate(normalizedMap.candidate)
    setMapRevision(normalizedMap.mapRevision)
    setUpdatedAt(normalizedMap.updatedAt)
    setSelectedWaypointId((current) => normalizedMap.waypoints.some((waypoint) => waypoint.id === current) ? current : normalizedMap.waypoints[0]?.id || '')
  }

  const updateWaypoint = (nextWaypoint) => {
    setWaypoints((current) => normalizeWaypoints(current.map((waypoint) => waypoint.id === nextWaypoint.id ? nextWaypoint : waypoint)))
  }

  const addWaypoint = () => {
    setWaypoints((current) => {
      const nextWaypoint = createEmptyWaypoint(current.length + 1)
      setSelectedWaypointId(nextWaypoint.id)
      return normalizeWaypoints([...current, nextWaypoint])
    })
  }

  const removeWaypoint = (waypointId) => {
    setWaypoints((current) => {
      const nextWaypoints = normalizeWaypoints(current.filter((waypoint) => waypoint.id !== waypointId))
      if (selectedWaypointId === waypointId) {
        setSelectedWaypointId(nextWaypoints[0]?.id || '')
      }
      return nextWaypoints
    })
  }

  const moveWaypoint = (index, direction) => {
    setWaypoints((current) => {
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= current.length) {
        return current
      }
      const nextWaypoints = [...current]
      const movingWaypoint = nextWaypoints[index]
      nextWaypoints[index] = nextWaypoints[targetIndex]
      nextWaypoints[targetIndex] = movingWaypoint
      return normalizeWaypoints(nextWaypoints)
    })
  }

  const updateWaypointPosition = (waypointId, coordinates) => {
    setWaypoints((current) => normalizeWaypoints(current.map((waypoint) => waypoint.id === waypointId ? {
      ...waypoint,
      latitude: String(coordinates.latitude),
      longitude: String(coordinates.longitude),
    } : waypoint)))
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
      const routeMapData = await routeMapApi.update(routeId, { waypoints, acceptedGeometry, mapRevision })
      applyRouteMap(routeMapData)
      setNotice('Route map saved.')
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to save this route map.'))
    } finally {
      setSaving(false)
    }
  }

  const calculateCandidate = async () => {
    const validation = validateWaypoints(waypoints)
    if (!validation.valid) {
      setError(validation.message)
      return
    }

    try {
      setCalculating(true)
      setError('')
      setNotice('')
      const routeMapData = await routeMapApi.calculateCandidate(routeId, waypoints)
      applyRouteMap(routeMapData)
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

    try {
      setAccepting(true)
      setError('')
      setNotice('')
      const routeMapData = await routeMapApi.acceptCandidate(routeId, candidate.geometry)
      applyRouteMap(routeMapData)
      setNotice('Candidate accepted as route geometry.')
    } catch (err) {
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

      {error && <div className="management-error">{error}</div>}
      {notice && <div className="management-empty route-map-notice">{notice}</div>}

      <div className="route-map-editor-layout">
        <div className="route-map-main-column">
          <RouteAuthoringMap
            waypoints={waypoints}
            acceptedGeometry={acceptedGeometry}
            candidateGeometry={candidate?.geometry}
            selectedWaypointId={selectedWaypointId}
            onWaypointSelect={setSelectedWaypointId}
            onWaypointPositionChange={updateWaypointPosition}
          />
          <RouteGeometryLegend />
          <RouteCandidateSummary acceptedGeometry={acceptedGeometry} candidate={candidate} mapRevision={mapRevision} updatedAt={updatedAt} />
        </div>

        <div className="route-map-side-column">
          <WaypointList
            waypoints={waypoints}
            selectedWaypointId={selectedWaypointId}
            onAdd={addWaypoint}
            onSelect={setSelectedWaypointId}
            onMove={moveWaypoint}
            onRemove={removeWaypoint}
          />
          <WaypointEditor waypoint={selectedWaypoint} places={places} onChange={updateWaypoint} />
          <RouteMapActions
            calculating={calculating}
            saving={saving}
            accepting={accepting}
            hasCandidate={Boolean(candidate?.geometry)}
            onSave={saveRouteMap}
            onCalculate={calculateCandidate}
            onAccept={acceptCandidate}
          />
        </div>
      </div>
    </section>
  )
}

export default RouteMapEditorPage
