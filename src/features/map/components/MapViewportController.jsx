import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import { getCombinedBounds, getCombinedMapBounds, getWaypointBounds } from '../mapGeometry.js'

// Fits the viewport to Route/waypoint bounds on data change and focuses the
// selected Route, without resetting the viewport during normal interaction.
function MapViewportController({ validRoutes, validSegments, validWaypoints, validPlaces, selectedRouteId, selectedSegmentId, selectedWaypointId, selectedPlaceId, routeFocusRequest, resetViewWhenRoutesEmpty, initialCenter, initialZoom }) {
  const map = useMap()
  const prevRouteSignatureRef = useRef(null)
  const prevSelectedRouteIdRef = useRef(null)
  const prevSelectedSegmentIdRef = useRef(null)
  const prevSelectedWaypointIdRef = useRef(null)
  const prevSelectedPlaceIdRef = useRef(null)

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

    const placeSignature = validPlaces
      .map((place) => `${place.id ?? place.slug}:${place.latitude},${place.longitude}`)
      .join('|')
    const contentSignature = `${routeSignature}|${placeSignature}`

    if (!routeSignature && !placeSignature) {
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

    if (prevRouteSignatureRef.current !== contentSignature && !selectedSegmentId) {
      prevRouteSignatureRef.current = contentSignature
      const bounds = getCombinedMapBounds(validRoutes, validPlaces)
      if (bounds) {
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 13,
          animate: false,
        })
      }
    }
  }, [map, selectedSegmentId, validRoutes, validWaypoints, validPlaces])

  useEffect(() => {
    if (!selectedSegmentId) {
      const hadSelectedSegment = prevSelectedSegmentIdRef.current
      prevSelectedSegmentIdRef.current = null
      if (hadSelectedSegment) {
        const bounds = getCombinedMapBounds(validRoutes, validPlaces) || getWaypointBounds(validWaypoints)
        if (bounds) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13, animate: false })
        }
      }
      return
    }

    if (prevSelectedSegmentIdRef.current === selectedSegmentId) {
      return
    }

    prevSelectedSegmentIdRef.current = selectedSegmentId
    const selectedSegment = validSegments.find((segment) => segment.id === selectedSegmentId)
    if (selectedSegment) {
      const bounds = getCombinedBounds([selectedSegment])
      if (bounds) {
        const compact = map.getSize().x < 700
        map.fitBounds(bounds, {
          paddingTopLeft: compact ? [24, 24] : [400, 40],
          paddingBottomRight: compact ? [24, 230] : [40, 80],
          maxZoom: 14,
          animate: false,
        })
      }
    }
  }, [map, selectedSegmentId, validSegments, validRoutes, validPlaces, validWaypoints])

  useEffect(() => {
    if (!selectedWaypointId) {
      prevSelectedWaypointIdRef.current = null
      return
    }

    if (prevSelectedWaypointIdRef.current === selectedWaypointId) return
    prevSelectedWaypointIdRef.current = selectedWaypointId
    const waypoint = validWaypoints.find((item) => item.id === selectedWaypointId)
    if (waypoint) {
      const compact = map.getSize().x < 700
      map.fitBounds([[waypoint.coordinates.lat, waypoint.coordinates.lng]], {
        paddingTopLeft: compact ? [24, 24] : [400, 40],
        paddingBottomRight: compact ? [24, 230] : [40, 80],
        maxZoom: 14,
        animate: false,
      })
    }
  }, [map, selectedWaypointId, validWaypoints])

  useEffect(() => {
    if (!selectedRouteId) {
      const hadSelectedRoute = prevSelectedRouteIdRef.current
      prevSelectedRouteIdRef.current = null
      if (hadSelectedRoute && resetViewWhenRoutesEmpty && validRoutes.length === 0) {
        map.setView(initialCenter, initialZoom, { animate: false })
      }
      return
    }

    if (prevSelectedRouteIdRef.current === selectedRouteId) {
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
  }, [map, selectedRouteId, validRoutes, resetViewWhenRoutesEmpty, initialCenter, initialZoom])

  useEffect(() => {
    if (!routeFocusRequest) return
    const bounds = getCombinedMapBounds(validRoutes, validPlaces) || getWaypointBounds(validWaypoints)
    if (bounds) map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13, animate: false })
  }, [map, routeFocusRequest, validPlaces, validRoutes, validWaypoints])

  useEffect(() => {
    if (!selectedPlaceId) {
      prevSelectedPlaceIdRef.current = null
      return
    }

    if (prevSelectedPlaceIdRef.current === selectedPlaceId) {
      return
    }

    prevSelectedPlaceIdRef.current = selectedPlaceId
    const selectedPlace = validPlaces.find((place) => place.id === selectedPlaceId)
    if (selectedPlace) {
      map.setView([selectedPlace.latitude, selectedPlace.longitude], Math.min(Math.max(map.getZoom(), 4), 11), { animate: false })
    }
  }, [map, selectedPlaceId, validPlaces])

  return null
}

export default MapViewportController
