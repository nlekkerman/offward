import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import MapErrorBoundary from './MapErrorBoundary.jsx'
import { MAP_TILE_LAYER } from '../tileConfig.js'
import { parseValidCoordinates } from '../mapGeometry.js'
import '../map.css'

function createManagementPlaceIcon() {
  return L.divIcon({
    className: 'management-place-picker-marker',
    html: '<span aria-hidden="true"></span>',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })
}

function PickerMapEvents({ onMapClick, disabled }) {
  useMapEvents({
    click(event) {
      if (disabled) return
      const lat = Number(event.latlng.lat.toFixed(6))
      const lng = Number(event.latlng.lng.toFixed(6))
      onMapClick({ latitude: lat, longitude: lng })
    },
  })
  return null
}

function PickerViewportController({ validCoords, isMapClickRef }) {
  const map = useMap()
  const prevCoordsRef = useRef(null)
  const isInitialRef = useRef(true)

  useEffect(() => {
    if (isMapClickRef.current) {
      isMapClickRef.current = false
      if (validCoords) {
        prevCoordsRef.current = `${validCoords[0]},${validCoords[1]}`
      }
      return
    }

    if (!validCoords) {
      prevCoordsRef.current = null
      return
    }

    const key = `${validCoords[0]},${validCoords[1]}`
    if (prevCoordsRef.current === key) {
      return
    }

    prevCoordsRef.current = key

    if (isInitialRef.current) {
      isInitialRef.current = false
      map.setView(validCoords, 11, { animate: false })
    } else {
      map.panTo(validCoords, { animate: true })
    }
  }, [map, validCoords, isMapClickRef])

  return null
}

function PlaceCoordinatePickerContent({ latitude, longitude, onChange, disabled = false }) {
  const isMapClickRef = useRef(false)
  const validCoords = parseValidCoordinates(latitude, longitude)
  const initialCenter = validCoords || [50.0, 10.0]
  const initialZoom = validCoords ? 11 : 4

  const handleMapClick = ({ latitude: nextLat, longitude: nextLng }) => {
    if (disabled) return
    isMapClickRef.current = true
    if (typeof onChange === 'function') {
      onChange({ latitude: nextLat, longitude: nextLng })
    }
  }

  return (
    <div className="form-field place-coordinate-picker-field">
      <label>Location map</label>
      <div className="offward-map-container place-coordinate-picker-container" aria-label="Place location picker map">
        <MapContainer
          center={initialCenter}
          zoom={initialZoom}
          scrollWheelZoom={true}
          className="offward-map-inner"
        >
          <TileLayer
            attribution={MAP_TILE_LAYER.attribution}
            url={MAP_TILE_LAYER.url}
          />
          {validCoords && (
            <Marker
              position={validCoords}
              icon={createManagementPlaceIcon()}
              title="Selected Place location"
              alt="Selected Place location"
            />
          )}
          <PickerMapEvents onMapClick={handleMapClick} disabled={disabled} />
          <PickerViewportController validCoords={validCoords} isMapClickRef={isMapClickRef} />
        </MapContainer>
      </div>
      <p className="place-coordinate-picker-help">
        Click the map to choose this Place’s location.
      </p>
    </div>
  )
}

function PlaceCoordinatePicker(props) {
  const fallback = (
    <div className="form-field place-coordinate-picker-field">
      <label>Location map</label>
      <div className="offward-map-container place-coordinate-picker-container">
        <div className="offward-map-fallback">
          Map coordinate picker is currently unavailable. You can still enter coordinates manually below.
        </div>
      </div>
      <p className="place-coordinate-picker-help">
        Click the map to choose this Place’s location.
      </p>
    </div>
  )

  return (
    <MapErrorBoundary fallback={fallback}>
      <PlaceCoordinatePickerContent {...props} />
    </MapErrorBoundary>
  )
}

export default PlaceCoordinatePicker
