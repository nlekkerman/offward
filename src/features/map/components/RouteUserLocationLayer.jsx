import { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import { Circle, Marker, useMap } from 'react-leaflet'

const ACCURACY_CIRCLE_STYLE = {
  color: '#d8b47c',
  weight: 1,
  opacity: 0.55,
  fillColor: '#d8b47c',
  fillOpacity: 0.12,
}

function RouteUserLocationLayer({ position, followEnabled, recenterRequest, onManualMovement }) {
  const map = useMap()
  const followRef = useRef(followEnabled)
  useEffect(() => {
    followRef.current = followEnabled
  }, [followEnabled])

  useEffect(() => {
    const container = map.getContainer()
    const handleDragStart = () => {
      if (followRef.current) onManualMovement()
    }
    const handleWheel = () => {
      if (followRef.current) onManualMovement()
    }
    const handlePointerDown = (event) => {
      if (followRef.current && event.target.closest('.leaflet-control-zoom')) {
        onManualMovement()
      }
    }
    const handleTouchMove = (event) => {
      if (followRef.current && event.touches?.length > 1) onManualMovement()
    }
    const handleKeyDown = (event) => {
      if (
        followRef.current &&
        ['+', '-', '=', '_', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)
      ) {
        onManualMovement()
      }
    }

    map.on('dragstart', handleDragStart)
    container.addEventListener('wheel', handleWheel, { capture: true, passive: true })
    container.addEventListener('pointerdown', handlePointerDown, true)
    container.addEventListener('touchmove', handleTouchMove, { capture: true, passive: true })
    container.addEventListener('keydown', handleKeyDown, true)
    return () => {
      map.off('dragstart', handleDragStart)
      container.removeEventListener('wheel', handleWheel, true)
      container.removeEventListener('pointerdown', handlePointerDown, true)
      container.removeEventListener('touchmove', handleTouchMove, true)
      container.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [map, onManualMovement])

  useEffect(() => {
    if (followEnabled && position) {
      map.setView([position.latitude, position.longitude], map.getZoom(), { animate: false })
    }
  }, [followEnabled, map, position, recenterRequest])

  const userLocationIcon = useMemo(() => L.divIcon({
    className: 'offward-user-location-icon',
    html: '<span class="offward-user-location-marker"><span class="offward-user-location-dot"></span><span class="offward-user-location-label">You are here</span></span>',
    iconSize: [108, 32],
    iconAnchor: [14, 16],
  }), [])

  if (!position) return null

  const accuracy = position.accuracy
  const hasAccuracy = typeof accuracy === 'number' && Number.isFinite(accuracy) && accuracy > 0
  const markerPosition = [position.latitude, position.longitude]

  return (
    <>
      {hasAccuracy && (
        <Circle center={markerPosition} radius={accuracy} pathOptions={ACCURACY_CIRCLE_STYLE} />
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

export default RouteUserLocationLayer
