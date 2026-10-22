import { useEffect, useRef, useState } from 'react'
import { Polyline, useMap } from 'react-leaflet'
import { getRouteAccessDirections, getRouteDirections, getStraightLineDistanceKm, MAX_LOCAL_DIRECTIONS_KM } from '../../../services/routeDirectionsApi.js'

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
    if (!navigationPositions) {
      hasFittedRef.current = false
      return
    }
    if (!position || hasFittedRef.current) return

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

function RouteDirectionsLayer({
  active,
  position,
  routeSlug,
  routeId,
  requestId = 0,
  startCoordinates,
  mode,
  destination = 'start',
  onStatusChange,
  requestDirections,
}) {
  const requestedKeyRef = useRef(null)
  const currentKeyRef = useRef(null)
  const tooFarKeyRef = useRef(null)
  const requestControllerRef = useRef(null)
  const wasActiveRef = useRef(false)
  const [navigationResult, setNavigationResult] = useState(null)
  const requestKey = `${routeSlug}:${requestId}:${destination}:${mode}`
  const latestRequestKeyRef = useRef(requestKey)
  const activeRef = useRef(active)
  latestRequestKeyRef.current = requestKey
  activeRef.current = active

  useEffect(() => {
    if (!active) {
      if (wasActiveRef.current) {
        requestControllerRef.current?.abort()
        requestControllerRef.current = null
        requestedKeyRef.current = null
        currentKeyRef.current = null
        tooFarKeyRef.current = null
        setNavigationResult(null)
      }
      wasActiveRef.current = false
      return
    }
    wasActiveRef.current = true
  }, [active])

  useEffect(() => {
    if (!active) return

    if (currentKeyRef.current !== requestKey) {
      requestControllerRef.current?.abort()
      requestControllerRef.current = null
      requestedKeyRef.current = null
      tooFarKeyRef.current = null
      currentKeyRef.current = requestKey
      setNavigationResult(null)
    }

    if (!position) return
    if (requestedKeyRef.current === requestKey) return

    if (destination === 'start') {
      if (!startCoordinates) {
        onStatusChange({ status: 'error', message: 'This Route does not have a valid starting waypoint.' })
        return
      }
      const straightLineDistanceKm = getStraightLineDistanceKm(position, startCoordinates)
      if (straightLineDistanceKm > MAX_LOCAL_DIRECTIONS_KM) {
        if (tooFarKeyRef.current !== requestKey) {
          tooFarKeyRef.current = requestKey
          onStatusChange({ status: 'too-far', straightLineDistanceKm })
        }
        return
      }
    }

    if (destination === 'access' && mode !== 'walking') {
      onStatusChange({ status: 'error', message: 'Walking access directions require Walking mode.' })
      return
    }

    tooFarKeyRef.current = null
    requestedKeyRef.current = requestKey
    const controller = new AbortController()
    requestControllerRef.current = controller
    onStatusChange({ status: 'routing' })

    const origin = { lat: position.latitude, lng: position.longitude }
    const request = destination === 'access'
      ? getRouteAccessDirections(routeSlug, routeId, origin, controller.signal)
      : requestDirections
        ? requestDirections(routeSlug, origin, mode, controller.signal)
        : getRouteDirections(routeSlug, origin, mode, controller.signal)

    request
      .then((result) => {
        if (
          !activeRef.current ||
          latestRequestKeyRef.current !== requestKey ||
          controller.signal.aborted ||
          requestControllerRef.current !== controller ||
          currentKeyRef.current !== requestKey
        ) return
        const geometry = destination === 'access' ? result.approach.geometry : result.geometry
        const navigationPositions = geometry.coordinates.map(([longitude, latitude]) => [latitude, longitude])
        const nextNavigationResult = {
          navigationPositions,
          distanceKm: destination === 'access' ? result.approach.distance_km : result.distance_km,
          destination,
          fallback: destination === 'access' ? result.fallback : null,
        }
        setNavigationResult(nextNavigationResult)
        onStatusChange({
          status: 'ready',
          distanceKm: nextNavigationResult.distanceKm,
          destination,
          fallback: nextNavigationResult.fallback,
        })
      })
      .catch((routingError) => {
        if (
          !activeRef.current ||
          latestRequestKeyRef.current !== requestKey ||
          controller.signal.aborted ||
          requestControllerRef.current !== controller ||
          routingError?.name === 'AbortError' ||
          routingError?.code === 'ERR_CANCELED'
        ) return
        onStatusChange({
          status: 'error',
          message: routingError instanceof Error
            ? routingError.message
            : 'Offward could not calculate directions. Please try again.',
        })
      })
  }, [active, destination, mode, onStatusChange, position, requestDirections, requestKey, routeId, routeSlug, startCoordinates])

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
