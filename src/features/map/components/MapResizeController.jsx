import { useEffect } from 'react'
import { useMap } from 'react-leaflet'

// Keeps Leaflet's internal size in sync whenever its container is resized
// (e.g. toggling the Waypoints/Sections panels above the map), without
// touching the current viewport, center, or zoom.
function MapResizeController({ fullscreenNavigation }) {
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

  useEffect(() => {
    if (fullscreenNavigation === undefined) return undefined

    let frame
    const resize = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => map.invalidateSize())
    }
    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('orientationchange', resize)
    document.addEventListener('fullscreenchange', resize)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      window.removeEventListener('orientationchange', resize)
      document.removeEventListener('fullscreenchange', resize)
    }
  }, [fullscreenNavigation, map])

  return null
}

export default MapResizeController
