import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { GeoJSON, MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import MapErrorBoundary from '../../../features/map/components/MapErrorBoundary.jsx'
import { MAP_TILE_LAYER } from '../../../features/map/tileConfig.js'
import { normalizeGeometry } from '../../../features/routes/routeMap/routeMapUtils.js'
import '../../../features/map/map.css'

const PLACE_ICON = L.divIcon({
  className: 'management-place-picker-marker',
  html: '<span aria-hidden="true"></span>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
})

const ACCESS_START_ICON = L.divIcon({
  className: 'place-access-start-marker',
  html: '<span aria-hidden="true"></span>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
})

function MapClickHandler({ pickingStart, drawing, onStartClick, onDrawPoint }) {
  useMapEvents({
    click(event) {
      const point = {
        latitude: Number(event.latlng.lat.toFixed(6)),
        longitude: Number(event.latlng.lng.toFixed(6)),
      }
      if (pickingStart) onStartClick(point)
      else if (drawing) onDrawPoint({ lat: point.latitude, lng: point.longitude })
    },
  })
  return null
}

function AccessViewport({ place, start, geometry, candidate }) {
  const map = useMap()
  const previousSignature = useRef('')
  const normalizedGeometry = normalizeGeometry(geometry)
  const normalizedCandidate = normalizeGeometry(candidate)

  useEffect(() => {
    const signature = JSON.stringify({ place, start, normalizedGeometry, normalizedCandidate })
    if (signature === previousSignature.current) return
    previousSignature.current = signature

    const points = [
      place,
      start,
      ...(normalizedGeometry?.coordinates || []).map(([longitude, latitude]) => ({ latitude, longitude })),
      ...(normalizedCandidate?.coordinates || []).map(([longitude, latitude]) => ({ latitude, longitude })),
    ].filter(Boolean).map(({ latitude, longitude }) => [latitude, longitude])

    if (points.length > 1) {
      map.fitBounds(points, { padding: [40, 40], maxZoom: 15, animate: false })
    } else if (points.length === 1) {
      map.setView(points[0], 13, { animate: false })
    }
  }, [map, normalizedCandidate, normalizedGeometry, place, start])

  return null
}

function PlaceAccessAuthoringMapContent({
  place,
  start,
  acceptedGeometry,
  candidateGeometry,
  drawingPoints,
  pickingStart,
  drawing,
  onStartClick,
  onDrawPoint,
}) {
  const placePosition = [place.latitude, place.longitude]
  const startPosition = start ? [start.latitude, start.longitude] : null
  const accepted = normalizeGeometry(acceptedGeometry)
  const candidate = normalizeGeometry(candidateGeometry)
  const drawingPositions = drawing && startPosition
    ? [startPosition, ...drawingPoints.map(({ lat, lng }) => [lat, lng]), placePosition]
    : []
  const center = startPosition || placePosition
  const mapClassName = `offward-map-container place-access-authoring-map${pickingStart || drawing ? ' is-add-mode' : ''}`

  return (
    <div className={mapClassName} aria-label="Place access directions authoring map">
      <MapContainer center={center} zoom={13} scrollWheelZoom className="offward-map-inner">
        <TileLayer attribution={MAP_TILE_LAYER.attribution} url={MAP_TILE_LAYER.url} />
        {accepted && (
          <GeoJSON
            key={`accepted-access-${JSON.stringify(accepted.coordinates)}`}
            data={{ type: 'Feature', geometry: accepted, properties: {} }}
            style={{ color: '#4f8a3c', weight: 5, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }}
          />
        )}
        {candidate && (
          <GeoJSON
            key={`candidate-access-${JSON.stringify(candidate.coordinates)}`}
            data={{ type: 'Feature', geometry: candidate, properties: {} }}
            style={{ color: '#D28A22', weight: 5, opacity: 0.95, dashArray: '10 8', lineCap: 'round', lineJoin: 'round' }}
          />
        )}
        {drawingPositions.length > 1 && (
          <Polyline
            positions={drawingPositions}
            pathOptions={{ color: '#f0d39c', weight: 6, opacity: 1, dashArray: '10 7', lineCap: 'round', lineJoin: 'round' }}
            interactive={false}
          />
        )}
        <Marker position={placePosition} icon={PLACE_ICON} title={`Actual Place: ${place.name}`} alt={`Actual Place: ${place.name}`} />
        {startPosition && <Marker position={startPosition} icon={ACCESS_START_ICON} title="Driving destination" alt="Directions marker" />}
        <AccessViewport place={place} start={start} geometry={accepted} candidate={candidate} />
        <MapClickHandler
          pickingStart={pickingStart}
          drawing={drawing}
          onStartClick={onStartClick}
          onDrawPoint={onDrawPoint}
        />
      </MapContainer>
    </div>
  )
}

function PlaceAccessAuthoringMap(props) {
  const fallback = (
    <div className="offward-map-container place-access-authoring-map">
      <div className="offward-map-fallback">The access directions map is currently unavailable.</div>
    </div>
  )

  return (
    <MapErrorBoundary fallback={fallback}>
      <PlaceAccessAuthoringMapContent {...props} />
    </MapErrorBoundary>
  )
}

export default PlaceAccessAuthoringMap
