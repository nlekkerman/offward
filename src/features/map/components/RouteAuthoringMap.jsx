import { useEffect, useMemo, useRef } from 'react'
import { GeoJSON, MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import MapErrorBoundary from './MapErrorBoundary.jsx'
import { MAP_TILE_LAYER } from '../tileConfig.js'
import { normalizeGeometry } from '../../routes/routeMap/routeMapUtils.js'
import { createWaypointMarkerIcon, WaypointMarkerZoomController } from '../waypointMarkerIcon.js'
import '../map.css'

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

function getMarkerDisplayName(waypoint, places) {
  const label = typeof waypoint?.label === 'string' ? waypoint.label.trim() : ''
  if (label) return label

  const name = typeof waypoint?.name === 'string' ? waypoint.name.trim() : ''
  if (name) return name

  const linkedPlace = places.find((place) => String(place.id) === String(waypoint?.place_id))
  const placeName = linkedPlace?.name || linkedPlace?.title || waypoint?.place_name
  return typeof placeName === 'string' ? placeName.trim() : ''
}

function WaypointMarker({ waypoint, places, latLng, selected, onWaypointSelect }) {
  const displayName = getMarkerDisplayName(waypoint, places)
  const icon = useMemo(
    () => createWaypointMarkerIcon({ order: waypoint.order, displayName, selected, extraClassNames: ['route-authoring-waypoint-marker'] }),
    [displayName, selected, waypoint.order],
  )

  return (
    <Marker
      position={latLng}
      icon={icon}
      title={displayName ? `${waypoint.order} · ${displayName}` : String(waypoint.order)}
      eventHandlers={{ click: () => onWaypointSelect(waypoint.id) }}
    />
  )
}

function MapClickHandler({ addMode, drawingManually, onMapAddWaypoint, onManualDrawPoint }) {
  useMapEvents({
    click(event) {
      if (drawingManually) {
        onManualDrawPoint({
          lat: event.latlng.lat,
          lng: event.latlng.lng,
        })
      } else if (addMode) {
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

function RouteAuthoringMapContent({ waypoints, places = [], acceptedGeometry, candidateGeometry, segments = [], selectedSegmentId, selectedWaypointId, addMode, manualDrawing, onSegmentSelect, onWaypointSelect, onMapAddWaypoint, onManualDrawPoint }) {
  const validWaypoints = useMemo(() => waypoints.map((waypoint) => ({ waypoint, latLng: toLatLng(waypoint) })).filter((item) => item.latLng), [waypoints])
  const waypointLine = validWaypoints.map((item) => item.latLng)
  const accepted = normalizeGeometry(acceptedGeometry)
  const candidate = normalizeGeometry(candidateGeometry)
  const manualPoints = Array.isArray(manualDrawing?.points) ? manualDrawing.points : []
  const manualDrawingPositions = manualDrawing
    ? [toLatLng(manualDrawing.startWaypoint), ...manualPoints.map((point) => [point.lat, point.lng]), toLatLng(manualDrawing.endWaypoint)].filter(Boolean)
    : []
  const drawingManually = manualDrawingPositions.length >= 2

  return (
    <div className={addMode || drawingManually ? 'offward-map-container route-authoring-map is-add-mode' : 'offward-map-container route-authoring-map'} aria-label="Route waypoint authoring map">
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
        {drawingManually && <Polyline positions={manualDrawingPositions} pathOptions={{ color: '#f0d39c', opacity: 1, weight: 6, dashArray: '10 7' }} interactive={false} />}
        {validWaypoints.map(({ waypoint, latLng }) => {
          const selected = waypoint.id === selectedWaypointId
          return (
            <WaypointMarker
              key={waypoint.id}
              waypoint={waypoint}
              places={places}
              latLng={latLng}
              selected={selected}
              onWaypointSelect={onWaypointSelect}
            />
          )
        })}
        <AuthoringViewport waypoints={waypoints} acceptedGeometry={accepted} candidateGeometry={candidate} segments={segments} />
        <MapClickHandler addMode={addMode} drawingManually={drawingManually} onMapAddWaypoint={onMapAddWaypoint} onManualDrawPoint={onManualDrawPoint} />
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
