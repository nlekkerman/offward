import { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer, GeoJSON, Marker, useMap } from 'react-leaflet'
import MapErrorBoundary from './MapErrorBoundary.jsx'
import { MAP_TILE_LAYER } from '../tileConfig.js'
import { isRenderableRoute } from '../mapGeometry.js'
import '../map.css'

function isValidWaypoint(waypoint) {
  const lat = waypoint?.coordinates?.lat
  const lng = waypoint?.coordinates?.lng

  return (
    typeof waypoint?.id === 'string' &&
    waypoint.id.length > 0 &&
    typeof lat === 'number' &&
    Number.isFinite(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    typeof lng === 'number' &&
    Number.isFinite(lng) &&
    lng >= -180 &&
    lng <= 180
  )
}

function getWaypointType(waypoint, index, length) {
  if (waypoint.type === 'start' || index === 0) {
    return 'start'
  }
  if (waypoint.type === 'finish' || index === length - 1) {
    return 'finish'
  }
  if (waypoint.type === 'stop') {
    return 'stop'
  }
  return 'via'
}

function getValidWaypoints(waypoints) {
  if (!Array.isArray(waypoints)) {
    return []
  }

  const sortedWaypoints = waypoints
    .filter((waypoint) => waypoint && typeof waypoint === 'object')
    .sort((a, b) => Number(a.order) - Number(b.order))

  return sortedWaypoints
    .map((waypoint, index, array) => ({
      ...waypoint,
      order: Number.isFinite(Number(waypoint.order)) ? Number(waypoint.order) : index + 1,
      markerType: getWaypointType(waypoint, index, array.length),
    }))
    .filter(isValidWaypoint)
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

function getWaypointBounds(validWaypoints) {
  if (validWaypoints.length < 1) {
    return null
  }

  return validWaypoints.map((waypoint) => [waypoint.coordinates.lat, waypoint.coordinates.lng])
}

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

function createWaypointIcon(waypoint, selected) {
  const markerClass = [
    'route-waypoint-marker',
    'public-route-waypoint-marker',
    `is-${waypoint.markerType}`,
    selected ? 'is-selected' : '',
  ].filter(Boolean).join(' ')

  return L.divIcon({
    className: markerClass,
    html: `<span>${waypoint.order}</span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
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
  waypoints = [],
  selectedRouteId = null,
  selectedWaypointId = null,
  onRouteSelect,
  onWaypointSelect,
  routeLineStyle,
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
  const validWaypoints = useMemo(() => getValidWaypoints(waypoints), [waypoints])

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
              style={onRouteSelect ? (route.id === selectedRouteId ? EXPLORE_SELECTED_ROUTE_STYLE : EXPLORE_ROUTE_STYLE) : routeLineStyle || ROUTE_LINE_STYLE}
              eventHandlers={onRouteSelect ? { click: () => onRouteSelect(route.id) } : undefined}
            />
          )
        })}
        {validWaypoints.map((waypoint) => {
          const selected = waypoint.id === selectedWaypointId
          return (
            <Marker
              key={waypoint.id}
              position={[waypoint.coordinates.lat, waypoint.coordinates.lng]}
              icon={createWaypointIcon(waypoint, selected)}
              title={`Waypoint ${waypoint.order}`}
              eventHandlers={onWaypointSelect ? { click: () => onWaypointSelect(waypoint.id) } : undefined}
            />
          )
        })}
        {(validRoutes.length > 0 || validWaypoints.length > 0) && (
          <MapViewportController validRoutes={validRoutes} validWaypoints={validWaypoints} selectedRouteId={selectedRouteId} />
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
