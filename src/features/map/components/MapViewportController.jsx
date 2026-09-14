import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import { getCombinedBounds, getCombinedMapBounds, getWaypointBounds } from '../mapGeometry.js'

// Fits the viewport to Route/waypoint bounds on data change and focuses the
// selected Route, without resetting the viewport during normal interaction.
function MapViewportController({ validRoutes, validWaypoints, validPlaces, selectedRouteId, selectedPlaceId }) {
  const map = useMap()
  const prevRouteSignatureRef = useRef(null)
  const prevSelectedRouteIdRef = useRef(null)
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

    if (prevRouteSignatureRef.current !== contentSignature) {
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
  }, [map, validRoutes, validWaypoints, validPlaces])

  useEffect(() => {
    if (!selectedRouteId) {
      prevSelectedRouteIdRef.current = null
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
  }, [map, selectedRouteId, validRoutes])

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
