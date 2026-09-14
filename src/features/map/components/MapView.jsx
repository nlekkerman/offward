import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import MapErrorBoundary from './MapErrorBoundary.jsx'
import { MAP_TILE_LAYER } from '../tileConfig.js'
import '../map.css'

function isValidCoordinate(pt) {
  if (!Array.isArray(pt) || pt.length < 2) {
    return false
  }
  const [lng, lat] = pt
  return (
    typeof lng === 'number' &&
    Number.isFinite(lng) &&
    lng >= -180 &&
    lng <= 180 &&
    typeof lat === 'number' &&
    Number.isFinite(lat) &&
    lat >= -90 &&
    lat <= 90
  )
}

function isRenderableRoute(route) {
  if (!route || typeof route !== 'object') {
    return false
  }
  const { geometry } = route
  if (!geometry || typeof geometry !== 'object') {
    return false
  }
  if (geometry.type !== 'LineString') {
    return false
  }
  if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length < 2) {
    return false
  }
  return geometry.coordinates.every(isValidCoordinate)
}

function getCombinedBounds(validRoutes) {
  let minLat = Infinity
  let maxLat = -Infinity
  let minLng = Infinity
  let maxLng = -Infinity
  let count = 0

  for (const route of validRoutes) {
    for (const [lng, lat] of route.geometry.coordinates) {
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
      if (lng < minLng) minLng = lng
      if (lng > maxLng) maxLng = lng
      count++
    }
  }

  if (count < 2 || !Number.isFinite(minLat) || !Number.isFinite(minLng)) {
    return null
  }

  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ]
}

function MapViewportController({ validRoutes, selectedRouteId }) {
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
  }, [map, validRoutes])

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

function normalizeCenter(center) {
  if (Array.isArray(center) && center.length >= 2) {
    const lat = Number(center[0])
    const lng = Number(center[1])
    if (!isNaN(lat) && !isNaN(lng)) {
      return [lat, lng]
    }
  }
  if (
    center &&
    typeof center === 'object' &&
    typeof center.lat === 'number' &&
    typeof center.lng === 'number'
  ) {
    return [center.lat, center.lng]
  }
  return [50.0, 10.0]
}

const ROUTE_LINE_STYLE = {
  color: '#c25e00',
  weight: 4,
  opacity: 0.85,
  lineCap: 'round',
  lineJoin: 'round',
}

const EXPLORE_ROUTE_STYLE = {
  color: '#756B5A',
  weight: 3,
  opacity: 0.65,
  lineCap: 'round',
  lineJoin: 'round',
}

const EXPLORE_SELECTED_ROUTE_STYLE = {
  color: '#4F8A3C',
  weight: 7,
  opacity: 0.95,
  lineCap: 'round',
  lineJoin: 'round',
}

function MapViewContent({
  className = '',
  initialCenter = [50.0, 10.0],
  initialZoom = 4,
  routes = [],
  selectedRouteId = null,
  onRouteSelect,
}) {
  const center = normalizeCenter(initialCenter)
  const zoom = typeof initialZoom === 'number' ? initialZoom : 4
  const containerClassName = `offward-map-container ${className}`.trim()

  const validRoutes = useMemo(() => {
    if (!Array.isArray(routes)) {
      return []
    }
    return routes.filter(isRenderableRoute)
  }, [routes])

  return (
    <div className={containerClassName}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="offward-map-inner"
      >
        <TileLayer
          attribution={MAP_TILE_LAYER.attribution}
          url={MAP_TILE_LAYER.url}
        />
        {validRoutes.map((route) => {
          const key = route.id ?? route.slug
          const geoJsonData = {
            type: 'Feature',
            geometry: route.geometry,
            properties: {
              id: route.id,
              slug: route.slug,
              title: route.title,
            },
          }
          return (
            <GeoJSON
              key={key}
              data={geoJsonData}
              style={onRouteSelect ? (route.id === selectedRouteId ? EXPLORE_SELECTED_ROUTE_STYLE : EXPLORE_ROUTE_STYLE) : ROUTE_LINE_STYLE}
              eventHandlers={onRouteSelect ? { click: () => onRouteSelect(route.id) } : undefined}
            />
          )
        })}
        {validRoutes.length > 0 && (
          <MapViewportController validRoutes={validRoutes} selectedRouteId={selectedRouteId} />
        )}
      </MapContainer>
    </div>
  )
}

function MapView(props) {
  return (
    <MapErrorBoundary>
      <MapViewContent {...props} />
    </MapErrorBoundary>
  )
}

export default MapView
