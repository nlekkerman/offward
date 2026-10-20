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

function getMapBounds({ waypoints, candidateGeometry, previewGeometry, segments }) {
  const points = [
    ...waypoints.map(toLatLng).filter(Boolean),
    ...geometryBounds(candidateGeometry),
    ...geometryBounds(previewGeometry),
    ...segments.flatMap((segment) => geometryBounds(segment.geometry)),
  ]

  if (points.length < 2) {
    return null
  }

  return points
}

function AuthoringViewport({ waypoints, candidateGeometry, previewGeometry, segments }) {
  const map = useMap()
  const signatureRef = useRef('')

  useEffect(() => {
    const signature = JSON.stringify({ waypoints, candidateGeometry, previewGeometry, segments })
    if (signatureRef.current === signature) {
      return
    }

    signatureRef.current = signature
    const bounds = getMapBounds({ waypoints, candidateGeometry, previewGeometry, segments })
    if (bounds) {
      map.fitBounds(bounds, { padding: [44, 44], maxZoom: 14, animate: false })
    }
  }, [candidateGeometry, map, previewGeometry, segments, waypoints])

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

function WaypointMarker({ waypoint, places, latLng, selected, draggable, onWaypointSelect, onWaypointDragStart, onWaypointDragEnd }) {
  const map = useMap()
  const displayName = getMarkerDisplayName(waypoint, places)
  const icon = useMemo(
    () => createWaypointMarkerIcon({ order: waypoint.order, displayName, selected, extraClassNames: ['route-authoring-waypoint-marker'] }),
    [displayName, selected, waypoint.order],
  )

  return (
    <Marker
      position={latLng}
      icon={icon}
      draggable={draggable}
      bubblingMouseEvents={false}
      title={displayName ? `${waypoint.order} · ${displayName}` : String(waypoint.order)}
      eventHandlers={{
        click: (event) => {
          event.originalEvent?.stopPropagation()
          onWaypointSelect(waypoint.id)
        },
        dragstart: () => {
          map.dragging.disable()
          onWaypointDragStart?.(waypoint.id)
        },
        dragend: (event) => {
          map.dragging.enable()
          const { lat, lng } = event.target.getLatLng()
          onWaypointDragEnd?.(waypoint.id, { latitude: lat, longitude: lng })
        },
      }}
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

function selectConnectionFromMap(event, connectionId, onSegmentSelect) {
  event.originalEvent?.stopPropagation()
  onSegmentSelect?.(connectionId)
}

const CANDIDATE_STYLE = {
  color: '#D28A22',
  weight: 5,
  opacity: 0.9,
  dashArray: '10 8',
  lineCap: 'round',
  lineJoin: 'round',
}

const PREVIEW_STYLE = {
  color: '#2d9db2',
  weight: 5,
  opacity: 0.95,
  dashArray: '3 7',
  lineCap: 'round',
  lineJoin: 'round',
}

const SEGMENT_STYLE = {
  color: '#8e9a98',
  weight: 5,
  opacity: 0.75,
  dashArray: '5 7',
  lineCap: 'round',
  lineJoin: 'round',
}

const RESOLVED_STYLES = {
  calculated: { color: '#4f8a3c', weight: 5, opacity: 0.9 },
  manual: { color: '#2d9db2', weight: 5, opacity: 0.95, dashArray: '10 5' },
  straight: { color: '#c4b9a2', weight: 5, opacity: 0.9, dashArray: '3 6' },
}

const SELECTED_SEGMENT_STYLE = {
  color: '#ef342c',
  weight: 8,
  opacity: 1,
  lineCap: 'round',
  lineJoin: 'round',
}

function RouteAuthoringMapContent({ waypoints, places = [], candidateGeometry, previewGeometry, connections = [], selectedSegmentId, selectedWaypointId, addMode, manualDrawing, waypointMovePreview, canDragWaypoints, onSegmentSelect, onWaypointSelect, onMapAddWaypoint, onManualDrawPoint, onWaypointDragStart, onWaypointDragEnd }) {
  const validWaypoints = useMemo(() => waypoints.map((waypoint) => ({ waypoint, latLng: toLatLng(waypoint) })).filter((item) => item.latLng), [waypoints])
  const candidate = normalizeGeometry(candidateGeometry)
  const preview = normalizeGeometry(previewGeometry)
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
        {connections.map((connection) => {
          const segment = connection.segment
          const geometry = normalizeGeometry(segment.geometry)
          const selected = segment.id === selectedSegmentId || connection.key === selectedSegmentId
          const style = selected
            ? SELECTED_SEGMENT_STYLE
            : geometry
              ? (RESOLVED_STYLES[segment.mode] || RESOLVED_STYLES.calculated)
              : SEGMENT_STYLE
          const start = validWaypoints.find(({ waypoint }) => waypoint.id === connection.start_waypoint_id)?.latLng
          const end = validWaypoints.find(({ waypoint }) => waypoint.id === connection.end_waypoint_id)?.latLng
          if (!geometry && (!start || !end)) return null
          return (
            geometry
              ? <GeoJSON key={`segment-${segment.id}-${JSON.stringify(geometry.coordinates)}`} data={{ type: 'Feature', geometry, properties: {} }} style={style} bubblingMouseEvents={false} eventHandlers={{ click: (event) => selectConnectionFromMap(event, segment.id || connection.key, onSegmentSelect) }} />
              : <Polyline key={`unresolved-${connection.key}`} positions={[start, end]} pathOptions={style} bubblingMouseEvents={false} eventHandlers={{ click: (event) => selectConnectionFromMap(event, segment.id || connection.key, onSegmentSelect) }} />
          )
        })}
        {candidate && <GeoJSON key={`candidate-${JSON.stringify(candidate.coordinates)}`} data={{ type: 'Feature', geometry: candidate, properties: {} }} style={CANDIDATE_STYLE} />}
        {preview && <GeoJSON key={`connection-preview-${JSON.stringify(preview.coordinates)}`} data={{ type: 'Feature', geometry: preview, properties: {} }} style={PREVIEW_STYLE} />}
        {drawingManually && <Polyline positions={manualDrawingPositions} pathOptions={{ color: '#f0d39c', opacity: 1, weight: 6, dashArray: '10 7' }} interactive={false} />}
        {validWaypoints.map(({ waypoint, latLng }) => {
          const selected = waypoint.id === selectedWaypointId
          return (
            <WaypointMarker
              key={waypoint.id}
              waypoint={waypoint}
              places={places}
              latLng={waypointMovePreview?.id === waypoint.id ? [waypointMovePreview.latitude, waypointMovePreview.longitude] : latLng}
              selected={selected}
              draggable={canDragWaypoints && !addMode && !drawingManually}
              onWaypointSelect={onWaypointSelect}
              onWaypointDragStart={onWaypointDragStart}
              onWaypointDragEnd={onWaypointDragEnd}
            />
          )
        })}
        <AuthoringViewport waypoints={waypoints} candidateGeometry={candidate} previewGeometry={preview} segments={connections.map(({ segment }) => segment)} />
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
