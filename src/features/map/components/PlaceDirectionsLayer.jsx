import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { Marker, Polyline, Popup, useMap } from 'react-leaflet'
import { getPlaceDirections, getStraightLineDistanceKm } from '../../../services/routeDirectionsApi.js'

const WALKING_RANGE_KM = 1
const ARRIVAL_RADIUS_METERS = 35
const NAVIGATION_PATH_PANE = 'route-directions-pane'
const DRIVING_PATH_STYLE = {
  color: '#438bd1',
  weight: 6,
  opacity: 0.95,
  lineCap: 'round',
  lineJoin: 'round',
}
const WALKING_PATH_STYLE = {
  color: '#e28a3b',
  weight: 5,
  opacity: 0.95,
  dashArray: '10 9',
  lineCap: 'round',
  lineJoin: 'round',
}

function toLeafletPositions(geometry) {
  return geometry.coordinates.map(([longitude, latitude]) => [latitude, longitude])
}

function createDirectionsMarkerIcon() {
  return L.divIcon({
    className: 'place-directions-start-marker',
    html: '<span aria-hidden="true"></span>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

function DirectionsPaneController() {
  const map = useMap()

  useEffect(() => {
    if (map.getPane(NAVIGATION_PATH_PANE)) return
    const pane = map.createPane(NAVIGATION_PATH_PANE)
    pane.style.zIndex = '450'
    pane.style.pointerEvents = 'none'
  }, [map])

  return null
}

function DirectionsViewportController({ active, routeReady, position, drivingPositions, walkingPositions, markerPosition, placePosition }) {
  const map = useMap()
  const hasFittedRef = useRef(false)

  useEffect(() => {
    if (!active) {
      hasFittedRef.current = false
      return
    }
    if (!position || !walkingPositions || !routeReady || hasFittedRef.current) return

    hasFittedRef.current = true
    map.fitBounds([
      [position.latitude, position.longitude],
      ...walkingPositions,
      ...(drivingPositions || []),
      markerPosition,
      placePosition,
    ], {
      padding: [42, 42],
      maxZoom: 14,
      animate: false,
    })
  }, [active, drivingPositions, map, markerPosition, placePosition, position, routeReady, walkingPositions])

  return null
}

function PlaceDirectionsLayer({
  active,
  phase,
  onPhaseChange,
  position,
  placeSlug,
  placeCoordinates,
  accessGeometry,
  markerCoordinates,
  markerName,
  markerDescription,
  onStatusChange,
}) {
  const [drivingResult, setDrivingResult] = useState(null)
  const [drivingAttemptComplete, setDrivingAttemptComplete] = useState(false)
  const drivingRequestStartedRef = useRef(false)
  const drivingControllerRef = useRef(null)
  const statusCallbackRef = useRef(onStatusChange)
  const phaseCallbackRef = useRef(onPhaseChange)
  const wasActiveRef = useRef(false)

  useEffect(() => {
    statusCallbackRef.current = onStatusChange
    phaseCallbackRef.current = onPhaseChange
  }, [onPhaseChange, onStatusChange])

  const walkingPositions = useMemo(() => toLeafletPositions(accessGeometry), [accessGeometry])
  const markerPosition = [markerCoordinates.latitude, markerCoordinates.longitude]
  const placePosition = [placeCoordinates.lat, placeCoordinates.lng]
  const directionsMarkerIcon = useMemo(createDirectionsMarkerIcon, [])

  useEffect(() => {
    if (!active) {
      if (wasActiveRef.current) {
        drivingControllerRef.current?.abort()
        drivingControllerRef.current = null
        drivingRequestStartedRef.current = false
        setDrivingAttemptComplete(false)
        setDrivingResult(null)
      }
      wasActiveRef.current = false
      return
    }
    wasActiveRef.current = true
  }, [active])

  useEffect(() => {
    if (!active || !position || phase) return
    const distanceKm = getStraightLineDistanceKm(position, {
      lat: markerCoordinates.latitude,
      lng: markerCoordinates.longitude,
    })

    if (distanceKm <= WALKING_RANGE_KM) {
      statusCallbackRef.current({ status: 'ready' })
      phaseCallbackRef.current('walking')
      return
    }

    phaseCallbackRef.current('driving')
  }, [active, markerCoordinates.latitude, markerCoordinates.longitude, phase, position])

  useEffect(() => {
    if (!active || phase !== 'driving' || !position || drivingRequestStartedRef.current) return

    drivingRequestStartedRef.current = true
    const controller = new AbortController()
    drivingControllerRef.current = controller
    statusCallbackRef.current({ status: 'routing' })
    getPlaceDirections(
      placeSlug,
      { lat: position.latitude, lng: position.longitude },
      'driving',
      controller.signal,
    ).then((result) => {
      if (controller.signal.aborted) return
      const navigationPositions = toLeafletPositions(result.geometry)
      setDrivingResult({ navigationPositions, distanceKm: result.distance_km })
      setDrivingAttemptComplete(true)
      statusCallbackRef.current({ status: 'ready', distanceKm: result.distance_km })
      drivingControllerRef.current = null
    }).catch((error) => {
      if (controller.signal.aborted || error?.name === 'AbortError' || error?.code === 'ERR_CANCELED') return
      drivingControllerRef.current = null
      setDrivingAttemptComplete(true)
      statusCallbackRef.current({
        status: 'error',
        message: error instanceof Error
          ? error.message
          : 'Offward could not calculate directions. Please try again.',
      })
    })
  }, [active, phase, placeSlug, position])

  useEffect(() => {
    if (active && phase === 'driving') return
    drivingControllerRef.current?.abort()
    drivingControllerRef.current = null
  }, [active, phase])

  useEffect(() => {
    if (!active || phase !== 'driving' || !position) return
    const accuracy = position.accuracy
    if (typeof accuracy !== 'number' || !Number.isFinite(accuracy) || accuracy <= 0 || accuracy > ARRIVAL_RADIUS_METERS) return
    const distanceMeters = getStraightLineDistanceKm(position, {
      lat: markerCoordinates.latitude,
      lng: markerCoordinates.longitude,
    }) * 1000
    if (distanceMeters <= ARRIVAL_RADIUS_METERS) {
      phaseCallbackRef.current('walking-after-driving')
    }
  }, [active, markerCoordinates.latitude, markerCoordinates.longitude, phase, position])

  useEffect(() => () => {
    drivingControllerRef.current?.abort()
    drivingRequestStartedRef.current = false
  }, [])

  if (!active) return <DirectionsPaneController />

  const visibleDrivingPositions = phase === 'driving' ? drivingResult?.navigationPositions : null

  return (
    <>
      <DirectionsPaneController />
      <DirectionsViewportController
        active={active}
        routeReady={phase !== 'driving' || drivingAttemptComplete}
        position={position}
        drivingPositions={visibleDrivingPositions}
        walkingPositions={walkingPositions}
        markerPosition={markerPosition}
        placePosition={placePosition}
      />
      <Polyline
        positions={walkingPositions}
        pathOptions={WALKING_PATH_STYLE}
        pane={NAVIGATION_PATH_PANE}
        interactive={false}
      />
      {visibleDrivingPositions && (
        <Polyline
          positions={visibleDrivingPositions}
          pathOptions={DRIVING_PATH_STYLE}
          pane={NAVIGATION_PATH_PANE}
          interactive={false}
        />
      )}
      <Marker
        position={markerPosition}
        icon={directionsMarkerIcon}
        title={markerName}
        alt={markerName}
      >
        <Popup>
          <strong>{markerName}</strong>
          {markerDescription && <p>{markerDescription}</p>}
        </Popup>
      </Marker>
    </>
  )
}

export default PlaceDirectionsLayer
