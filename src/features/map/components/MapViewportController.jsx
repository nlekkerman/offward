import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import { getCombinedBounds, getWaypointBounds } from '../mapGeometry.js'

// Fits the viewport to Route/waypoint bounds on data change and focuses the
// selected Route, without resetting the viewport during normal interaction.
function MapViewportController({ validRoutes, validWaypoints, selectedRouteId }) {
  const map = useMap()
  const prevRouteSignatureRef = useRef(null)
  const prevSelectedRouteIdRef = useRef(null)

  useEffect(() => {
    const routeSignature = validRoutes
      .map((r) => {
        const id = r.id ?? r.slug
        const coords = r.geometry.coordinates
          .map(([lng, lat]) => `${lng},${lat}`)
          .join(';')
        return `${id}:${coords}`
      })
      .join('|')

    if (!routeSignature) {
      prevRouteSignatureRef.current = null
      const bounds = getWaypointBounds(validWaypoints)
      if (bounds) {
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 13,
          animate: false,
        })
      }
      return
    }

    if (prevRouteSignatureRef.current !== routeSignature) {
      prevRouteSignatureRef.current = routeSignature
      const bounds = getCombinedBounds(validRoutes)
      if (bounds) {
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 13,
          animate: false,
        })
      }
    }
  }, [map, validRoutes, validWaypoints])

  useEffect(() => {
    if (!selectedRouteId || prevSelectedRouteIdRef.current === selectedRouteId) {
      return
    }

    prevSelectedRouteIdRef.current = selectedRouteId
    const selectedRoute = validRoutes.find((route) => route.id === selectedRouteId)
    if (selectedRoute) {
      const bounds = getCombinedBounds([selectedRoute])
      if (bounds) {
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 14,
          animate: false,
        })
      }
    }
  }, [map, selectedRouteId, validRoutes])

  return null
}

export default MapViewportController
