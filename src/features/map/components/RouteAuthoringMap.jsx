import { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import { GeoJSON, MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import MapErrorBoundary from './MapErrorBoundary.jsx'
import { MAP_TILE_LAYER } from '../tileConfig.js'
import { getWaypointDisplayName, normalizeGeometry } from '../../routes/routeMap/routeMapUtils.js'
import '../map.css'

const WAYPOINT_MARKER_ZOOM = {
  lowMax: 7,
  highMin: 13,
}

function toLatLng(waypoint) {
  const lat = Number(waypoint.latitude)
  const lng = Number(waypoint.longitude)

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null
  }

  return [lat, lng]
}

function geometryBounds(geometry) {
  const normalized = normalizeGeometry(geometry)
  if (!normalized) {
    return []
  }

  return normalized.coordinates.map(([lng, lat]) => [lat, lng])
}

function getMapBounds({ waypoints, acceptedGeometry, candidateGeometry, segments }) {
  const points = [
    ...waypoints.map(toLatLng).filter(Boolean),
    ...geometryBounds(acceptedGeometry),
    ...geometryBounds(candidateGeometry),
    ...segments.flatMap((segment) => geometryBounds(segment.geometry)),
  ]

  if (points.length < 2) {
    return null
  }

  return points
}

function AuthoringViewport({ waypoints, acceptedGeometry, candidateGeometry, segments }) {
  const map = useMap()
  const signatureRef = useRef('')

  useEffect(() => {
    const signature = JSON.stringify({ waypoints, acceptedGeometry, candidateGeometry, segments })
    if (signatureRef.current === signature) {
      return
    }

    signatureRef.current = signature
    const bounds = getMapBounds({ waypoints, acceptedGeometry, candidateGeometry, segments })
    if (bounds) {
      map.fitBounds(bounds, { padding: [44, 44], maxZoom: 14, animate: false })
    }
  }, [acceptedGeometry, candidateGeometry, map, segments, waypoints])

  return null
}

function escapeMarkerText(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function createWaypointIcon({ order, displayName, selected }) {
  return L.divIcon({
    className: selected ? 'route-waypoint-marker route-authoring-waypoint-marker is-selected' : 'route-waypoint-marker route-authoring-waypoint-marker',
    html: `<span class="route-waypoint-number">${escapeMarkerText(order)}</span><span class="route-waypoint-label">${escapeMarkerText(displayName)}</span><span class="route-waypoint-media-slot" aria-hidden="true"></span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })
}

function getWaypointMarkerZoomClass(zoom) {
  if (zoom <= WAYPOINT_MARKER_ZOOM.lowMax) return 'route-marker-zoom-low'
  if (zoom >= WAYPOINT_MARKER_ZOOM.highMin) return 'route-marker-zoom-high'
  return 'route-marker-zoom-mid'
}

function applyWaypointMarkerZoomClass(map) {
  const container = map.getContainer()
  container.classList.remove('route-marker-zoom-low', 'route-marker-zoom-mid', 'route-marker-zoom-high')
  container.classList.add(getWaypointMarkerZoomClass(map.getZoom()))
}

function WaypointMarkerZoomController() {
  const map = useMapEvents({
    zoomend() {
      applyWaypointMarkerZoomClass(map)
    },
  })

  useEffect(() => {
    const container = map.getContainer()
    applyWaypointMarkerZoomClass(map)
    return () => container.classList.remove('route-marker-zoom-low', 'route-marker-zoom-mid', 'route-marker-zoom-high')
  }, [map])

  return null
}

function WaypointMarker({ waypoint, latLng, selected, onWaypointSelect }) {
  const displayName = getWaypointDisplayName(waypoint)
  const icon = useMemo(
    () => createWaypointIcon({ order: waypoint.order, displayName, selected }),
    [displayName, selected, waypoint.order],
  )

  return (
    <Marker
      position={latLng}
      icon={icon}
      title={`${waypoint.order} · ${displayName}`}
      eventHandlers={{ click: () => onWaypointSelect(waypoint.id) }}
    />
  )
}

function MapClickHandler({ addMode, onMapAddWaypoint }) {
  useMapEvents({
    click(event) {
      if (addMode) {
        onMapAddWaypoint({
          latitude: event.latlng.lat,
          longitude: event.latlng.lng,
        })
      }
    },
  })

  return null
}

const ACCEPTED_STYLE = {
  color: '#4F8A3C',
  weight: 7,
  opacity: 0.95,
  lineCap: 'round',
  lineJoin: 'round',
}

const CANDIDATE_STYLE = {
  color: '#D28A22',
  weight: 5,
  opacity: 0.9,
  dashArray: '10 8',
  lineCap: 'round',
  lineJoin: 'round',
}

const SEGMENT_STYLE = {
  color: '#c4b9a2',
  weight: 5,
  opacity: 0.45,
  lineCap: 'round',
  lineJoin: 'round',
}

const SELECTED_SEGMENT_STYLE = {
  color: '#D28A22',
  weight: 9,
  opacity: 0.95,
  lineCap: 'round',
  lineJoin: 'round',
}

function RouteAuthoringMapContent({ waypoints, acceptedGeometry, candidateGeometry, segments = [], selectedSegmentId, selectedWaypointId, addMode, onSegmentSelect, onWaypointSelect, onMapAddWaypoint }) {
  const validWaypoints = useMemo(() => waypoints.map((waypoint) => ({ waypoint, latLng: toLatLng(waypoint) })).filter((item) => item.latLng), [waypoints])
  const waypointLine = validWaypoints.map((item) => item.latLng)
  const accepted = normalizeGeometry(acceptedGeometry)
  const candidate = normalizeGeometry(candidateGeometry)

  return (
    <div className={addMode ? 'offward-map-container route-authoring-map is-add-mode' : 'offward-map-container route-authoring-map'} aria-label="Route waypoint authoring map">
      <MapContainer center={[50, 10]} zoom={4} scrollWheelZoom={true} className="offward-map-inner">
        <TileLayer attribution={MAP_TILE_LAYER.attribution} url={MAP_TILE_LAYER.url} />
        <WaypointMarkerZoomController />
        {accepted && <GeoJSON key={`accepted-${JSON.stringify(accepted.coordinates)}`} data={{ type: 'Feature', geometry: accepted, properties: {} }} style={ACCEPTED_STYLE} />}
        {candidate && <GeoJSON key={`candidate-${JSON.stringify(candidate.coordinates)}`} data={{ type: 'Feature', geometry: candidate, properties: {} }} style={CANDIDATE_STYLE} />}
        {segments.map((segment) => {
          const geometry = normalizeGeometry(segment.geometry)
          if (!geometry) return null
          const selected = segment.id === selectedSegmentId
          return (
            <GeoJSON
              key={`segment-${segment.id}-${JSON.stringify(geometry.coordinates)}`}
              data={{ type: 'Feature', geometry, properties: {} }}
              style={selected ? SELECTED_SEGMENT_STYLE : SEGMENT_STYLE}
              eventHandlers={{ click: () => onSegmentSelect?.(segment.id) }}
            />
          )
        })}
        {waypointLine.length > 1 && <Polyline positions={waypointLine} pathOptions={{ color: '#eee0bd', opacity: 0.35, weight: 2, dashArray: '4 7' }} />}
        {validWaypoints.map(({ waypoint, latLng }) => {
          const selected = waypoint.id === selectedWaypointId
          return (
            <WaypointMarker
              key={waypoint.id}
              waypoint={waypoint}
              latLng={latLng}
              selected={selected}
              onWaypointSelect={onWaypointSelect}
            />
          )
        })}
        <AuthoringViewport waypoints={waypoints} acceptedGeometry={accepted} candidateGeometry={candidate} segments={segments} />
        <MapClickHandler addMode={addMode} onMapAddWaypoint={onMapAddWaypoint} />
      </MapContainer>
    </div>
  )
}

function RouteAuthoringMap(props) {
  return (
    <MapErrorBoundary>
      <RouteAuthoringMapContent {...props} />
    </MapErrorBoundary>
  )
}

export default RouteAuthoringMap
