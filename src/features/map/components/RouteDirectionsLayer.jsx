import { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import { Circle, Marker, useMap } from 'react-leaflet'
import useUserLocation from '../../../shared/hooks/useUserLocation.js'

const ACCURACY_CIRCLE_STYLE = {
  color: '#d8b47c',
  weight: 1,
  opacity: 0.55,
  fillColor: '#d8b47c',
  fillOpacity: 0.12,
}

function DirectionsViewportController({ active, position, startCoordinates }) {
  const map = useMap()
  const hasFittedRef = useRef(false)

  useEffect(() => {
    if (!active) {
      hasFittedRef.current = false
      return
    }
    if (!position || !startCoordinates || hasFittedRef.current) return

    hasFittedRef.current = true
    map.fitBounds([
      [position.latitude, position.longitude],
      [startCoordinates.lat, startCoordinates.lng],
    ], {
      padding: [50, 50],
      maxZoom: 13,
      animate: false,
    })
  }, [active, map, position, startCoordinates])

  return null
}

function RouteDirectionsLayer({ active, startCoordinates, onPositionReady, onError }) {
  const { position, error, start, stop } = useUserLocation()
  const notifiedPositionRef = useRef(false)

  useEffect(() => {
    if (active) {
      start()
      return
    }
    stop()
    notifiedPositionRef.current = false
  }, [active, start, stop])

  useEffect(() => {
    if (error) onError(error)
  }, [error, onError])

  useEffect(() => {
    if (!active || !position || notifiedPositionRef.current) return
    notifiedPositionRef.current = true
    onPositionReady()
  }, [active, onPositionReady, position])

  const userLocationIcon = useMemo(() => L.divIcon({
    className: 'offward-user-location-icon',
    html: '<span class="offward-user-location-marker"><span class="offward-user-location-dot"></span><span class="offward-user-location-label">You are here</span></span>',
    iconSize: [108, 32],
    iconAnchor: [14, 16],
  }), [])

  if (!active || !position) {
    return <DirectionsViewportController active={active} position={null} startCoordinates={startCoordinates} />
  }

  const accuracy = position.accuracy
  const hasAccuracy = typeof accuracy === 'number' && Number.isFinite(accuracy) && accuracy > 0
  const markerPosition = [position.latitude, position.longitude]

  return (
    <>
      <DirectionsViewportController active={active} position={position} startCoordinates={startCoordinates} />
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
    </>
  )
}

export default RouteDirectionsLayer
