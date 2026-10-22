import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { Marker, Polyline, Popup, useMap } from 'react-leaflet'
import { getPlaceDirections, getStraightLineDistanceKm } from '../../../services/routeDirectionsApi.js'

const ARRIVAL_RADIUS_METERS = 35
const NAVIGATION_PATH_PANE = 'route-directions-pane'
const DRIVING_PATH_STYLE = {
  color: '#438bd1',
  weight: 6,
  opacity: 0.95,
  lineCap: 'round',
  lineJoin: 'round',
}
const ROUTE_WALKING_PATH_STYLE = {
  color: '#65c8ad',
  weight: 6,
  opacity: 0.95,
  lineCap: 'round',
  lineJoin: 'round',
}
const SAVED_WALKING_PATH_STYLE = {
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

function DirectionsViewportController({
  active,
  routeReady,
  origin,
  routePositions,
  walkingPositions,
  markerPosition,
  placePosition,
}) {
  const map = useMap()
  const lastFittedPositionsRef = useRef(null)

  useEffect(() => {
    if (!active) {
      lastFittedPositionsRef.current = null
      return
    }
    if (!origin || !walkingPositions || !routeReady) return
    if (lastFittedPositionsRef.current === routePositions) return

    lastFittedPositionsRef.current = routePositions
    map.fitBounds([
      [origin.latitude, origin.longitude],
      ...(routePositions || []),
      ...walkingPositions,
      markerPosition,
      placePosition,
    ], {
      padding: [42, 42],
      maxZoom: 14,
      animate: false,
    })
  }, [active, map, markerPosition, origin, placePosition, routePositions, routeReady, walkingPositions])

  return null
}

function PlaceDirectionsLayer({
  active,
  phase,
  onPhaseChange,
  mode,
  position,
  origin,
  placeSlug,
  placeCoordinates,
  accessGeometry,
  showSavedPath = false,
  markerCoordinates,
  markerName,
  markerDescription,
  onStatusChange,
}) {
  const [activeRoute, setActiveRoute] = useState(null)
  const [routeAttemptComplete, setRouteAttemptComplete] = useState(false)
  const routeCacheRef = useRef(new Map())
  const requestControllersRef = useRef(new Map())
  const requestKeysRef = useRef(new Set())
  const statusCallbackRef = useRef(onStatusChange)
  const phaseCallbackRef = useRef(onPhaseChange)
  const currentProfileRequestKeyRef = useRef(null)
  const wasActiveRef = useRef(false)
  const markerRef = useRef(null)
  const popupCloseTimerRef = useRef(null)
  const popupPinnedRef = useRef(false)

  useEffect(() => {
    statusCallbackRef.current = onStatusChange
    phaseCallbackRef.current = onPhaseChange
  }, [onPhaseChange, onStatusChange])

  const walkingPositions = useMemo(() => accessGeometry ? toLeafletPositions(accessGeometry) : [], [accessGeometry])
  const markerPosition = [markerCoordinates.latitude, markerCoordinates.longitude]
  const placePosition = [placeCoordinates.lat, placeCoordinates.lng]
  const directionsMarkerIcon = useMemo(createDirectionsMarkerIcon, [])
  const popupMarkerName = markerName?.trim() || 'Walking path starts here'
  const popupMarkerDescription = markerDescription?.trim() || ''
  const originKey = origin ? `${origin.latitude},${origin.longitude}` : ''
  const requestKey = `${placeSlug}|${originKey}`
  const routeProfile = phase === 'driving' || phase === 'walking-to-marker' ? mode : null
  const profileRequestKey = routeProfile ? `${requestKey}|${routeProfile}` : null
  const activeRouteMatchesRequest = activeRoute?.key === requestKey && activeRoute?.profile === routeProfile
  currentProfileRequestKeyRef.current = active && routeProfile ? profileRequestKey : null

  useEffect(() => {
    if (!active) {
      if (wasActiveRef.current) {
        requestControllersRef.current.forEach((controller) => controller.abort())
        requestControllersRef.current.clear()
        requestKeysRef.current.clear()
        routeCacheRef.current.clear()
        setActiveRoute(null)
        setRouteAttemptComplete(false)
      }
      wasActiveRef.current = false
      return
    }
    wasActiveRef.current = true
  }, [active])

  useEffect(() => {
    if (!active || !origin || !routeProfile) return

    const cachedRoute = routeCacheRef.current.get(routeProfile)
    if (cachedRoute?.key === requestKey) {
      setActiveRoute(cachedRoute)
      setRouteAttemptComplete(true)
      statusCallbackRef.current({
        status: 'ready',
        distanceKm: cachedRoute.distanceKm,
        profile: cachedRoute.profile,
      })
      return
    }

    if (requestKeysRef.current.has(profileRequestKey)) return

    requestKeysRef.current.add(profileRequestKey)
    setRouteAttemptComplete(false)
    statusCallbackRef.current({ status: 'routing', profile: routeProfile })

    const controller = new AbortController()
    requestControllersRef.current.set(profileRequestKey, controller)
    getPlaceDirections(
      placeSlug,
      { lat: origin.latitude, lng: origin.longitude },
      routeProfile,
      controller.signal,
    ).then((result) => {
      if (controller.signal.aborted) return
      const route = {
        key: requestKey,
        profile: routeProfile,
        navigationPositions: toLeafletPositions(result.geometry),
        distanceKm: result.distance_km,
      }
      routeCacheRef.current.set(routeProfile, route)
      requestControllersRef.current.delete(profileRequestKey)
      if (currentProfileRequestKeyRef.current === profileRequestKey) {
        setActiveRoute(route)
        setRouteAttemptComplete(true)
        statusCallbackRef.current({
          status: 'ready',
          distanceKm: result.distance_km,
          profile: routeProfile,
        })
      }
    }).catch((error) => {
      if (controller.signal.aborted || error?.name === 'AbortError' || error?.code === 'ERR_CANCELED') return
      requestControllersRef.current.delete(profileRequestKey)
      requestKeysRef.current.delete(profileRequestKey)
      if (currentProfileRequestKeyRef.current === profileRequestKey) {
        setRouteAttemptComplete(true)
        statusCallbackRef.current({
          status: 'error',
          message: error instanceof Error
            ? error.message
            : 'Offward could not calculate directions. Please try again.',
        })
      }
    })
  }, [active, origin, phase, placeSlug, profileRequestKey, requestKey, routeProfile])

  useEffect(() => () => {
    requestControllersRef.current.forEach((controller) => controller.abort())
    requestControllersRef.current.clear()
    clearTimeout(popupCloseTimerRef.current)
  }, [])

  const clearPopupCloseTimer = () => {
    clearTimeout(popupCloseTimerRef.current)
    popupCloseTimerRef.current = null
  }
  const closePopupAfterHover = () => {
    clearPopupCloseTimer()
    popupCloseTimerRef.current = setTimeout(() => {
      if (!popupPinnedRef.current) markerRef.current?.closePopup()
    }, 160)
  }
  const openPopupOnHover = () => {
    clearPopupCloseTimer()
    markerRef.current?.openPopup()
  }
  const pinPopupOpen = () => {
    clearPopupCloseTimer()
    popupPinnedRef.current = true
  }
  const handlePopupClose = () => {
    clearPopupCloseTimer()
    popupPinnedRef.current = false
  }

  useEffect(() => {
    if (!active || (phase !== 'driving' && phase !== 'walking-to-marker') || !position) return
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

  const showRoute = routeProfile !== null
  const route = activeRoute?.key === requestKey ? activeRoute : null
  const routePositions = showRoute ? route?.navigationPositions || null : null
  const routeReady = !showRoute || activeRouteMatchesRequest || routeAttemptComplete

  return (
    <>
      <DirectionsPaneController />
      {(active || showSavedPath) && (
        <>
          <DirectionsViewportController
            active={active}
            routeReady={routeReady}
            origin={origin}
            routePositions={routePositions}
            walkingPositions={walkingPositions}
            markerPosition={markerPosition}
            placePosition={placePosition}
          />
          <Polyline
            positions={walkingPositions}
            pathOptions={SAVED_WALKING_PATH_STYLE}
            pane={NAVIGATION_PATH_PANE}
            interactive={false}
          />
          {routePositions && (
            <Polyline
              positions={routePositions}
              pathOptions={route.profile === 'driving' ? DRIVING_PATH_STYLE : ROUTE_WALKING_PATH_STYLE}
              pane={NAVIGATION_PATH_PANE}
              interactive={false}
            />
          )}
        </>
      )}
      <Marker
        ref={markerRef}
        position={markerPosition}
        icon={directionsMarkerIcon}
        title={popupMarkerName}
        alt={popupMarkerName}
        eventHandlers={{
          click: pinPopupOpen,
          mouseover: openPopupOnHover,
          mouseout: closePopupAfterHover,
          popupclose: handlePopupClose,
        }}
      >
        <Popup
          className="place-directions-popup"
          maxWidth={280}
          minWidth={160}
          autoPan
          keepInView
          autoPanPadding={[12, 12]}
        >
          <div
            className="place-directions-popup-content"
            onMouseEnter={clearPopupCloseTimer}
            onMouseLeave={closePopupAfterHover}
          >
            <strong>{popupMarkerName}</strong>
            {popupMarkerDescription && <p>{popupMarkerDescription}</p>}
          </div>
        </Popup>
      </Marker>
    </>
  )
}

export default PlaceDirectionsLayer
