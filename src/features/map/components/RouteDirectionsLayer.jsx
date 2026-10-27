import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { Marker, Polyline, useMap } from 'react-leaflet'
import { getRouteAccessDirections, getRouteDirections, getStraightLineDistanceKm, MAX_LOCAL_DIRECTIONS_KM } from '../../../services/routeDirectionsApi.js'

const NAVIGATION_PATH_STYLE = {
  color: '#438bd1',
  weight: 6,
  opacity: 0.95,
  lineCap: 'round',
  lineJoin: 'round',
}
export const ROUTE_WALKING_PATH_COLORS = ['#FFD166', '#E76F51', '#B388EB']
const NAVIGATION_PATH_PANE = 'route-directions-pane'
const ROUTE_ACCESS_MARKER_ICON = L.divIcon({
  className: 'route-access-marker-icon',
  html: '<span class="route-access-marker-dot"></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

function NavigationPathPaneController() {
  const map = useMap()

  useEffect(() => {
    if (map.getPane(NAVIGATION_PATH_PANE)) return
    const pane = map.createPane(NAVIGATION_PATH_PANE)
    pane.style.zIndex = '450'
    pane.style.pointerEvents = 'auto'
  }, [map])

  return null
}

function DirectionsViewportController({ active, position, navigationPositionSets }) {
  const map = useMap()
  const hasFittedRef = useRef(false)

  useEffect(() => {
    if (!active) {
      hasFittedRef.current = false
      return
    }
    if (!navigationPositionSets.length) {
      hasFittedRef.current = false
      return
    }
    if (!position || hasFittedRef.current) return

    hasFittedRef.current = true
    map.fitBounds([
      [position.latitude, position.longitude],
      ...navigationPositionSets.flat(),
    ], {
      padding: [50, 50],
      maxZoom: 13,
      animate: false,
    })
  }, [active, map, navigationPositionSets, position])

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
  selectedAlternativeId = null,
  onPathSelect,
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

    tooFarKeyRef.current = null
    requestedKeyRef.current = requestKey
    const controller = new AbortController()
    requestControllerRef.current = controller
    onStatusChange({ status: 'routing' })

    const origin = { lat: position.latitude, lng: position.longitude }
    const request = destination === 'access'
      ? getRouteAccessDirections(routeSlug, routeId, origin, mode, controller.signal)
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
        const recommendedApproach = destination === 'access'
          ? result.approach
          : { geometry: result.geometry, distance_km: result.distance_km, duration_seconds: result.duration_seconds }
        const alternatives = destination === 'access' && mode === 'walking' ? result.alternatives : []
        const pathOptions = [
          {
            id: null,
            name: 'Recommended',
            distanceKm: recommendedApproach.distance_km,
            durationSeconds: recommendedApproach.duration_seconds,
            color: ROUTE_WALKING_PATH_COLORS[0],
            access: destination === 'access' ? result.access : null,
          },
          ...alternatives.map((alternative, index) => ({
            id: alternative.id,
            name: `Alternative ${index + 1}`,
            distanceKm: alternative.approach.distance_km,
            durationSeconds: alternative.approach.duration_seconds,
            color: ROUTE_WALKING_PATH_COLORS[index + 1],
            access: alternative.access,
          })),
        ]
        setNavigationResult({
          requestKey,
          recommendedApproach,
          alternatives,
          pathOptions,
          destination,
        })
        onStatusChange({
          status: 'ready',
          distanceKm: recommendedApproach.distance_km,
          durationSeconds: recommendedApproach.duration_seconds,
          recommended: {
            distanceKm: recommendedApproach.distance_km,
            durationSeconds: recommendedApproach.duration_seconds,
            name: pathOptions[0].name,
            color: pathOptions[0].color,
          },
          alternatives: pathOptions.slice(1),
          destination,
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

  const currentNavigationResult = navigationResult?.requestKey === requestKey ? navigationResult : null
  const isRouteAccess = currentNavigationResult?.destination === 'access'
  const isWalkingAccess = isRouteAccess && mode === 'walking'
  const selectedAccess = isRouteAccess
    ? selectedAlternativeId
      ? currentNavigationResult.alternatives.find((alternative) => alternative.id === selectedAlternativeId)?.access
      : currentNavigationResult.pathOptions[0].access
    : null
  const navigationPaths = isWalkingAccess
    ? [
        {
          id: null,
          geometry: currentNavigationResult.recommendedApproach.geometry,
          color: ROUTE_WALKING_PATH_COLORS[0],
        },
        ...currentNavigationResult.alternatives.map((alternative, index) => ({
          id: alternative.id,
          geometry: alternative.approach.geometry,
          color: ROUTE_WALKING_PATH_COLORS[index + 1],
        })),
      ]
    : currentNavigationResult
      ? [{ id: null, geometry: currentNavigationResult.recommendedApproach.geometry, color: NAVIGATION_PATH_STYLE.color }]
      : []
  const navigationPositionSets = navigationPaths.map((path) => path.geometry.coordinates.map(
    ([longitude, latitude]) => [latitude, longitude],
  ))

  if (!active || !position) {
    return (
      <>
        <NavigationPathPaneController />
        <DirectionsViewportController active={active} position={null} navigationPositionSets={[]} />
      </>
    )
  }

  return (
    <>
      <NavigationPathPaneController />
      <DirectionsViewportController
        active={active}
        position={position}
        navigationPositionSets={navigationPositionSets}
      />
      {isWalkingAccess && navigationPaths.map((path) => {
        const selectPath = () => onPathSelect?.(path.id)
        const eventHandlers = { click: selectPath }

        return (
          <Polyline
            key={`${path.id || 'recommended'}-hit-area`}
            positions={path.geometry.coordinates.map(
              ([longitude, latitude]) => [latitude, longitude],
            )}
            pathOptions={{
              color: path.color,
              weight: 24,
              opacity: 0.01,
              dashArray: null,
              bubblingMouseEvents: false,
            }}
            pane={NAVIGATION_PATH_PANE}
            eventHandlers={eventHandlers}
          />
        )
      })}
      {isWalkingAccess
        ? navigationPaths.map((path, index) => {
            const isSelected = path.id === selectedAlternativeId
            const isRecommended = path.id === null
            const positions = navigationPositionSets[index]
            const dashArray = isRecommended ? null : index === 1 ? '9 7' : '2 6'
            const pathOptions = {
              color: path.color,
              weight: isSelected ? 9 : isRecommended ? 7 : 6,
              opacity: isSelected ? 1 : isRecommended ? 0.88 : 0.68,
              dashArray,
              lineCap: 'round',
              lineJoin: 'round',
              bubblingMouseEvents: false,
            }

            return (
              <Polyline
                key={path.id || 'recommended'}
                positions={positions}
                pathOptions={pathOptions}
                pane={NAVIGATION_PATH_PANE}
                eventHandlers={{ click: () => onPathSelect?.(path.id) }}
              />
            )
          })
        : navigationPositionSets[0] && (
            <Polyline
              positions={navigationPositionSets[0]}
              pathOptions={NAVIGATION_PATH_STYLE}
              pane={NAVIGATION_PATH_PANE}
              interactive={false}
            />
          )}
      {selectedAccess?.coordinates && (
        <Marker
          position={[selectedAccess.coordinates.lat, selectedAccess.coordinates.lng]}
          icon={ROUTE_ACCESS_MARKER_ICON}
          title="Selected Route access point"
          alt="Selected Route access point"
          keyboard={false}
          zIndexOffset={800}
        />
      )}
    </>
  )
}

export default RouteDirectionsLayer
