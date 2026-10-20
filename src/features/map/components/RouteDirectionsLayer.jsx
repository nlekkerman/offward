import { useEffect, useRef, useState } from 'react'
import { Polyline, useMap } from 'react-leaflet'
import { getRouteDirections, getStraightLineDistanceKm, MAX_LOCAL_DIRECTIONS_KM } from '../../../services/routeDirectionsApi.js'

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

function RouteDirectionsLayer({ active, position, routeSlug, startCoordinates, mode, onStatusChange }) {
  const requestedModeRef = useRef(null)
  const currentModeRef = useRef(null)
  const tooFarModeRef = useRef(null)
  const requestControllerRef = useRef(null)
  const wasActiveRef = useRef(false)
  const [navigationResult, setNavigationResult] = useState(null)

  useEffect(() => {
    if (!active) {
      if (wasActiveRef.current) {
        requestControllerRef.current?.abort()
        requestControllerRef.current = null
        requestedModeRef.current = null
        currentModeRef.current = null
        tooFarModeRef.current = null
        setNavigationResult(null)
      }
      wasActiveRef.current = false
      return
    }
    wasActiveRef.current = true
  }, [active])

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

    getRouteDirections(routeSlug, { lat: position.latitude, lng: position.longitude }, mode, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        const navigationPositions = result.geometry.coordinates.map(([longitude, latitude]) => [latitude, longitude])
        setNavigationResult({ navigationPositions, distanceKm: result.distance_km })
        onStatusChange({ status: 'ready', distanceKm: result.distance_km })
      })
      .catch((routingError) => {
        if (controller.signal.aborted || routingError?.name === 'AbortError' || routingError?.code === 'ERR_CANCELED') return
        onStatusChange({
          status: 'error',
          message: routingError instanceof Error
            ? routingError.message
            : 'Offward could not calculate directions. Please try again.',
        })
      })
  }, [active, mode, onStatusChange, position, routeSlug, startCoordinates])

  useEffect(() => () => requestControllerRef.current?.abort(), [])

  if (!active || !position) {
    return (
      <>
        <NavigationPathPaneController />
        <DirectionsViewportController active={active} position={null} navigationPositions={null} />
      </>
    )
  }

  return (
    <>
      <NavigationPathPaneController />
      <DirectionsViewportController
        active={active}
        position={position}
        navigationPositions={navigationResult?.navigationPositions || null}
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
