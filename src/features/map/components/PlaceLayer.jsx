import L from 'leaflet'
import { Marker } from 'react-leaflet'

function createPlaceIcon(selected) {
  const markerClass = ['public-place-marker', selected ? 'is-selected' : ''].filter(Boolean).join(' ')

  return L.divIcon({
    className: markerClass,
    html: '<span aria-hidden="true"></span>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

function PlaceLayer({ places, selectedPlaceId, onPlaceSelect }) {
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
      />
    )
  })
}

export default PlaceLayer