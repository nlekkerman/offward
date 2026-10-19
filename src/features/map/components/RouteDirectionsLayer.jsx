import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { Circle, Marker, Polyline, useMap } from 'react-leaflet'
import useUserLocation from '../../../shared/hooks/useUserLocation.js'
import { getRouteDirections, getStraightLineDistanceKm, MAX_LOCAL_DIRECTIONS_KM } from '../../../services/routeDirectionsApi.js'

const ACCURACY_CIRCLE_STYLE = {
  color: '#d8b47c',
  weight: 1,
  opacity: 0.55,
  fillColor: '#d8b47c',
  fillOpacity: 0.12,
}

const NAVIGATION_PATH_STYLE = {
  color: '#438bd1',
  weight: 6,
  opacity: 0.95,
  lineCap: 'round',
  lineJoin: 'round',
}
const NAVIGATION_PATH_PANE = 'route-directions-pane'

function NavigationPathPaneController() {
  const map = useMap()

  useEffect(() => {
    if (map.getPane(NAVIGATION_PATH_PANE)) return
    const pane = map.createPane(NAVIGATION_PATH_PANE)
    pane.style.zIndex = '450'
    pane.style.pointerEvents = 'none'
  }, [map])

  return null
}

function DirectionsViewportController({ active, position, navigationPositions }) {
  const map = useMap()
  const hasFittedRef = useRef(false)

  useEffect(() => {
    if (!active) {
      hasFittedRef.current = false
      return
    }
    if (!position || !navigationPositions || hasFittedRef.current) return

    hasFittedRef.current = true
    map.fitBounds([
      [position.latitude, position.longitude],
      ...navigationPositions,
    ], {
      padding: [50, 50],
      maxZoom: 13,
      animate: false,
    })
  }, [active, map, navigationPositions, position])

  return null
}

function RouteDirectionsLayer({ active, startCoordinates, mode, onStatusChange, onError }) {
  const { position, error, start, stop } = useUserLocation()
  const requestedModeRef = useRef(null)
  const currentModeRef = useRef(null)
  const tooFarModeRef = useRef(null)
  const requestControllerRef = useRef(null)
  const [navigationResult, setNavigationResult] = useState(null)

  useEffect(() => {
    if (active) {
      start()
      return
    }
    stop()
  }, [active, start, stop])

  useEffect(() => {
    if (error) onError(error)
  }, [error, onError])

  useEffect(() => {
    if (!active || !position) return

    if (currentModeRef.current !== mode) {
      requestControllerRef.current?.abort()
      requestControllerRef.current = null
      requestedModeRef.current = null
      tooFarModeRef.current = null
      currentModeRef.current = mode
      setNavigationResult(null)
    }

    if (requestedModeRef.current === mode) return

    const straightLineDistanceKm = getStraightLineDistanceKm(position, startCoordinates)
    if (straightLineDistanceKm > MAX_LOCAL_DIRECTIONS_KM) {
      if (tooFarModeRef.current !== mode) {
        tooFarModeRef.current = mode
        onStatusChange({ status: 'too-far', straightLineDistanceKm })
      }
      return
    }

    tooFarModeRef.current = null
    requestedModeRef.current = mode
    const controller = new AbortController()
    requestControllerRef.current = controller
    onStatusChange({ status: 'routing' })

    getRouteDirections(position, startCoordinates, mode, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        const navigationPositions = result.coordinates.map(([longitude, latitude]) => [latitude, longitude])
        setNavigationResult({ navigationPositions, distanceMeters: result.distanceMeters })
        onStatusChange({ status: 'ready', distanceMeters: result.distanceMeters })
      })
      .catch((routingError) => {
        if (controller.signal.aborted || routingError?.name === 'AbortError') return
        onStatusChange({
          status: 'error',
          message: routingError instanceof Error
            ? routingError.message
            : 'The routing service could not calculate directions. Please try again.',
        })
      })
  }, [active, mode, onStatusChange, position, startCoordinates])

  useEffect(() => () => {
    requestControllerRef.current?.abort()
    stop()
  }, [stop])

  const userLocationIcon = useMemo(() => L.divIcon({
    className: 'offward-user-location-icon',
    html: '<span class="offward-user-location-marker"><span class="offward-user-location-dot"></span><span class="offward-user-location-label">You are here</span></span>',
    iconSize: [108, 32],
    iconAnchor: [14, 16],
  }), [])

  if (!active || !position) {
    return (
      <>
        <NavigationPathPaneController />
        <DirectionsViewportController active={active} position={null} navigationPositions={null} />
      </>
    )
  }

  const accuracy = position.accuracy
  const hasAccuracy = typeof accuracy === 'number' && Number.isFinite(accuracy) && accuracy > 0
  const markerPosition = [position.latitude, position.longitude]

  return (
    <>
      <NavigationPathPaneController />
      <DirectionsViewportController
        active={active}
        position={position}
        navigationPositions={navigationResult?.navigationPositions || null}
      />
      {hasAccuracy && (
        <Circle
          center={markerPosition}
          radius={accuracy}
          pathOptions={ACCURACY_CIRCLE_STYLE}
        />
      )}
      <Marker
        position={markerPosition}
        icon={userLocationIcon}
        title="You are here"
        alt="Your current location"
        keyboard={false}
        zIndexOffset={1000}
      />
      {navigationResult && (
        <Polyline
          positions={navigationResult.navigationPositions}
          pathOptions={NAVIGATION_PATH_STYLE}
          pane={NAVIGATION_PATH_PANE}
          interactive={false}
        />
      )}
    </>
  )
}

export default RouteDirectionsLayer
