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

function RouteUserLocationLayer({ position, heading = null, followEnabled, recenterRequest, centerRequest = 0, onManualMovement }) {
  const map = useMap()
  const markerRef = useRef(null)
  const followRef = useRef(followEnabled)
  const previousCenterRequestRef = useRef(centerRequest)
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
    const centerRequested = previousCenterRequestRef.current !== centerRequest
    previousCenterRequestRef.current = centerRequest
    if (position && (followEnabled || centerRequested)) {
      map.setView([position.latitude, position.longitude], map.getZoom(), { animate: false })
    }
  }, [centerRequest, followEnabled, map, position, recenterRequest])

  const hasHeading = typeof heading === 'number' && Number.isFinite(heading)
  const userLocationIcon = useMemo(() => L.divIcon({
    className: 'offward-user-location-icon',
    html: `<span class="offward-user-location-marker" style="display:flex;height:32px">${hasHeading
      ? '<span class="offward-user-location-arrow" style="display:inline-flex;width:28px;height:32px;align-items:center;justify-content:center;flex-shrink:0"><svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" focusable="false"><path d="M14 2 24 24 14 19 4 24Z" fill="#d8b47c" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg></span>'
      : '<span style="display:inline-flex;width:28px;height:32px;align-items:center;justify-content:center;flex-shrink:0"><span class="offward-user-location-dot"></span></span>'}<span class="offward-user-location-label">You are here</span></span>`,
    iconSize: [108, 32],
    iconAnchor: [14, 16],
  }), [hasHeading])

  useEffect(() => {
    const arrow = markerRef.current?.getElement()?.querySelector('.offward-user-location-arrow')
    if (arrow && hasHeading) arrow.style.transform = `rotate(${heading}deg)`
  }, [hasHeading, heading, position])

  const latitude = position?.latitude
  const longitude = position?.longitude
  const markerPosition = useMemo(() => [latitude, longitude], [latitude, longitude])

  if (!position) return null

  const accuracy = position.accuracy
  const hasAccuracy = typeof accuracy === 'number' && Number.isFinite(accuracy) && accuracy > 0

  return (
    <>
      {hasAccuracy && (
        <Circle center={markerPosition} radius={accuracy} pathOptions={ACCURACY_CIRCLE_STYLE} />
      )}
      <Marker
        ref={markerRef}
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
