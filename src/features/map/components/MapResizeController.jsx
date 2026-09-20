import { useEffect } from 'react'
import { useMap } from 'react-leaflet'

// Keeps Leaflet's internal size in sync whenever its container is resized
// (e.g. toggling the Waypoints/Sections panels above the map), without
// touching the current viewport, center, or zoom.
function MapResizeController() {
  const map = useMap()

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') {
      return undefined
    }

    const container = map.getContainer()
    const observer = new ResizeObserver(() => {
      map.invalidateSize()
    })
    observer.observe(container)

    return () => observer.disconnect()
  }, [map])

  return null
}

export default MapResizeController
