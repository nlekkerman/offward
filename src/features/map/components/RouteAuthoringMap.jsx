import { useEffect, useMemo, useRef } from 'react'
import { CircleMarker, GeoJSON, MapContainer, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import MapErrorBoundary from './MapErrorBoundary.jsx'
import { MAP_TILE_LAYER } from '../tileConfig.js'
import { normalizeGeometry } from '../../routes/routeMap/routeMapUtils.js'
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

function getMapBounds({ waypoints, acceptedGeometry, candidateGeometry }) {
  const points = [
    ...waypoints.map(toLatLng).filter(Boolean),
    ...geometryBounds(acceptedGeometry),
    ...geometryBounds(candidateGeometry),
  ]

  if (points.length < 2) {
    return null
  }

  return points
}

function AuthoringViewport({ waypoints, acceptedGeometry, candidateGeometry }) {
  const map = useMap()
  const signatureRef = useRef('')

  useEffect(() => {
    const signature = JSON.stringify({ waypoints, acceptedGeometry, candidateGeometry })
    if (signatureRef.current === signature) {
      return
    }

    signatureRef.current = signature
    const bounds = getMapBounds({ waypoints, acceptedGeometry, candidateGeometry })
    if (bounds) {
      map.fitBounds(bounds, { padding: [44, 44], maxZoom: 14, animate: false })
    }
  }, [acceptedGeometry, candidateGeometry, map, waypoints])

  return null
}

function MapClickHandler({ selectedWaypointId, onWaypointPositionChange }) {
  useMapEvents({
    click(event) {
      if (selectedWaypointId) {
        onWaypointPositionChange(selectedWaypointId, {
          latitude: event.latlng.lat,
          longitude: event.latlng.lng,
        })
      }
    },
  })

  return null
}

const ACCEPTED_STYLE = {
  color: '#d8b47c',
  weight: 5,
  opacity: 0.9,
  lineCap: 'round',
  lineJoin: 'round',
}

const CANDIDATE_STYLE = {
  color: '#c25e00',
  weight: 4,
  opacity: 0.75,
  dashArray: '8 8',
  lineCap: 'round',
  lineJoin: 'round',
}

function RouteAuthoringMapContent({ waypoints, acceptedGeometry, candidateGeometry, selectedWaypointId, onWaypointSelect, onWaypointPositionChange }) {
  const validWaypoints = useMemo(() => waypoints.map((waypoint) => ({ waypoint, latLng: toLatLng(waypoint) })).filter((item) => item.latLng), [waypoints])
  const waypointLine = validWaypoints.map((item) => item.latLng)
  const accepted = normalizeGeometry(acceptedGeometry)
  const candidate = normalizeGeometry(candidateGeometry)

  return (
    <div className="offward-map-container route-authoring-map">
      <MapContainer center={[50, 10]} zoom={4} scrollWheelZoom={true} className="offward-map-inner">
        <TileLayer attribution={MAP_TILE_LAYER.attribution} url={MAP_TILE_LAYER.url} />
        {accepted && <GeoJSON key={`accepted-${JSON.stringify(accepted.coordinates)}`} data={{ type: 'Feature', geometry: accepted, properties: {} }} style={ACCEPTED_STYLE} />}
        {candidate && <GeoJSON key={`candidate-${JSON.stringify(candidate.coordinates)}`} data={{ type: 'Feature', geometry: candidate, properties: {} }} style={CANDIDATE_STYLE} />}
        {waypointLine.length > 1 && <Polyline positions={waypointLine} pathOptions={{ color: '#eee0bd', opacity: 0.35, weight: 2, dashArray: '4 7' }} />}
        {validWaypoints.map(({ waypoint, latLng }) => {
          const selected = waypoint.id === selectedWaypointId
          return (
            <CircleMarker
              key={waypoint.id}
              center={latLng}
              radius={selected ? 9 : 7}
              pathOptions={{
                color: selected ? '#f2ead7' : '#d8b47c',
                fillColor: selected ? '#c25e00' : '#121310',
                fillOpacity: 0.95,
                weight: selected ? 3 : 2,
              }}
              eventHandlers={{ click: () => onWaypointSelect(waypoint.id) }}
            />
          )
        })}
        <AuthoringViewport waypoints={waypoints} acceptedGeometry={accepted} candidateGeometry={candidate} />
        <MapClickHandler selectedWaypointId={selectedWaypointId} onWaypointPositionChange={onWaypointPositionChange} />
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
