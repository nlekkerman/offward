import { useState } from 'react'
import L from 'leaflet'
import { Marker, Tooltip, useMapEvents } from 'react-leaflet'

const PLACE_LABEL_MIN_ZOOM = 10

function createPlaceIcon(selected) {
  const markerClass = ['public-place-marker', selected ? 'is-selected' : ''].filter(Boolean).join(' ')

  return L.divIcon({
    className: markerClass,
    html: '<span aria-hidden="true"></span>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

function PlaceLayer({ places, selectedPlaceId, onPlaceSelect, showPlaceLabel = false }) {
  const map = useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
  })
  const [zoom, setZoom] = useState(() => map.getZoom())
  const labelVisible = showPlaceLabel && zoom >= PLACE_LABEL_MIN_ZOOM

  return places.map((place) => {
    const selected = place.id === selectedPlaceId
    return (
      <Marker
        key={place.id ?? place.slug}
        position={[place.latitude, place.longitude]}
        icon={createPlaceIcon(selected)}
        title={place.name}
        alt={place.name}
        eventHandlers={onPlaceSelect ? { click: () => onPlaceSelect(place.id) } : undefined}
      >
        {labelVisible && <Tooltip permanent direction="top" offset={[0, -12]} className="place-detail-marker-label">{place.name}</Tooltip>}
      </Marker>
    )
  })
}

export default PlaceLayer